use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub sort_order: i64,
    pub active: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Product {
    pub id: String,
    pub category_id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub barcode: Option<String>,
    pub sku: Option<String>,
    pub price_ttc: i64,
    pub tva_rate_id: i64,
    pub price_ht: i64,
    pub track_stock: i64,
    pub stock_qty: Option<i64>,
    pub active: i64,
    pub sort_order: i64,
    // Ignorés à la création (valeur DB par défaut) ; présents dans les lectures
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TvaRate {
    pub id: i64,
    pub label: String,
    pub rate_pct: i64,
    pub active: i64,
}
