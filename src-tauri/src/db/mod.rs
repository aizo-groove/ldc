use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use tauri::{AppHandle, Manager};

pub mod models;

pub type DbPool = SqlitePool;

/// Initialise la base de données SQLite et applique les migrations.
/// Le fichier est créé dans le répertoire de données de l'application.
pub async fn init(app: &AppHandle) -> anyhow::Result<DbPool> {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("impossible de résoudre app_data_dir");

    std::fs::create_dir_all(&data_dir)?;

    let db_path = data_dir.join("ldc.db");
    let db_url = format!("sqlite://{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    // Active les foreign keys (désactivées par défaut dans SQLite)
    sqlx::query("PRAGMA foreign_keys = ON;")
        .execute(&pool)
        .await?;

    // Active le WAL pour de meilleures performances en lecture concurrente
    sqlx::query("PRAGMA journal_mode = WAL;")
        .execute(&pool)
        .await?;

    // Applique les migrations dans l'ordre
    sqlx::migrate!("src/db/migrations").run(&pool).await?;

    Ok(pool)
}
