use crate::db::models::Cashier;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_cashiers(state: State<'_, AppState>) -> Result<Vec<Cashier>, String> {
    let pool = state.db.as_ref();
    sqlx::query_as::<_, Cashier>(
        "SELECT * FROM cashiers WHERE active = 1 ORDER BY name",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_cashier(
    state: State<'_, AppState>,
    name: String,
    pin: Option<String>,
    role: String,
) -> Result<Cashier, String> {
    let pool = state.db.as_ref();
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO cashiers (id, name, pin, role) VALUES (?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&name)
    .bind(&pin)
    .bind(&role)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Cashier>("SELECT * FROM cashiers WHERE id = ?")
        .bind(&id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_cashier(
    state: State<'_, AppState>,
    id: String,
    name: String,
    pin: Option<String>,
    role: String,
) -> Result<Cashier, String> {
    let pool = state.db.as_ref();
    sqlx::query(
        "UPDATE cashiers SET name = ?, pin = ?, role = ? WHERE id = ?",
    )
    .bind(&name)
    .bind(&pin)
    .bind(&role)
    .bind(&id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Cashier>("SELECT * FROM cashiers WHERE id = ?")
        .bind(&id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_cashier(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let pool = state.db.as_ref();
    sqlx::query("UPDATE cashiers SET active = 0 WHERE id = ?")
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Vérifie le PIN d'un caissier. Retourne true si le PIN correspond (ou si le caissier n'a pas de PIN).
#[tauri::command]
pub async fn verify_cashier_pin(
    state: State<'_, AppState>,
    cashier_id: String,
    pin: String,
) -> Result<bool, String> {
    let pool = state.db.as_ref();
    let stored: Option<Option<String>> = sqlx::query_scalar(
        "SELECT pin FROM cashiers WHERE id = ? AND active = 1",
    )
    .bind(&cashier_id)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    match stored {
        None => Ok(false),                          // caissier introuvable
        Some(None) => Ok(true),                     // pas de PIN → accès libre
        Some(Some(stored_pin)) => Ok(stored_pin == pin),
    }
}
