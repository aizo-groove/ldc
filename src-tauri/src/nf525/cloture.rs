/// Clôture Z (NF525 §4).
///
/// La clôture est un acte fiscal irréversible : elle fige les totaux de la session,
/// les chaîne par hash à la clôture précédente et met à jour les grands totaux
/// perpétuels. Tout est écrit dans une seule transaction SQL : soit la clôture
/// est complète, soit rien n'est écrit.
use crate::db::models::session::{Cloture, GrandTotal};
use crate::nf525::chain::{hash_cloture, verify_cloture_chain, ClotureHashFields};
use crate::nf525::grand_total::{compute_grand_totals, SessionTotals};
use sqlx::{SqliteConnection, SqlitePool};

/// Totaux d'un ensemble de transactions (centimes).
///
/// - `ventes`, `avoirs`, `annulations` : somme des `total_ttc` par type.
/// - TVA et bases HT : nettes (ventes moins avoirs et annulations).
/// - Paiements : encaissements des ventes uniquement.
#[derive(Debug, Default, sqlx::FromRow)]
pub struct Totaux {
    pub ventes: i64,
    pub avoirs: i64,
    pub annulations: i64,
    pub nb: i64,
    pub pay_especes: i64,
    pub pay_cb: i64,
    pub pay_cheque: i64,
    pub pay_autre: i64,
    pub tva_2000: i64,
    pub tva_1000: i64,
    pub tva_550: i64,
    pub tva_210: i64,
    pub tva_0: i64,
    pub ht_2000: i64,
    pub ht_1000: i64,
    pub ht_550: i64,
    pub ht_210: i64,
    pub ht_0: i64,
}

impl Totaux {
    pub fn net(&self) -> i64 {
        self.ventes - self.avoirs - self.annulations
    }

    /// Totaux au format attendu par le calcul des grands totaux.
    /// Les annulations sont comptées avec les avoirs, pour que `gt_net` reste
    /// la somme des nets de chaque clôture.
    fn for_grand_totals(&self) -> SessionTotals {
        SessionTotals {
            ventes_ttc: self.ventes,
            avoirs_ttc: self.avoirs + self.annulations,
            tva_2000: self.tva_2000,
            tva_1000: self.tva_1000,
            tva_550: self.tva_550,
            tva_210: self.tva_210,
            tva_0: self.tva_0,
        }
    }
}

/// Périmètre des transactions à totaliser.
enum Scope<'a> {
    /// Les transactions d'une session.
    Session(&'a str),
    /// Toutes les transactions hors de cette session (reprise d'historique).
    AllExcept(&'a str),
}

impl Scope<'_> {
    fn split(&self) -> (&'static str, &str) {
        match self {
            Scope::Session(id) => ("t.session_id = ?", id),
            Scope::AllExcept(id) => ("t.session_id != ?", id),
        }
    }
}

async fn compute_totaux(conn: &mut SqliteConnection, scope: Scope<'_>) -> Result<Totaux, String> {
    let (filter, id) = scope.split();
    let sql = format!(
        r#"SELECT
            (SELECT CAST(COALESCE(SUM(CASE WHEN t.type = 'VENTE'      THEN t.total_ttc ELSE 0 END), 0) AS INTEGER) FROM transactions t WHERE {f}) AS ventes,
            (SELECT CAST(COALESCE(SUM(CASE WHEN t.type = 'AVOIR'      THEN t.total_ttc ELSE 0 END), 0) AS INTEGER) FROM transactions t WHERE {f}) AS avoirs,
            (SELECT CAST(COALESCE(SUM(CASE WHEN t.type = 'ANNULATION' THEN t.total_ttc ELSE 0 END), 0) AS INTEGER) FROM transactions t WHERE {f}) AS annulations,
            (SELECT CAST(COUNT(*) AS INTEGER) FROM transactions t WHERE {f}) AS nb,
            (SELECT CAST(COALESCE(SUM(CASE WHEN p.method = 'ESPECES' THEN p.amount ELSE 0 END), 0) AS INTEGER)
               FROM payments p JOIN transactions t ON t.id = p.transaction_id WHERE {f} AND t.type = 'VENTE') AS pay_especes,
            (SELECT CAST(COALESCE(SUM(CASE WHEN p.method = 'CB'      THEN p.amount ELSE 0 END), 0) AS INTEGER)
               FROM payments p JOIN transactions t ON t.id = p.transaction_id WHERE {f} AND t.type = 'VENTE') AS pay_cb,
            (SELECT CAST(COALESCE(SUM(CASE WHEN p.method = 'CHEQUE'  THEN p.amount ELSE 0 END), 0) AS INTEGER)
               FROM payments p JOIN transactions t ON t.id = p.transaction_id WHERE {f} AND t.type = 'VENTE') AS pay_cheque,
            (SELECT CAST(COALESCE(SUM(CASE WHEN p.method NOT IN ('ESPECES','CB','CHEQUE') THEN p.amount ELSE 0 END), 0) AS INTEGER)
               FROM payments p JOIN transactions t ON t.id = p.transaction_id WHERE {f} AND t.type = 'VENTE') AS pay_autre,
            {tva}
        "#,
        f = filter,
        tva = tva_columns(filter),
    );

    let mut query = sqlx::query_as::<_, Totaux>(&sql);
    // Un bind par occurrence de `?` : 4 (transactions) + 4 (paiements) + 10 (TVA/HT)
    for _ in 0..18 {
        query = query.bind(id);
    }
    query.fetch_one(conn).await.map_err(|e| e.to_string())
}

/// Colonnes TVA et HT par taux, nettes des avoirs et annulations.
fn tva_columns(filter: &str) -> String {
    let mut cols = Vec::new();
    for (field, col) in [("tva", "line_total_tva"), ("ht", "line_total_ht")] {
        for rate in [2000, 1000, 550, 210, 0] {
            cols.push(format!(
                "(SELECT CAST(COALESCE(SUM(CASE WHEN t.type = 'VENTE' THEN tl.{col} ELSE -tl.{col} END), 0) AS INTEGER)
                   FROM transaction_lines tl JOIN transactions t ON t.id = tl.transaction_id
                   WHERE {filter} AND tl.tva_rate_pct = {rate}) AS {field}_{rate}"
            ));
        }
    }
    cols.join(",\n")
}

/// Totaux d'une session (rapport X et clôture Z).
pub async fn session_totaux(pool: &SqlitePool, session_id: &str) -> Result<Totaux, String> {
    let mut conn = pool.acquire().await.map_err(|e| e.to_string())?;
    compute_totaux(&mut conn, Scope::Session(session_id)).await
}

/// Effectue la clôture Z d'une session ouverte.
pub async fn cloturer_session(pool: &SqlitePool, session_id: &str) -> Result<Cloture, String> {
    let err = |e: sqlx::Error| e.to_string();
    let mut tx = pool.begin().await.map_err(err)?;
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();

    // Fermer la session en premier : prend le verrou d'écriture SQLite et
    // empêche une double clôture.
    let closed = sqlx::query(
        "UPDATE sessions SET status = 'CLOSED', closed_at = ? WHERE id = ? AND status = 'OPEN'",
    )
    .bind(&now)
    .bind(session_id)
    .execute(&mut *tx)
    .await
    .map_err(err)?;
    if closed.rows_affected() != 1 {
        return Err("Session introuvable ou déjà clôturée".to_string());
    }

    let totaux = compute_totaux(&mut tx, Scope::Session(session_id)).await?;

    let previous: Option<(i64, String)> =
        sqlx::query_as("SELECT sequence_no, hash FROM clotures ORDER BY sequence_no DESC LIMIT 1")
            .fetch_optional(&mut *tx)
            .await
            .map_err(err)?;
    let sequence_no = previous.as_ref().map(|(s, _)| s + 1).unwrap_or(1);
    let previous_hash = previous.map(|(_, h)| h);

    let previous_gt = sqlx::query_as::<_, GrandTotal>(
        "SELECT g.* FROM grand_totals g JOIN clotures c ON c.id = g.cloture_id
         ORDER BY c.sequence_no DESC LIMIT 1",
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(err)?;

    // Première clôture : les grands totaux reprennent tout l'historique, y compris
    // les sessions fermées avant que la clôture Z n'existe.
    let previous_gt = match previous_gt {
        Some(gt) => gt,
        None => {
            let historique = compute_totaux(&mut tx, Scope::AllExcept(session_id)).await?;
            compute_grand_totals(None, &historique.for_grand_totals(), "")
        }
    };

    let cloture_id = uuid::Uuid::new_v4().to_string();
    let gt = compute_grand_totals(Some(&previous_gt), &totaux.for_grand_totals(), &cloture_id);

    let fields = ClotureHashFields {
        sequence_no,
        session_id: session_id.to_string(),
        total_ventes_ttc: totaux.ventes,
        total_avoirs_ttc: totaux.avoirs,
        total_annulations_ttc: totaux.annulations,
        net_ttc: totaux.net(),
        tva_2000: totaux.tva_2000,
        tva_1000: totaux.tva_1000,
        tva_550: totaux.tva_550,
        tva_210: totaux.tva_210,
        tva_0: totaux.tva_0,
        pay_especes: totaux.pay_especes,
        pay_cb: totaux.pay_cb,
        pay_cheque: totaux.pay_cheque,
        pay_autre: totaux.pay_autre,
        gt_ventes_ttc: gt.gt_ventes_ttc,
        gt_avoirs_ttc: gt.gt_avoirs_ttc,
        gt_net_ttc: gt.gt_net_ttc,
        created_at: now.clone(),
    };
    let hash = hash_cloture(&fields, previous_hash.as_deref().unwrap_or("GENESIS"));

    sqlx::query(
        r#"INSERT INTO clotures
           (id, session_id, sequence_no,
            total_ventes_ttc, total_avoirs_ttc, total_annulations_ttc, net_ttc,
            tva_2000, tva_1000, tva_550, tva_210, tva_0,
            pay_especes, pay_cb, pay_cheque, pay_autre,
            previous_hash, hash, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&cloture_id)
    .bind(session_id)
    .bind(sequence_no)
    .bind(fields.total_ventes_ttc)
    .bind(fields.total_avoirs_ttc)
    .bind(fields.total_annulations_ttc)
    .bind(fields.net_ttc)
    .bind(fields.tva_2000)
    .bind(fields.tva_1000)
    .bind(fields.tva_550)
    .bind(fields.tva_210)
    .bind(fields.tva_0)
    .bind(fields.pay_especes)
    .bind(fields.pay_cb)
    .bind(fields.pay_cheque)
    .bind(fields.pay_autre)
    .bind(&previous_hash)
    .bind(&hash)
    .bind(&now)
    .execute(&mut *tx)
    .await
    .map_err(err)?;

    sqlx::query(
        r#"INSERT INTO grand_totals
           (id, cloture_id, gt_ventes_ttc, gt_avoirs_ttc, gt_net_ttc,
            gt_tva_2000, gt_tva_1000, gt_tva_550, gt_tva_210, gt_tva_0, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&gt.id)
    .bind(&cloture_id)
    .bind(gt.gt_ventes_ttc)
    .bind(gt.gt_avoirs_ttc)
    .bind(gt.gt_net_ttc)
    .bind(gt.gt_tva_2000)
    .bind(gt.gt_tva_1000)
    .bind(gt.gt_tva_550)
    .bind(gt.gt_tva_210)
    .bind(gt.gt_tva_0)
    .bind(&now)
    .execute(&mut *tx)
    .await
    .map_err(err)?;

    sqlx::query("UPDATE sessions SET cloture_id = ? WHERE id = ?")
        .bind(&cloture_id)
        .bind(session_id)
        .execute(&mut *tx)
        .await
        .map_err(err)?;

    sqlx::query(
        r#"INSERT INTO journal_entries (sequence_no, event_type, entity_type, entity_id, payload)
           VALUES (
               (SELECT COALESCE(MAX(sequence_no), 0) + 1 FROM journal_entries),
               'CLOTURE_Z', 'cloture', ?,
               json_object('session_id', ?, 'sequence_no', ?, 'net_ttc', ?, 'hash', ?)
           )"#,
    )
    .bind(&cloture_id)
    .bind(session_id)
    .bind(sequence_no)
    .bind(fields.net_ttc)
    .bind(&hash)
    .execute(&mut *tx)
    .await
    .map_err(err)?;

    sqlx::query(
        r#"INSERT INTO journal_entries (sequence_no, event_type, entity_type, entity_id, payload)
           VALUES (
               (SELECT COALESCE(MAX(sequence_no), 0) + 1 FROM journal_entries),
               'SESSION_CLOSE', 'session', ?, json_object('session_id', ?, 'cloture_id', ?)
           )"#,
    )
    .bind(session_id)
    .bind(session_id)
    .bind(&cloture_id)
    .execute(&mut *tx)
    .await
    .map_err(err)?;

    let cloture = sqlx::query_as::<_, Cloture>("SELECT * FROM clotures WHERE id = ?")
        .bind(&cloture_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(err)?;

    tx.commit().await.map_err(err)?;
    Ok(cloture)
}

/// Relit les clôtures et leurs grands totaux, et vérifie la chaîne de hash.
/// `Ok(Err(sequence_no))` désigne la première clôture dont le maillon est brisé.
pub async fn verify_clotures(pool: &SqlitePool) -> Result<Result<usize, i64>, String> {
    let clotures = sqlx::query_as::<_, Cloture>("SELECT * FROM clotures ORDER BY sequence_no")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;
    let mut chain = Vec::new();
    for c in clotures {
        let gt = sqlx::query_as::<_, GrandTotal>("SELECT * FROM grand_totals WHERE cloture_id = ?")
            .bind(&c.id)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?;
        let fields = ClotureHashFields {
            sequence_no: c.sequence_no,
            session_id: c.session_id,
            total_ventes_ttc: c.total_ventes_ttc,
            total_avoirs_ttc: c.total_avoirs_ttc,
            total_annulations_ttc: c.total_annulations_ttc,
            net_ttc: c.net_ttc,
            tva_2000: c.tva_2000,
            tva_1000: c.tva_1000,
            tva_550: c.tva_550,
            tva_210: c.tva_210,
            tva_0: c.tva_0,
            pay_especes: c.pay_especes,
            pay_cb: c.pay_cb,
            pay_cheque: c.pay_cheque,
            pay_autre: c.pay_autre,
            gt_ventes_ttc: gt.gt_ventes_ttc,
            gt_avoirs_ttc: gt.gt_avoirs_ttc,
            gt_net_ttc: gt.gt_net_ttc,
            created_at: c.created_at,
        };
        chain.push((fields, c.previous_hash, c.hash));
    }
    Ok(verify_cloture_chain(&chain))
}

// ============================================================
// Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::nf525::chain::{hash_transaction, verify_chain};
    use sqlx::sqlite::SqlitePoolOptions;

    async fn test_pool() -> SqlitePool {
        // Une seule connexion : chaque connexion `:memory:` a sa propre base.
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!("src/db/migrations")
            .run(&pool)
            .await
            .unwrap();
        pool
    }

    async fn open_session(pool: &SqlitePool, id: &str) {
        sqlx::query("INSERT INTO sessions (id) VALUES (?)")
            .bind(id)
            .execute(pool)
            .await
            .unwrap();
    }

    /// Insère une transaction chaînée avec une ligne (TVA 10 %) et un paiement CB.
    async fn add_transaction(pool: &SqlitePool, session_id: &str, tx_type: &str, ttc: i64) {
        let (seq, prev): (i64, Option<String>) = sqlx::query_as(
            "SELECT COALESCE(MAX(sequence_no), 0) + 1,
                    (SELECT hash FROM transactions ORDER BY sequence_no DESC LIMIT 1)
             FROM transactions",
        )
        .fetch_one(pool)
        .await
        .unwrap();
        let created_at = format!("2025-01-01T10:00:{:02}.000Z", seq);
        let hash = hash_transaction(
            seq,
            tx_type,
            ttc,
            &created_at,
            prev.as_deref().unwrap_or("GENESIS"),
        );
        let ht = ttc * 100 / 110;
        let id = format!("tx-{}", seq);

        sqlx::query(
            "INSERT INTO transactions (id, session_id, sequence_no, type, total_ht, total_tva, total_ttc,
                                       previous_hash, hash, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(session_id)
        .bind(seq)
        .bind(tx_type)
        .bind(ht)
        .bind(ttc - ht)
        .bind(ttc)
        .bind(&prev)
        .bind(&hash)
        .bind(&created_at)
        .execute(pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO transaction_lines (transaction_id, line_no, product_name, quantity,
                 unit_price_ttc, unit_price_ht, tva_rate_pct, line_total_ht, line_total_tva, line_total_ttc)
             VALUES (?, 1, 'Article', 1, ?, ?, 1000, ?, ?, ?)",
        )
        .bind(&id)
        .bind(ttc)
        .bind(ht)
        .bind(ht)
        .bind(ttc - ht)
        .bind(ttc)
        .execute(pool)
        .await
        .unwrap();

        sqlx::query("INSERT INTO payments (transaction_id, method, amount) VALUES (?, 'CB', ?)")
            .bind(&id)
            .bind(ttc)
            .execute(pool)
            .await
            .unwrap();
    }

    async fn transaction_chain(pool: &SqlitePool) -> Result<usize, i64> {
        let rows: Vec<(i64, String, i64, String, Option<String>, String)> = sqlx::query_as(
            "SELECT sequence_no, type, total_ttc, created_at, previous_hash, hash
             FROM transactions ORDER BY sequence_no",
        )
        .fetch_all(pool)
        .await
        .unwrap();
        verify_chain(&rows)
    }

    async fn cloture_chain(pool: &SqlitePool) -> Result<usize, i64> {
        verify_clotures(pool).await.unwrap()
    }

    #[tokio::test]
    async fn cloture_z_complete() {
        let pool = test_pool().await;

        // Session fermée avant l'existence de la clôture Z : reprise dans les grands totaux.
        open_session(&pool, "s0").await;
        add_transaction(&pool, "s0", "VENTE", 2200).await;
        sqlx::query("UPDATE sessions SET status = 'CLOSED' WHERE id = 's0'")
            .execute(&pool)
            .await
            .unwrap();

        open_session(&pool, "s1").await;
        add_transaction(&pool, "s1", "VENTE", 1100).await;
        add_transaction(&pool, "s1", "VENTE", 550).await;
        add_transaction(&pool, "s1", "AVOIR", 110).await;

        let z1 = cloturer_session(&pool, "s1").await.unwrap();
        assert_eq!(z1.sequence_no, 1);
        assert_eq!(z1.previous_hash, None);
        assert_eq!(z1.total_ventes_ttc, 1650);
        assert_eq!(z1.total_avoirs_ttc, 110);
        assert_eq!(z1.net_ttc, 1540);
        assert_eq!(z1.pay_cb, 1650);
        assert_eq!(z1.tva_1000, (1100 - 1000) + (550 - 500) - (110 - 100));

        let gt1 =
            sqlx::query_as::<_, GrandTotal>("SELECT * FROM grand_totals WHERE cloture_id = ?")
                .bind(&z1.id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(gt1.gt_ventes_ttc, 2200 + 1650);
        assert_eq!(gt1.gt_net_ttc, 2200 + 1540);

        let (status, cloture_id): (String, Option<String>) =
            sqlx::query_as("SELECT status, cloture_id FROM sessions WHERE id = 's1'")
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(status, "CLOSED");
        assert_eq!(cloture_id.as_deref(), Some(z1.id.as_str()));

        let journal: Vec<(String,)> = sqlx::query_as(
            "SELECT event_type FROM journal_entries WHERE event_type IN ('CLOTURE_Z', 'SESSION_CLOSE')",
        )
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(journal.len(), 2);

        // Double clôture refusée, sans rien écrire.
        assert!(cloturer_session(&pool, "s1").await.is_err());

        // Deuxième session : chaînage et cumul des grands totaux.
        open_session(&pool, "s2").await;
        add_transaction(&pool, "s2", "VENTE", 330).await;
        let z2 = cloturer_session(&pool, "s2").await.unwrap();
        assert_eq!(z2.sequence_no, 2);
        assert_eq!(z2.previous_hash.as_deref(), Some(z1.hash.as_str()));

        let gt2 =
            sqlx::query_as::<_, GrandTotal>("SELECT * FROM grand_totals WHERE cloture_id = ?")
                .bind(&z2.id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(gt2.gt_net_ttc, gt1.gt_net_ttc + 330);

        // Les deux chaînes sont intactes.
        assert_eq!(transaction_chain(&pool).await, Ok(5));
        assert_eq!(cloture_chain(&pool).await, Ok(2));
        let nb: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM clotures")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(nb, 2);

        // Falsification d'un grand total : la chaîne des clôtures le détecte.
        sqlx::query("UPDATE grand_totals SET gt_net_ttc = gt_net_ttc + 1 WHERE cloture_id = ?")
            .bind(&z1.id)
            .execute(&pool)
            .await
            .unwrap();
        assert_eq!(cloture_chain(&pool).await, Err(1));
    }
}
