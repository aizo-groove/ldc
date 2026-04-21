use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Cashier {
    pub id: String,
    pub name: String,
    pub pin: Option<String>,
    pub role: String,
    pub active: i64,
    pub created_at: String,
}
