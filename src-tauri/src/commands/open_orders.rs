use crate::db::models::{OpenOrder, OpenOrderFull, OpenOrderLine, OpenOrderLineInput};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_table_order(
    state: State<'_, AppState>,
    table_id: String,
) -> Result<Option<OpenOrderFull>, String> {
    let pool = state.db.as_ref();

    let order = sqlx::query_as::<_, OpenOrder>(
        "SELECT * FROM open_orders WHERE table_id = ?",
    )
    .bind(&table_id)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let Some(order) = order else { return Ok(None) };

    let lines = sqlx::query_as::<_, OpenOrderLine>(
        "SELECT * FROM open_order_lines WHERE order_id = ? ORDER BY line_no",
    )
    .bind(&order.id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Some(OpenOrderFull { order, lines }))
}

#[tauri::command]
pub async fn save_table_order(
    state: State<'_, AppState>,
    table_id: String,
    session_id: Option<String>,
    lines: Vec<OpenOrderLineInput>,
) -> Result<OpenOrderFull, String> {
    let pool = state.db.as_ref();
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();

    // Upsert the open_order row
    let order_id = sqlx::query_scalar::<_, String>(
        "SELECT id FROM open_orders WHERE table_id = ?",
    )
    .bind(&table_id)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let order_id = if let Some(id) = order_id {
        sqlx::query(
            "UPDATE open_orders SET session_id = ?, updated_at = ? WHERE id = ?",
        )
        .bind(&session_id)
        .bind(&now)
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        id
    } else {
        let new_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO open_orders (id, table_id, session_id, updated_at) VALUES (?, ?, ?, ?)",
        )
        .bind(&new_id)
        .bind(&table_id)
        .bind(&session_id)
        .bind(&now)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        new_id
    };

    // Replace all lines
    sqlx::query("DELETE FROM open_order_lines WHERE order_id = ?")
        .bind(&order_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    for (i, line) in lines.iter().enumerate() {
        let line_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            r#"INSERT INTO open_order_lines
               (id, order_id, line_no, product_id, product_name, product_sku,
                quantity, unit_price_ttc, unit_price_ht, tva_rate_pct, discount_ttc)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
        )
        .bind(&line_id)
        .bind(&order_id)
        .bind(i as i64 + 1)
        .bind(&line.product_id)
        .bind(&line.product_name)
        .bind(&line.product_sku)
        .bind(line.quantity)
        .bind(line.unit_price_ttc)
        .bind(line.unit_price_ht)
        .bind(line.tva_rate_pct)
        .bind(line.discount_ttc)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Fetch and return the full order
    let order = sqlx::query_as::<_, OpenOrder>("SELECT * FROM open_orders WHERE id = ?")
        .bind(&order_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let saved_lines = sqlx::query_as::<_, OpenOrderLine>(
        "SELECT * FROM open_order_lines WHERE order_id = ? ORDER BY line_no",
    )
    .bind(&order_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(OpenOrderFull { order, lines: saved_lines })
}

#[tauri::command]
pub async fn delete_table_order(
    state: State<'_, AppState>,
    table_id: String,
) -> Result<(), String> {
    let pool = state.db.as_ref();
    sqlx::query("DELETE FROM open_orders WHERE table_id = ?")
        .bind(&table_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
