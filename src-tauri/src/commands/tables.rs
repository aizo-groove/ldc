use crate::db::models::{Room, RestaurantTable};
use crate::AppState;
use tauri::State;

// ── Rooms ─────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_rooms(state: State<'_, AppState>) -> Result<Vec<Room>, String> {
    let pool = state.db.as_ref();
    sqlx::query_as::<_, Room>("SELECT * FROM rooms ORDER BY sort_order, name")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_room(state: State<'_, AppState>, name: String) -> Result<Room, String> {
    let pool = state.db.as_ref();
    let id = uuid::Uuid::new_v4().to_string();
    let max_order: i64 = sqlx::query_scalar("SELECT COALESCE(MAX(sort_order), 0) FROM rooms")
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("INSERT INTO rooms (id, name, sort_order) VALUES (?, ?, ?)")
        .bind(&id)
        .bind(&name)
        .bind(max_order + 1)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query_as::<_, Room>("SELECT * FROM rooms WHERE id = ?")
        .bind(&id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_room(
    state: State<'_, AppState>,
    id: String,
    name: String,
) -> Result<Room, String> {
    let pool = state.db.as_ref();
    sqlx::query("UPDATE rooms SET name = ? WHERE id = ?")
        .bind(&name)
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query_as::<_, Room>("SELECT * FROM rooms WHERE id = ?")
        .bind(&id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_room(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let pool = state.db.as_ref();
    sqlx::query("DELETE FROM rooms WHERE id = ?")
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Tables ────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_tables(state: State<'_, AppState>) -> Result<Vec<RestaurantTable>, String> {
    let pool = state.db.as_ref();
    sqlx::query_as::<_, RestaurantTable>(
        "SELECT * FROM restaurant_tables ORDER BY room_id, sort_order, name",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_table(
    state: State<'_, AppState>,
    table: RestaurantTable,
) -> Result<RestaurantTable, String> {
    let pool = state.db.as_ref();
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO restaurant_tables (id, room_id, name, seats, shape, status, pos_x, pos_y, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&id)
    .bind(&table.room_id)
    .bind(&table.name)
    .bind(table.seats)
    .bind(&table.shape)
    .bind(&table.status)
    .bind(table.pos_x)
    .bind(table.pos_y)
    .bind(table.sort_order)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;
    sqlx::query_as::<_, RestaurantTable>("SELECT * FROM restaurant_tables WHERE id = ?")
        .bind(&id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_table(
    state: State<'_, AppState>,
    table: RestaurantTable,
) -> Result<RestaurantTable, String> {
    let pool = state.db.as_ref();
    sqlx::query(
        r#"UPDATE restaurant_tables
           SET room_id = ?, name = ?, seats = ?, shape = ?, status = ?,
               pos_x = ?, pos_y = ?, sort_order = ?
           WHERE id = ?"#,
    )
    .bind(&table.room_id)
    .bind(&table.name)
    .bind(table.seats)
    .bind(&table.shape)
    .bind(&table.status)
    .bind(table.pos_x)
    .bind(table.pos_y)
    .bind(table.sort_order)
    .bind(&table.id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;
    sqlx::query_as::<_, RestaurantTable>("SELECT * FROM restaurant_tables WHERE id = ?")
        .bind(&table.id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_table_status(
    state: State<'_, AppState>,
    table_id: String,
    status: String,
) -> Result<(), String> {
    let pool = state.db.as_ref();
    sqlx::query("UPDATE restaurant_tables SET status = ? WHERE id = ?")
        .bind(&status)
        .bind(&table_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_table_position(
    state: State<'_, AppState>,
    table_id: String,
    pos_x: i64,
    pos_y: i64,
) -> Result<(), String> {
    let pool = state.db.as_ref();
    sqlx::query("UPDATE restaurant_tables SET pos_x = ?, pos_y = ? WHERE id = ?")
        .bind(pos_x)
        .bind(pos_y)
        .bind(&table_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_table(state: State<'_, AppState>, table_id: String) -> Result<(), String> {
    let pool = state.db.as_ref();
    sqlx::query("DELETE FROM restaurant_tables WHERE id = ?")
        .bind(&table_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
