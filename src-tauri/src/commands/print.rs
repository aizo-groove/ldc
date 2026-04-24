use crate::printer::escpos::{build_receipt, build_rapport};
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

async fn send_to_printer(pool: &sqlx::SqlitePool, bytes: Vec<u8>) -> Result<(), String> {
    let ip = get_setting(pool, "printer_ip").await.unwrap_or_default();
    if ip.is_empty() {
        return Err("Aucune imprimante configurée. Rendez-vous dans Paramètres → Imprimante.".to_string());
    }
    let port: u16 = get_setting(pool, "printer_port")
        .await
        .unwrap_or_else(|| "9100".to_string())
        .parse()
        .unwrap_or(9100);

    let addr = format!("{}:{}", ip, port);
    let mut stream = TcpStream::connect(&addr)
        .await
        .map_err(|e| format!("Impossible de joindre l'imprimante {} : {}", addr, e))?;

    stream.write_all(&bytes).await.map_err(|e| e.to_string())?;
    stream.flush().await.map_err(|e| e.to_string())?;
    Ok(())
}

fn paper_mm(pool_mm: Option<String>) -> u8 {
    pool_mm
        .unwrap_or_else(|| "80".to_string())
        .parse()
        .unwrap_or(80)
}

// ── Commands ──────────────────────────────────────────────────

#[tauri::command]
pub async fn print_receipt_escpos(
    state: State<'_, AppState>,
    doc: ReceiptDoc,
) -> Result<(), String> {
    let pool = state.db.as_ref();
    let mm   = paper_mm(get_setting(pool, "printer_width").await);
    let bytes = build_receipt(&doc, mm);
    send_to_printer(pool, bytes).await
}

#[tauri::command]
pub async fn print_rapport_escpos(
    state: State<'_, AppState>,
    doc: RapportDoc,
) -> Result<(), String> {
    let pool = state.db.as_ref();
    let mm   = paper_mm(get_setting(pool, "printer_width").await);
    let bytes = build_rapport(&doc, mm);
    send_to_printer(pool, bytes).await
}

/// Ouvre le tiroir-caisse via l'imprimante (commande ESC/POS ESC p).
/// pin: 0 = connecteur 2, 1 = connecteur 5
#[tauri::command]
pub async fn open_cash_drawer(state: State<'_, AppState>, pin: u8) -> Result<(), String> {
    let pool = state.db.as_ref();
    let pin_byte = if pin == 0 { 0x00_u8 } else { 0x01_u8 };
    let bytes = vec![0x1B, 0x70, pin_byte, 0x3C, 0xFF];
    send_to_printer(pool, bytes).await
}

/// Test de connexion : envoie juste un init + coupe.
#[tauri::command]
pub async fn test_printer(state: State<'_, AppState>) -> Result<PrinterStatus, String> {
    let pool = state.db.as_ref();
    let ip   = get_setting(pool, "printer_ip").await.unwrap_or_default();
    let port: u16 = get_setting(pool, "printer_port")
        .await
        .unwrap_or_else(|| "9100".to_string())
        .parse()
        .unwrap_or(9100);

    if ip.is_empty() {
        return Ok(PrinterStatus { connected: false, ip, port });
    }

    let addr = format!("{}:{}", ip, port);
    let test = vec![
        0x1B, 0x40_u8,             // ESC @ init
        b'T', b'e', b's', b't',    // "Test"
        0x0A, 0x0A, 0x0A, 0x0A,   // 4 line feeds
        0x1D, 0x56, 0x42, 0x03,   // partial cut
    ];

    match TcpStream::connect(&addr).await {
        Ok(mut stream) => {
            let _ = stream.write_all(&test).await;
            let _ = stream.flush().await;
            Ok(PrinterStatus { connected: true, ip, port })
        }
        Err(_) => Ok(PrinterStatus { connected: false, ip, port }),
    }
}
