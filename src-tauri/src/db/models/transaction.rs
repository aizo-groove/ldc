use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Transaction {
    pub id: String,
    pub session_id: String,
    pub sequence_no: i64,
    pub r#type: String,
    pub ref_transaction_id: Option<String>,
    pub total_ht: i64,
    pub total_tva: i64,
    pub total_ttc: i64,
    pub discount_ttc: i64,
    pub previous_hash: Option<String>,
    pub hash: String,
    pub receipt_printed: i64,
    pub receipt_email: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TransactionLine {
    pub id: String,
    pub transaction_id: String,
    pub line_no: i64,
    pub product_id: Option<String>,
    pub product_name: String,
    pub product_sku: Option<String>,
    pub quantity: i64,
    pub unit_price_ttc: i64,
    pub unit_price_ht: i64,
    pub tva_rate_pct: i64,
    pub discount_ttc: i64,
    pub line_total_ht: i64,
    pub line_total_tva: i64,
    pub line_total_ttc: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Payment {
    pub id: String,
    pub transaction_id: String,
    pub method: String,
    pub amount: i64,
    pub cash_given: Option<i64>,
    pub cash_change: Option<i64>,
    pub reference: Option<String>,
    pub created_at: String,
}

/// Payload complet renvoyé au frontend pour affichage d'un ticket.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionFull {
    pub transaction: Transaction,
    pub lines: Vec<TransactionLine>,
    pub payments: Vec<Payment>,
}

/// Entrée d'une ligne panier envoyée par le frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CartLineInput {
    #[serde(default)]
    pub product_id: Option<String>,
    pub product_name: String,
    #[serde(default)]
    pub product_sku: Option<String>,
    pub quantity: i64,
    pub unit_price_ttc: i64,
    pub unit_price_ht: i64,
    pub tva_rate_pct: i64,
    pub discount_ttc: i64,
}

/// Entrée d'un paiement envoyée par le frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentInput {
    pub method: String,
    pub amount: i64,
    #[serde(default)]
    pub cash_given: Option<i64>,
    #[serde(default)]
    pub reference: Option<String>,
}
