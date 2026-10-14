/// Duplicatas de tickets (NF525).
///
/// Toute réédition d'un ticket déjà émis (réimpression, affichage écran, PDF)
/// est un duplicata : il reçoit un numéro propre au ticket et
/// est tracé dans le journal. Le ticket original et sa chaîne ne changent pas.
use serde::Serialize;
use sqlx::SqlitePool;

pub const CANAUX: [&str; 3] = ["IMPRESSION", "ECRAN", "PDF"];

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Duplicata {
    pub id: String,
    pub transaction_id: String,
    pub duplicata_no: i64,
    pub canal: String,
    pub created_at: String,
}

/// Enregistre un duplicata du ticket `transaction_id` et le trace au journal.
pub async fn emettre_duplicata(
    pool: &SqlitePool,
    transaction_id: &str,
    canal: &str,
) -> Result<Duplicata, String> {
    if !CANAUX.contains(&canal) {
        return Err(format!("Canal de duplicata inconnu : {}", canal));
    }
    let err = |e: sqlx::Error| e.to_string();
    let mut tx = pool.begin().await.map_err(err)?;

    let sequence_no: Option<i64> =
        sqlx::query_scalar("SELECT sequence_no FROM transactions WHERE id = ?")
            .bind(transaction_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(err)?;
    let Some(sequence_no) = sequence_no else {
        return Err("Ticket introuvable".to_string());
    };

    let duplicata_no: i64 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(duplicata_no), 0) + 1 FROM duplicatas WHERE transaction_id = ?",
    )
    .bind(transaction_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(err)?;

    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();

    sqlx::query(
        "INSERT INTO duplicatas (id, transaction_id, duplicata_no, canal, created_at)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(transaction_id)
    .bind(duplicata_no)
    .bind(canal)
    .bind(&created_at)
    .execute(&mut *tx)
    .await
    .map_err(err)?;

    sqlx::query(
        r#"INSERT INTO journal_entries (sequence_no, event_type, entity_type, entity_id, payload)
           VALUES (
               (SELECT COALESCE(MAX(sequence_no), 0) + 1 FROM journal_entries),
               'DUPLICATA', 'transaction', ?,
               json_object('sequence_no', ?, 'duplicata_no', ?, 'canal', ?)
           )"#,
    )
    .bind(transaction_id)
    .bind(sequence_no)
    .bind(duplicata_no)
    .bind(canal)
    .execute(&mut *tx)
    .await
    .map_err(err)?;

    tx.commit().await.map_err(err)?;

    Ok(Duplicata {
        id,
        transaction_id: transaction_id.to_string(),
        duplicata_no,
        canal: canal.to_string(),
        created_at,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::nf525::chain::{hash_transaction, verify_chain};
    use sqlx::sqlite::SqlitePoolOptions;

    async fn test_pool() -> SqlitePool {
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

    #[tokio::test]
    async fn duplicatas_numerotes_et_journalises() {
        let pool = test_pool().await;
        sqlx::query("INSERT INTO sessions (id) VALUES ('s1')")
            .execute(&pool)
            .await
            .unwrap();
        let created_at = "2025-01-01T10:00:00.000Z";
        let hash = hash_transaction(1, "VENTE", 1100, created_at, "GENESIS");
        sqlx::query(
            "INSERT INTO transactions (id, session_id, sequence_no, type, total_ht, total_tva,
                                       total_ttc, hash, created_at)
             VALUES ('tx-1', 's1', 1, 'VENTE', 1000, 100, 1100, ?, ?)",
        )
        .bind(&hash)
        .bind(created_at)
        .execute(&pool)
        .await
        .unwrap();

        let d1 = emettre_duplicata(&pool, "tx-1", "IMPRESSION")
            .await
            .unwrap();
        let d2 = emettre_duplicata(&pool, "tx-1", "ECRAN").await.unwrap();
        assert_eq!((d1.duplicata_no, d2.duplicata_no), (1, 2));

        let journal: Vec<(String, String)> = sqlx::query_as(
            "SELECT entity_id, payload FROM journal_entries WHERE event_type = 'DUPLICATA'
             ORDER BY sequence_no",
        )
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(journal.len(), 2);
        assert_eq!(journal[0].0, "tx-1");
        assert!(journal[1].1.contains("\"duplicata_no\":2"));
        assert!(journal[1].1.contains("\"canal\":\"ECRAN\""));

        // Refus sans rien écrire : canal inconnu, ticket inexistant.
        assert!(emettre_duplicata(&pool, "tx-1", "EMAIL").await.is_err());
        assert!(emettre_duplicata(&pool, "tx-x", "PDF").await.is_err());
        let nb: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM duplicatas")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(nb, 2);

        // Le ticket original et sa chaîne ne sont pas touchés.
        let rows: Vec<(i64, String, i64, String, Option<String>, String)> = sqlx::query_as(
            "SELECT sequence_no, type, total_ttc, created_at, previous_hash, hash
             FROM transactions ORDER BY sequence_no",
        )
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(verify_chain(&rows), Ok(1));
    }
}
