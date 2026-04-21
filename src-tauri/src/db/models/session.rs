use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Session {
    pub id: String,
    pub status: String,
    pub opening_float: i64,
    pub opening_note: Option<String>,
    pub opened_at: String,
    pub closed_at: Option<String>,
    pub cloture_id: Option<String>,
    pub cashier_id: Option<String>,
    pub station_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Cloture {
    pub id: String,
    pub session_id: String,
    pub sequence_no: i64,
    pub total_ventes_ttc: i64,
    pub total_avoirs_ttc: i64,
    pub total_annulations_ttc: i64,
    pub net_ttc: i64,
    pub tva_2000: i64,
    pub tva_1000: i64,
    pub tva_550: i64,
    pub tva_210: i64,
    pub tva_0: i64,
    pub pay_especes: i64,
    pub pay_cb: i64,
    pub pay_cheque: i64,
    pub pay_autre: i64,
    pub previous_hash: Option<String>,
    pub hash: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct GrandTotal {
    pub id: String,
    pub cloture_id: String,
    pub gt_ventes_ttc: i64,
    pub gt_avoirs_ttc: i64,
    pub gt_net_ttc: i64,
    pub gt_tva_2000: i64,
    pub gt_tva_1000: i64,
    pub gt_tva_550: i64,
    pub gt_tva_210: i64,
    pub gt_tva_0: i64,
    pub created_at: String,
}
