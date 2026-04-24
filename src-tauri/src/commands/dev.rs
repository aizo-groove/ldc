use crate::AppState;

/// Remet l'application dans l'état d'une installation vierge.
/// Retourne une erreur immédiatement si appelé dans un build de production.
#[tauri::command]
pub async fn dev_reset_onboarding(state: tauri::State<'_, AppState>) -> Result<(), String> {
    #[cfg(not(debug_assertions))]
    return Err("dev_reset_onboarding: non disponible en production".to_string());

    #[cfg(debug_assertions)]
    {
        let db = &*state.db;

        // Sales data (order matters for FK constraints)
        sqlx::query("DELETE FROM open_order_lines").execute(db).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM open_orders").execute(db).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM payments").execute(db).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM transaction_lines").execute(db).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM transactions").execute(db).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM journal_entries").execute(db).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM clotures").execute(db).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM grand_totals").execute(db).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM sessions").execute(db).await.map_err(|e| e.to_string())?;

        // Cashiers
        sqlx::query("DELETE FROM cashiers").execute(db).await.map_err(|e| e.to_string())?;

        // Onboarding settings
        sqlx::query(
            "DELETE FROM settings WHERE key IN ('store_name', 'onboarding_done', 'business_profile', 'store_siret', 'printer_ip', 'printer_port')"
        )
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }
}
