use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Room {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub sort_order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RestaurantTable {
    pub id: String,
    pub room_id: Option<String>,
    pub name: String,
    pub seats: i64,
    pub shape: String,
    pub status: String,
    pub pos_x: i64,
    pub pos_y: i64,
    pub sort_order: i64,
}
