use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions},
    SqlitePool,
};
use std::str::FromStr;
use tauri::{AppHandle, Manager};

pub mod models;

pub type DbPool = SqlitePool;

pub async fn init(app: &AppHandle) -> anyhow::Result<DbPool> {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("impossible de résoudre app_data_dir");

    std::fs::create_dir_all(&data_dir)?;

    let db_name = if cfg!(debug_assertions) { "ldc-dev.db" } else { "ldc.db" };
    let db_path = data_dir.join(db_name);
    let db_url = format!("sqlite://{}?mode=rwc", db_path.display());

    // Apply PRAGMAs via connect options so every pool connection gets them,
    // not just the first one (execute(&pool) only touches one connection).
    let options = SqliteConnectOptions::from_str(&db_url)?
        .pragma("foreign_keys", "ON")
        .journal_mode(SqliteJournalMode::Wal);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    sqlx::migrate!("src/db/migrations").run(&pool).await?;

    Ok(pool)
}
