use crate::db::models::session::Session;
use crate::AppState;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct RapportX {
    pub session: Session,
    pub total_ventes_ttc: i64,
    pub total_avoirs_ttc: i64,
    pub net_ttc: i64,
    pub nb_transactions: i64,
    pub pay_especes: i64,
    pub pay_cb: i64,
    pub pay_cheque: i64,
    pub pay_autre: i64,
    /// Montants TVA collectés par taux (en centimes)
    pub tva_2000: i64,
    pub tva_1000: i64,
    pub tva_550: i64,
    pub tva_210: i64,
    pub tva_0: i64,
    /// Bases HT correspondantes par taux (en centimes)
    pub ht_2000: i64,
    pub ht_1000: i64,
    pub ht_550: i64,
    pub ht_210: i64,
    pub ht_0: i64,
}

#[tauri::command]
pub async fn list_sessions(
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> Result<Vec<Session>, String> {
    let pool = state.db.as_ref();
    sqlx::query_as::<_, Session>("SELECT * FROM sessions ORDER BY opened_at DESC LIMIT ?")
        .bind(limit.unwrap_or(50))
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_active_session(state: State<'_, AppState>) -> Result<Option<Session>, String> {
    let pool = state.db.as_ref();
    sqlx::query_as::<_, Session>("SELECT * FROM sessions WHERE status = 'OPEN' LIMIT 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_session(
    state: State<'_, AppState>,
    opening_float: i64,
    opening_note: Option<String>,
    cashier_id: Option<String>,
    station_id: Option<String>,
) -> Result<Session, String> {
    let pool = state.db.as_ref();
    let station = station_id.unwrap_or_else(|| "main".to_string());

    let existing =
        sqlx::query_as::<_, Session>("SELECT * FROM sessions WHERE status = 'OPEN' LIMIT 1")
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

    if existing.is_some() {
        return Err("Une session est déjà ouverte".to_string());
    }

    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO sessions (id, opening_float, opening_note, cashier_id, station_id) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(opening_float)
    .bind(&opening_note)
    .bind(&cashier_id)
    .bind(&station)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query(
        r#"INSERT INTO journal_entries (sequence_no, event_type, entity_type, entity_id, payload)
           VALUES (
               (SELECT COALESCE(MAX(sequence_no), 0) + 1 FROM journal_entries),
               'SESSION_OPEN', 'session', ?, json_object('session_id', ?)
           )"#,
    )
    .bind(&id)
    .bind(&id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Session>("SELECT * FROM sessions WHERE id = ?")
        .bind(&id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn close_session(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<Session, String> {
    let pool = state.db.as_ref();
    crate::nf525::cloture::cloturer_session(pool, &session_id).await?;

    sqlx::query_as::<_, Session>("SELECT * FROM sessions WHERE id = ?")
        .bind(&session_id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_rapport_x(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<RapportX, String> {
    let pool = state.db.as_ref();

    let session = sqlx::query_as::<_, Session>("SELECT * FROM sessions WHERE id = ?")
        .bind(&session_id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

    let t = crate::nf525::cloture::session_totaux(pool, &session_id).await?;

    Ok(RapportX {
        session,
        total_ventes_ttc: t.ventes,
        total_avoirs_ttc: t.avoirs,
        net_ttc: t.net(),
        nb_transactions: t.nb,
        pay_especes: t.pay_especes,
        pay_cb: t.pay_cb,
        pay_cheque: t.pay_cheque,
        pay_autre: t.pay_autre,
        tva_2000: t.tva_2000,
        tva_1000: t.tva_1000,
        tva_550: t.tva_550,
        tva_210: t.tva_210,
        tva_0: t.tva_0,
        ht_2000: t.ht_2000,
        ht_1000: t.ht_1000,
        ht_550: t.ht_550,
        ht_210: t.ht_210,
        ht_0: t.ht_0,
    })
}
