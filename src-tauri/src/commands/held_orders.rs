//! Notes en attente : paniers de la Vente mis de côté pour être repris plus tard.
//!
//! Ce sont des tickets ouverts sans table (`open_orders.table_id IS NULL`),
//! identifiés par un numéro du jour (`held_no`) et un libellé facultatif.
//! Rien de fiscal ici : une note devient une transaction NF525 seulement
//! quand elle est encaissée, puis elle est supprimée.
use crate::db::models::{OpenOrder, OpenOrderFull, OpenOrderLine, OpenOrderLineInput};
use crate::AppState;
use sqlx::SqlitePool;
use tauri::State;

fn now() -> String {
    chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string()
}

fn clean_label(label: Option<String>) -> Option<String> {
    label
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
}

async fn load_full(pool: &SqlitePool, order: OpenOrder) -> Result<OpenOrderFull, String> {
    let lines = sqlx::query_as::<_, OpenOrderLine>(
        "SELECT * FROM open_order_lines WHERE order_id = ? ORDER BY line_no",
    )
    .bind(&order.id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(OpenOrderFull { order, lines })
}

/// Notes en attente, de la plus ancienne à la plus récente.
pub async fn list(pool: &SqlitePool) -> Result<Vec<OpenOrderFull>, String> {
    let orders = sqlx::query_as::<_, OpenOrder>(
        "SELECT * FROM open_orders WHERE table_id IS NULL ORDER BY created_at",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut out = Vec::with_capacity(orders.len());
    for order in orders {
        out.push(load_full(pool, order).await?);
    }
    Ok(out)
}

/// Crée une note (`id` absent) ou remplace les lignes et le libellé d'une note existante.
pub async fn save(
    pool: &SqlitePool,
    id: Option<String>,
    session_id: Option<String>,
    label: Option<String>,
    lines: Vec<OpenOrderLineInput>,
) -> Result<OpenOrderFull, String> {
    let err = |e: sqlx::Error| e.to_string();
    let label = clean_label(label);
    let now = now();
    let mut tx = pool.begin().await.map_err(err)?;

    // Session inexistante → NULL, pour ne pas violer la clé étrangère
    let session_id = match session_id {
        Some(sid) => {
            let exists: bool =
                sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM sessions WHERE id = ?)")
                    .bind(&sid)
                    .fetch_one(&mut *tx)
                    .await
                    .map_err(err)?;
            exists.then_some(sid)
        }
        None => None,
    };

    let order_id = match id {
        Some(id) => {
            let updated = sqlx::query(
                "UPDATE open_orders SET session_id = ?, label = ?, updated_at = ?
                 WHERE id = ? AND table_id IS NULL",
            )
            .bind(&session_id)
            .bind(&label)
            .bind(&now)
            .bind(&id)
            .execute(&mut *tx)
            .await
            .map_err(err)?;
            if updated.rows_affected() != 1 {
                return Err("Note en attente introuvable".to_string());
            }
            id
        }
        None => {
            // Numéro du jour (heure locale) : 1 + plus grand numéro des notes créées aujourd'hui
            let held_no: i64 = sqlx::query_scalar(
                "SELECT COALESCE(MAX(held_no), 0) + 1 FROM open_orders
                 WHERE table_id IS NULL
                   AND date(created_at, 'localtime') = date('now', 'localtime')",
            )
            .fetch_one(&mut *tx)
            .await
            .map_err(err)?;
            let id = uuid::Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO open_orders (id, table_id, session_id, held_no, label, created_at, updated_at)
                 VALUES (?, NULL, ?, ?, ?, ?, ?)",
            )
            .bind(&id)
            .bind(&session_id)
            .bind(held_no)
            .bind(&label)
            .bind(&now)
            .bind(&now)
            .execute(&mut *tx)
            .await
            .map_err(err)?;
            id
        }
    };

    sqlx::query("DELETE FROM open_order_lines WHERE order_id = ?")
        .bind(&order_id)
        .execute(&mut *tx)
        .await
        .map_err(err)?;
    for (i, line) in lines.iter().enumerate() {
        sqlx::query(
            r#"INSERT INTO open_order_lines
               (id, order_id, line_no, product_id, product_name, product_sku,
                quantity, unit_price_ttc, unit_price_ht, tva_rate_pct, discount_ttc, sent_qty)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(&order_id)
        .bind((i + 1) as i64)
        .bind(&line.product_id)
        .bind(&line.product_name)
        .bind(&line.product_sku)
        .bind(line.quantity)
        .bind(line.unit_price_ttc)
        .bind(line.unit_price_ht)
        .bind(line.tva_rate_pct)
        .bind(line.discount_ttc)
        .bind(line.sent_qty)
        .execute(&mut *tx)
        .await
        .map_err(err)?;
    }
    tx.commit().await.map_err(err)?;

    let order = sqlx::query_as::<_, OpenOrder>("SELECT * FROM open_orders WHERE id = ?")
        .bind(&order_id)
        .fetch_one(pool)
        .await
        .map_err(err)?;
    load_full(pool, order).await
}

/// Change le libellé d'une note (vide → aucun libellé).
pub async fn rename(pool: &SqlitePool, id: &str, label: Option<String>) -> Result<(), String> {
    let updated = sqlx::query(
        "UPDATE open_orders SET label = ?, updated_at = ? WHERE id = ? AND table_id IS NULL",
    )
    .bind(clean_label(label))
    .bind(now())
    .bind(id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    if updated.rows_affected() != 1 {
        return Err("Note en attente introuvable".to_string());
    }
    Ok(())
}

/// Supprime une note (encaissée ou abandonnée). Les lignes partent en cascade.
pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM open_orders WHERE id = ? AND table_id IS NULL")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Commandes Tauri ───────────────────────────────────────────

#[tauri::command]
pub async fn list_held_orders(state: State<'_, AppState>) -> Result<Vec<OpenOrderFull>, String> {
    list(state.db.as_ref()).await
}

#[tauri::command]
pub async fn save_held_order(
    state: State<'_, AppState>,
    id: Option<String>,
    session_id: Option<String>,
    label: Option<String>,
    lines: Vec<OpenOrderLineInput>,
) -> Result<OpenOrderFull, String> {
    save(state.db.as_ref(), id, session_id, label, lines).await
}

#[tauri::command]
pub async fn rename_held_order(
    state: State<'_, AppState>,
    id: String,
    label: Option<String>,
) -> Result<(), String> {
    rename(state.db.as_ref(), &id, label).await
}

#[tauri::command]
pub async fn delete_held_order(state: State<'_, AppState>, id: String) -> Result<(), String> {
    delete(state.db.as_ref(), &id).await
}

// ── Tests ─────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
    use std::str::FromStr;

    async fn test_pool() -> SqlitePool {
        let options = SqliteConnectOptions::from_str("sqlite::memory:")
            .unwrap()
            .pragma("foreign_keys", "ON");
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await
            .unwrap();
        sqlx::migrate!("src/db/migrations")
            .run(&pool)
            .await
            .unwrap();
        pool
    }

    fn line(name: &str, qty: i64, ttc: i64) -> OpenOrderLineInput {
        OpenOrderLineInput {
            product_id: None,
            product_name: name.to_string(),
            product_sku: None,
            quantity: qty,
            unit_price_ttc: ttc,
            unit_price_ht: ttc * 100 / 110,
            tva_rate_pct: 1000,
            discount_ttc: 0,
            sent_qty: 0,
        }
    }

    #[tokio::test]
    async fn notes_en_attente_cycle_complet() {
        let pool = test_pool().await;

        let n1 = save(
            &pool,
            None,
            Some("inconnue".into()),
            None,
            vec![line("Cappuccino", 2, 390)],
        )
        .await
        .unwrap();
        let n2 = save(
            &pool,
            None,
            None,
            Some("  Comptoir ".into()),
            vec![line("Expresso", 1, 180)],
        )
        .await
        .unwrap();
        assert_eq!((n1.order.held_no, n2.order.held_no), (Some(1), Some(2)));
        assert_eq!(n1.order.session_id, None, "session inexistante → NULL");
        assert_eq!(n2.order.label.as_deref(), Some("Comptoir"));
        assert_eq!(n1.order.table_id, None);

        // Mise à jour : lignes remplacées, numéro conservé
        let n1b = save(
            &pool,
            Some(n1.order.id.clone()),
            None,
            None,
            vec![line("Cappuccino", 2, 390), line("Cookie", 1, 220)],
        )
        .await
        .unwrap();
        assert_eq!(n1b.order.held_no, Some(1));
        assert_eq!(n1b.lines.len(), 2);

        rename(&pool, &n1.order.id, Some("À emporter".into()))
            .await
            .unwrap();
        rename(&pool, &n2.order.id, Some("   ".into()))
            .await
            .unwrap();

        let all = list(&pool).await.unwrap();
        assert_eq!(all.len(), 2);
        assert_eq!(all[0].order.label.as_deref(), Some("À emporter"));
        assert_eq!(all[1].order.label, None, "libellé vide → aucun libellé");

        // Les tickets de table ne sont pas des notes en attente
        sqlx::query("INSERT INTO open_orders (id, table_id) VALUES ('o-t', 'tbl-t06')")
            .execute(&pool)
            .await
            .unwrap();
        assert_eq!(list(&pool).await.unwrap().len(), 2);
        assert!(rename(&pool, "o-t", Some("x".into())).await.is_err());

        delete(&pool, &n1.order.id).await.unwrap();
        let rest = list(&pool).await.unwrap();
        assert_eq!(rest.len(), 1);
        assert_eq!(rest[0].order.id, n2.order.id);
        let orphan_lines: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM open_order_lines WHERE order_id = ?")
                .bind(&n1.order.id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(orphan_lines, 0, "lignes supprimées en cascade");

        // Un nouvel ajout le même jour continue la numérotation
        let n3 = save(&pool, None, None, None, vec![line("Thé", 1, 250)])
            .await
            .unwrap();
        assert_eq!(n3.order.held_no, Some(3));
        assert!(save(&pool, Some("absente".into()), None, None, vec![])
            .await
            .is_err());
    }
}
