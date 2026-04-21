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
    sqlx::query_as::<_, Session>(
        "SELECT * FROM sessions ORDER BY opened_at DESC LIMIT ?",
    )
    .bind(limit.unwrap_or(50))
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_active_session(state: State<'_, AppState>) -> Result<Option<Session>, String> {
    let pool = state.db.as_ref();
    sqlx::query_as::<_, Session>("SELECT * FROM sessions WHERE status = 'OPEN' LIMIT 1")
        .fetch_optional(&*pool)
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
            .fetch_optional(&*pool)
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
    .execute(&*pool)
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
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Session>("SELECT * FROM sessions WHERE id = ?")
        .bind(&id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn close_session(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<Session, String> {
    // TODO : clôture Z complète (calcul totaux, hash NF525, grands totaux, impression Z).
    let pool = state.db.as_ref();
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();

    sqlx::query(
        "UPDATE sessions SET status = 'CLOSED', closed_at = ? WHERE id = ? AND status = 'OPEN'",
    )
    .bind(&now)
    .bind(&session_id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Session>("SELECT * FROM sessions WHERE id = ?")
        .bind(&session_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[derive(sqlx::FromRow)]
struct SessionTotalsRow {
    ventes: i64,
    avoirs: i64,
    nb: i64,
}

#[derive(sqlx::FromRow)]
struct PaymentTotalsRow {
    especes: i64,
    cb: i64,
    cheque: i64,
    autre: i64,
}

#[derive(sqlx::FromRow)]
struct TvaTotalsRow {
    tva_2000: i64,
    tva_1000: i64,
    tva_550: i64,
    tva_210: i64,
    tva_0: i64,
    ht_2000: i64,
    ht_1000: i64,
    ht_550: i64,
    ht_210: i64,
    ht_0: i64,
}

#[tauri::command]
pub async fn get_rapport_x(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<RapportX, String> {
    let pool = state.db.as_ref();

    let session = sqlx::query_as::<_, Session>("SELECT * FROM sessions WHERE id = ?")
        .bind(&session_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let totals = sqlx::query_as::<_, SessionTotalsRow>(
        r#"SELECT
               CAST(COALESCE(SUM(CASE WHEN type = 'VENTE' THEN total_ttc ELSE 0 END), 0) AS INTEGER) AS ventes,
               CAST(COALESCE(SUM(CASE WHEN type = 'AVOIR' THEN total_ttc ELSE 0 END), 0) AS INTEGER) AS avoirs,
               CAST(COUNT(*) AS INTEGER) AS nb
           FROM transactions WHERE session_id = ?"#,
    )
    .bind(&session_id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let pays = sqlx::query_as::<_, PaymentTotalsRow>(
        r#"SELECT
               CAST(COALESCE(SUM(CASE WHEN p.method = 'ESPECES' THEN p.amount ELSE 0 END), 0) AS INTEGER) AS especes,
               CAST(COALESCE(SUM(CASE WHEN p.method = 'CB'      THEN p.amount ELSE 0 END), 0) AS INTEGER) AS cb,
               CAST(COALESCE(SUM(CASE WHEN p.method = 'CHEQUE'  THEN p.amount ELSE 0 END), 0) AS INTEGER) AS cheque,
               CAST(COALESCE(SUM(CASE WHEN p.method NOT IN ('ESPECES','CB','CHEQUE') THEN p.amount ELSE 0 END), 0) AS INTEGER) AS autre
           FROM payments p
           INNER JOIN transactions t ON t.id = p.transaction_id
           WHERE t.session_id = ? AND t.type = 'VENTE'"#,
    )
    .bind(&session_id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let tva = sqlx::query_as::<_, TvaTotalsRow>(
        r#"SELECT
               CAST(COALESCE(SUM(CASE WHEN tl.tva_rate_pct = 2000 THEN tl.line_total_tva ELSE 0 END), 0) AS INTEGER) AS tva_2000,
               CAST(COALESCE(SUM(CASE WHEN tl.tva_rate_pct = 1000 THEN tl.line_total_tva ELSE 0 END), 0) AS INTEGER) AS tva_1000,
               CAST(COALESCE(SUM(CASE WHEN tl.tva_rate_pct = 550  THEN tl.line_total_tva ELSE 0 END), 0) AS INTEGER) AS tva_550,
               CAST(COALESCE(SUM(CASE WHEN tl.tva_rate_pct = 210  THEN tl.line_total_tva ELSE 0 END), 0) AS INTEGER) AS tva_210,
               CAST(COALESCE(SUM(CASE WHEN tl.tva_rate_pct = 0    THEN tl.line_total_tva ELSE 0 END), 0) AS INTEGER) AS tva_0,
               CAST(COALESCE(SUM(CASE WHEN tl.tva_rate_pct = 2000 THEN tl.line_total_ht  ELSE 0 END), 0) AS INTEGER) AS ht_2000,
               CAST(COALESCE(SUM(CASE WHEN tl.tva_rate_pct = 1000 THEN tl.line_total_ht  ELSE 0 END), 0) AS INTEGER) AS ht_1000,
               CAST(COALESCE(SUM(CASE WHEN tl.tva_rate_pct = 550  THEN tl.line_total_ht  ELSE 0 END), 0) AS INTEGER) AS ht_550,
               CAST(COALESCE(SUM(CASE WHEN tl.tva_rate_pct = 210  THEN tl.line_total_ht  ELSE 0 END), 0) AS INTEGER) AS ht_210,
               CAST(COALESCE(SUM(CASE WHEN tl.tva_rate_pct = 0    THEN tl.line_total_ht  ELSE 0 END), 0) AS INTEGER) AS ht_0
           FROM transaction_lines tl
           INNER JOIN transactions t ON t.id = tl.transaction_id
           WHERE t.session_id = ? AND t.type = 'VENTE'"#,
    )
    .bind(&session_id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(RapportX {
        session,
        total_ventes_ttc: totals.ventes,
        total_avoirs_ttc: totals.avoirs,
        net_ttc: totals.ventes - totals.avoirs,
        nb_transactions: totals.nb,
        pay_especes: pays.especes,
        pay_cb: pays.cb,
        pay_cheque: pays.cheque,
        pay_autre: pays.autre,
        tva_2000: tva.tva_2000,
        tva_1000: tva.tva_1000,
        tva_550: tva.tva_550,
        tva_210: tva.tva_210,
        tva_0: tva.tva_0,
        ht_2000: tva.ht_2000,
        ht_1000: tva.ht_1000,
        ht_550: tva.ht_550,
        ht_210: tva.ht_210,
        ht_0: tva.ht_0,
    })
}
