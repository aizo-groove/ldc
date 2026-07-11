use crate::printer::escpos::{build_receipt, build_rapport, build_kitchen};
use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::io::AsyncWriteExt;
use tokio::net::TcpStream;

// ── Input types ───────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ReceiptLine {
    pub product_name:   String,
    pub quantity:       i64,
    pub unit_price_ttc: i64,
    pub line_total_ttc: i64,
    pub tva_rate_pct:   i64,
}

#[derive(Debug, Deserialize)]
pub struct ReceiptTvaGroup {
    pub rate_pct: i64,
    pub tva:      i64,
    pub ht:       i64,
}

#[derive(Debug, Deserialize)]
pub struct ReceiptDoc {
    pub store_name:       String,
    pub sequence_no:      i64,
    pub created_at:       String,
    pub cashier_name:     Option<String>,
    pub lines:            Vec<ReceiptLine>,
    pub total_ht:         i64,
    pub total_ttc:        i64,
    pub discount_ttc:     i64,
    pub payment_method:   String,
    pub payment_amount:   i64,
    pub cash_change:      Option<i64>,
    pub tva_groups:       Vec<ReceiptTvaGroup>,
    pub hash:             String,
    pub is_avoir:         bool,
    pub loyalty_qr:       Option<String>, // base64url-encoded binary QR payload
}

#[derive(Debug, Deserialize)]
pub struct RapportDoc {
    pub store_name:         String,
    pub session_label:      String,
    pub session_date:       String,
    pub nb_transactions:    i64,
    pub net_ttc:            i64,
    pub total_ventes_ttc:   i64,
    pub total_avoirs_ttc:   i64,
    pub pay_cb:             i64,
    pub pay_especes:        i64,
    pub pay_cheque:         i64,
    pub pay_autre:          i64,
    pub tva_550:            i64,
    pub ht_550:             i64,
    pub tva_1000:           i64,
    pub ht_1000:            i64,
    pub tva_2000:           i64,
    pub ht_2000:            i64,
    pub is_z:               bool,
}

#[derive(Debug, Deserialize)]
pub struct KitchenLine {
    pub product_name: String,
    pub quantity:     i64,
}

#[derive(Debug, Deserialize)]
pub struct KitchenDoc {
    pub table_name: String,
    pub covers:     i64,
    pub subtitle:   Option<String>,
    pub lines:      Vec<KitchenLine>,
}

// ── Output type ───────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct PrinterStatus {
    pub connected: bool,
    pub ip:        String,
    pub port:      u16,
}

// ── Helpers ───────────────────────────────────────────────────

async fn get_setting(pool: &sqlx::SqlitePool, key: &str) -> Option<String> {
    sqlx::query_scalar::<_, String>("SELECT value FROM settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
}

fn parse_port(v: Option<String>) -> u16 {
    v.unwrap_or_else(|| "9100".to_string()).parse().unwrap_or(9100)
}

fn paper_mm(v: Option<String>) -> u8 {
    v.unwrap_or_else(|| "80".to_string()).parse().unwrap_or(80)
}

/// Low-level: open a TCP connection to ip:port and write bytes.
async fn connect_and_send(ip: &str, port: u16, bytes: &[u8]) -> Result<(), String> {
    let addr = format!("{}:{}", ip, port);
    let mut stream = TcpStream::connect(&addr)
        .await
        .map_err(|e| format!("Impossible de joindre l'imprimante {} : {}", addr, e))?;
    stream.write_all(bytes).await.map_err(|e| e.to_string())?;
    stream.flush().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ── Printer-table dispatch ────────────────────────────────────

#[derive(sqlx::FromRow)]
struct PrinterRow {
    printer_type: String,
    ip:           Option<String>,
    port:         i64,
    paper_mm:     i64,
}

/// Look up the best printer for a role from the managed `printers` table.
/// Returns None if the table has no matching entry.
async fn get_printer_row(pool: &sqlx::SqlitePool, role: &str) -> Option<PrinterRow> {
    sqlx::query_as::<_, PrinterRow>(
        r#"SELECT printer_type, ip, port, paper_mm FROM printers
           WHERE (roles = ?1 OR roles LIKE ?2 OR roles LIKE ?3 OR roles LIKE ?4)
           ORDER BY sort_order, created_at LIMIT 1"#,
    )
    .bind(role)
    .bind(format!("{},%", role))
    .bind(format!("%,{}", role))
    .bind(format!("%,{},%", role))
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
}

/// Send bytes to the receipt (client-facing) printer.
/// Priority: printers table → legacy settings keys.
async fn send_to_printer(pool: &sqlx::SqlitePool, bytes: Vec<u8>) -> Result<(), String> {
    if let Some(p) = get_printer_row(pool, "receipt").await {
        if p.printer_type == "screen" { return Ok(()); } // frontend handles display
        let ip = p.ip.unwrap_or_default();
        if !ip.is_empty() {
            return connect_and_send(&ip, p.port as u16, &bytes).await;
        }
    }
    // Legacy fallback
    let ip = get_setting(pool, "printer_ip").await.unwrap_or_default();
    if ip.is_empty() {
        return Err("Aucune imprimante configurée. Rendez-vous dans Paramètres → Imprimantes.".to_string());
    }
    let port = parse_port(get_setting(pool, "printer_port").await);
    connect_and_send(&ip, port, &bytes).await
}

/// Send bytes to the kitchen printer.
/// Priority: printers table (kitchen role) → legacy kitchen settings → receipt printer.
async fn send_to_kitchen_printer(pool: &sqlx::SqlitePool, bytes: Vec<u8>) -> Result<(), String> {
    if let Some(p) = get_printer_row(pool, "kitchen").await {
        if p.printer_type == "screen" { return Ok(()); }
        let ip = p.ip.unwrap_or_default();
        if !ip.is_empty() {
            return connect_and_send(&ip, p.port as u16, &bytes).await;
        }
    }
    // Legacy kitchen settings
    let kitchen_ip = get_setting(pool, "kitchen_printer_ip").await.unwrap_or_default();
    if !kitchen_ip.is_empty() {
        let port = parse_port(get_setting(pool, "kitchen_printer_port").await);
        return connect_and_send(&kitchen_ip, port, &bytes).await;
    }
    // Fall back to receipt printer
    send_to_printer(pool, bytes).await
}

// ── Commands ──────────────────────────────────────────────────

#[tauri::command]
pub async fn print_receipt_escpos(
    state: State<'_, AppState>,
    doc: ReceiptDoc,
) -> Result<(), String> {
    let pool = state.db.as_ref();
    let mm = if let Some(p) = get_printer_row(pool, "receipt").await {
        p.paper_mm as u8
    } else {
        paper_mm(get_setting(pool, "printer_paper_mm").await)
    };
    let bytes = build_receipt(&doc, mm);
    send_to_printer(pool, bytes).await
}

#[tauri::command]
pub async fn print_rapport_escpos(
    state: State<'_, AppState>,
    doc: RapportDoc,
) -> Result<(), String> {
    let pool = state.db.as_ref();
    let mm = if let Some(p) = get_printer_row(pool, "receipt").await {
        p.paper_mm as u8
    } else {
        paper_mm(get_setting(pool, "printer_paper_mm").await)
    };
    let bytes = build_rapport(&doc, mm);
    send_to_printer(pool, bytes).await
}

#[tauri::command]
pub async fn print_kitchen_escpos(
    state: State<'_, AppState>,
    doc: KitchenDoc,
) -> Result<(), String> {
    let pool = state.db.as_ref();
    let mm = if let Some(p) = get_printer_row(pool, "kitchen").await {
        p.paper_mm as u8
    } else {
        paper_mm(get_setting(pool, "kitchen_printer_paper_mm").await
            .or(get_setting(pool, "printer_paper_mm").await))
    };
    let bytes = build_kitchen(&doc, mm);
    send_to_kitchen_printer(pool, bytes).await
}

/// Opens the cash drawer via the main printer (ESC/POS ESC p).
/// pin: 0 = connector 2, 1 = connector 5
#[tauri::command]
pub async fn open_cash_drawer(state: State<'_, AppState>, pin: u8) -> Result<(), String> {
    let pool = state.db.as_ref();
    let pin_byte = if pin == 0 { 0x00_u8 } else { 0x01_u8 };
    let bytes = vec![0x1B, 0x70, pin_byte, 0x3C, 0xFF];
    send_to_printer(pool, bytes).await
}

/// Connectivity test for the main (client) printer.
#[tauri::command]
pub async fn test_printer(state: State<'_, AppState>) -> Result<PrinterStatus, String> {
    let pool = state.db.as_ref();
    let ip   = get_setting(pool, "printer_ip").await.unwrap_or_default();
    let port = parse_port(get_setting(pool, "printer_port").await);

    if ip.is_empty() {
        return Ok(PrinterStatus { connected: false, ip, port });
    }

    let test_bytes = vec![
        0x1B, 0x40_u8,             // ESC @ init
        b'T', b'e', b's', b't',    // "Test"
        0x0A, 0x0A, 0x0A, 0x0A,   // 4 line feeds
        0x1D, 0x56, 0x42, 0x03,   // partial cut
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

/// Connectivity test for the kitchen printer.
/// Returns the kitchen printer settings, or main printer settings if no kitchen IP is set.
#[tauri::command]
pub async fn test_kitchen_printer(state: State<'_, AppState>) -> Result<PrinterStatus, String> {
    let pool = state.db.as_ref();
    let ip   = get_setting(pool, "kitchen_printer_ip").await.unwrap_or_default();
    let port = parse_port(get_setting(pool, "kitchen_printer_port").await);

    if ip.is_empty() {
        return Ok(PrinterStatus { connected: false, ip, port });
    }

    let test_bytes = vec![
        0x1B, 0x40_u8,
        b'C', b'u', b'i', b's', b'i', b'n', b'e',
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
