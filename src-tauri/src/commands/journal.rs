use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct JournalEntry {
    pub id: String,
    pub sequence_no: i64,
    pub event_type: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub payload: Option<String>,
    pub created_at: String,
}

#[tauri::command]
pub async fn list_journal_entries(
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> Result<Vec<JournalEntry>, String> {
    let pool = state.db.as_ref();
    let limit = limit.unwrap_or(100);
    sqlx::query_as::<_, JournalEntry>(
        "SELECT * FROM journal_entries ORDER BY sequence_no DESC LIMIT ?",
    )
    .bind(limit)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}
