use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn wipe_all_data(
    state: State<'_, AppState>,
    manager_pin: String,
) -> Result<(), String> {
    let db = &*state.db;

    // Verify manager PIN before touching anything
    let stored: Option<Option<String>> = sqlx::query_scalar(
        "SELECT pin FROM cashiers WHERE role = 'manager' AND active = 1 LIMIT 1",
    )
    .fetch_optional(db)
    .await
    .map_err(|e| e.to_string())?;

    match stored {
        None => return Err("Aucun responsable trouvé".to_string()),
        Some(None) => {}                                        // pas de PIN → accès libre
        Some(Some(pin)) => {
            if pin != manager_pin {
                return Err("PIN incorrect".to_string());
            }
        }
    }

    // Sales data (FK order)
    sqlx::query("DELETE FROM open_order_lines").execute(db).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM open_orders").execute(db).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM payments").execute(db).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM transaction_lines").execute(db).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM transactions").execute(db).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM journal_entries").execute(db).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM clotures").execute(db).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM grand_totals").execute(db).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM sessions").execute(db).await.map_err(|e| e.to_string())?;
    // Loyalty + cashiers + all settings
    sqlx::query("DELETE FROM loyalty_programs").execute(db).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM cashiers").execute(db).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM settings").execute(db).await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_setting(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<String>, String> {
    let pool = state.db.as_ref();
    sqlx::query_scalar::<_, String>("SELECT value FROM settings WHERE key = ?")
        .bind(&key)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_setting(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let pool = state.db.as_ref();
    sqlx::query(
        "INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(&key)
    .bind(&value)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}
