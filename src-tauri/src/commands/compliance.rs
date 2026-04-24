use crate::commands::journal::JournalEntry;
use crate::db::models::session::{Cloture, GrandTotal, Session};
use crate::db::models::transaction::{Payment, Transaction, TransactionLine};
use crate::AppState;
use serde::Serialize;
use tauri::Manager;
use tauri::State;

#[derive(Serialize)]
pub struct TransactionArchive {
    pub transaction: Transaction,
    pub lines: Vec<TransactionLine>,
    pub payments: Vec<Payment>,
}

#[derive(Serialize)]
pub struct SessionArchive {
    pub session: Session,
    pub transactions: Vec<TransactionArchive>,
    pub cloture: Option<Cloture>,
    pub grand_total: Option<GrandTotal>,
}

#[derive(Serialize)]
pub struct ArchiveExport {
    pub exported_at: String,
    pub software: &'static str,
    pub version: &'static str,
    pub sessions: Vec<SessionArchive>,
    pub journal: Vec<JournalEntry>,
}

/// Export complet NF525 : toutes les sessions, transactions, lignes, paiements,
/// clôtures, grands totaux et journal d'événements.
#[tauri::command]
pub async fn export_archive(state: State<'_, AppState>) -> Result<ArchiveExport, String> {
    let pool = state.db.as_ref();

    let sessions = sqlx::query_as::<_, Session>("SELECT * FROM sessions ORDER BY opened_at")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut session_archives = Vec::new();

    for session in sessions {
        let transactions = sqlx::query_as::<_, Transaction>(
            "SELECT * FROM transactions WHERE session_id = ? ORDER BY sequence_no",
        )
        .bind(&session.id)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

        let mut tx_archives = Vec::new();
        for tx in transactions {
            let lines = sqlx::query_as::<_, TransactionLine>(
                "SELECT * FROM transaction_lines WHERE transaction_id = ? ORDER BY line_no",
            )
            .bind(&tx.id)
            .fetch_all(&*pool)
            .await
            .map_err(|e| e.to_string())?;

            let payments = sqlx::query_as::<_, Payment>(
                "SELECT * FROM payments WHERE transaction_id = ?",
            )
            .bind(&tx.id)
            .fetch_all(&*pool)
            .await
            .map_err(|e| e.to_string())?;

            tx_archives.push(TransactionArchive { transaction: tx, lines, payments });
        }

        let cloture = if let Some(ref cloture_id) = session.cloture_id {
            sqlx::query_as::<_, Cloture>("SELECT * FROM clotures WHERE id = ?")
                .bind(cloture_id)
                .fetch_optional(&*pool)
                .await
                .map_err(|e| e.to_string())?
        } else {
            None
        };

        let grand_total = if let Some(ref c) = cloture {
            sqlx::query_as::<_, GrandTotal>("SELECT * FROM grand_totals WHERE cloture_id = ?")
                .bind(&c.id)
                .fetch_optional(&*pool)
                .await
                .map_err(|e| e.to_string())?
        } else {
            None
        };

        session_archives.push(SessionArchive { session, transactions: tx_archives, cloture, grand_total });
    }

    let journal = sqlx::query_as::<_, JournalEntry>(
        "SELECT * FROM journal_entries ORDER BY sequence_no",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(ArchiveExport {
        exported_at: chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
        software: "LDC",
        version: env!("CARGO_PKG_VERSION"),
        sessions: session_archives,
        journal,
    })
}

/// Retourne le chemin absolu vers le fichier SQLite de la base de données.
#[tauri::command]
pub async fn get_db_path(app: tauri::AppHandle) -> Result<String, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("ldc.db");
    Ok(path.to_string_lossy().to_string())
}
