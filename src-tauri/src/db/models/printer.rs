use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, FromRow)]
pub struct Printer {
    pub id:           String,
    pub name:         String,
    pub printer_type: String,
    pub ip:           Option<String>,
    pub port:         i64,
    pub paper_mm:     i64,
    pub roles:        String,
    pub sort_order:   i64,
    pub created_at:   String,
}

#[derive(Debug, Deserialize)]
pub struct PrinterInput {
    pub name:         String,
    pub printer_type: String,
    pub ip:           Option<String>,
    pub port:         i64,
    pub paper_mm:     i64,
    pub roles:        String,
}
