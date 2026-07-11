use crate::db::models::{Printer, PrinterInput};
use crate::commands::print::PrinterStatus;
use crate::AppState;
use tauri::State;
use tokio::io::AsyncWriteExt;
use tokio::net::TcpStream;

#[tauri::command]
pub async fn list_printers(state: State<'_, AppState>) -> Result<Vec<Printer>, String> {
    sqlx::query_as::<_, Printer>(
        "SELECT * FROM printers ORDER BY sort_order, created_at",
    )
    .fetch_all(&*state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_printer(
    state: State<'_, AppState>,
    input: PrinterInput,
) -> Result<Printer, String> {
    let pool = state.db.as_ref();
    let id  = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    sqlx::query(
        "INSERT INTO printers (id, name, printer_type, ip, port, paper_mm, roles, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&input.name)
    .bind(&input.printer_type)
    .bind(&input.ip)
    .bind(input.port)
    .bind(input.paper_mm)
    .bind(&input.roles)
    .bind(&now)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Printer>("SELECT * FROM printers WHERE id = ?")
        .bind(&id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_printer(
    state: State<'_, AppState>,
    id: String,
    input: PrinterInput,
) -> Result<Printer, String> {
    let pool = state.db.as_ref();

    sqlx::query(
        "UPDATE printers
         SET name = ?, printer_type = ?, ip = ?, port = ?, paper_mm = ?, roles = ?
         WHERE id = ?",
    )
    .bind(&input.name)
    .bind(&input.printer_type)
    .bind(&input.ip)
    .bind(input.port)
    .bind(input.paper_mm)
    .bind(&input.roles)
    .bind(&id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Printer>("SELECT * FROM printers WHERE id = ?")
        .bind(&id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_printer(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM printers WHERE id = ?")
        .bind(&id)
        .execute(&*state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn test_printer_by_id(
    state: State<'_, AppState>,
    id: String,
) -> Result<PrinterStatus, String> {
    let pool = state.db.as_ref();

    let printer = sqlx::query_as::<_, Printer>("SELECT * FROM printers WHERE id = ?")
        .bind(&id)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let Some(p) = printer else {
        return Err("Imprimante introuvable".to_string());
    };

    let ip = p.ip.unwrap_or_default();
    if ip.is_empty() || p.printer_type != "thermal_tcp" {
        return Ok(PrinterStatus { connected: false, ip: String::new(), port: 0 });
    }

    let port = p.port as u16;
    let test_bytes: Vec<u8> = vec![
        0x1B, 0x40,
        b'T', b'e', b's', b't',
        0x0A, 0x0A, 0x0A, 0x0A,
        0x1D, 0x56, 0x42, 0x03,
    ];

    match TcpStream::connect(format!("{}:{}", ip, port)).await {
        Ok(mut stream) => {
            let _ = stream.write_all(&test_bytes).await;
            let _ = stream.flush().await;
            Ok(PrinterStatus { connected: true, ip, port })
        }
        Err(_) => Ok(PrinterStatus { connected: false, ip, port }),
    }
}
