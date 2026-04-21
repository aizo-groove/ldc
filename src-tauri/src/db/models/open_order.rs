use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct OpenOrder {
    pub id: String,
    pub table_id: Option<String>,
    pub session_id: Option<String>,
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct OpenOrderLine {
    pub id: String,
    pub order_id: String,
    pub line_no: i64,
    pub product_id: Option<String>,
    pub product_name: String,
    pub product_sku: Option<String>,
    pub quantity: i64,
    pub unit_price_ttc: i64,
    pub unit_price_ht: i64,
    pub tva_rate_pct: i64,
    pub discount_ttc: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenOrderFull {
    pub order: OpenOrder,
    pub lines: Vec<OpenOrderLine>,
}

/// Entrée envoyée par le frontend pour sauvegarder une ligne.
#[derive(Debug, Deserialize)]
pub struct OpenOrderLineInput {
    pub product_id: Option<String>,
    pub product_name: String,
    pub product_sku: Option<String>,
    pub quantity: i64,
    pub unit_price_ttc: i64,
    pub unit_price_ht: i64,
    pub tva_rate_pct: i64,
    pub discount_ttc: i64,
}
