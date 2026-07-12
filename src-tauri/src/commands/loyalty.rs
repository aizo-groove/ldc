use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;
use base64::Engine as _;
use aes_gcm::{Aes256Gcm, KeyInit, aead::{Aead, AeadCore, OsRng}};
use flate2::{write::DeflateEncoder, Compression};
use std::io::Write;

// Default Fido API base URL — injected at build time via FIDO_API_URL env var (CI secret).
// Falls back to empty string; user must configure the URL in Settings → Intégrations → Fido.
const FIDO_API_URL: &str = match option_env!("FIDO_API_URL") {
    Some(url) => url,
    None => "",
};

// ── Models ─────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoyaltyConfig {
    pub fido_mid:            Option<String>,  // UUID merchants.id — identifiant marchand
    pub fido_partner_id:     Option<String>,  // credential de provisioning — 32 hex chars → 16 bytes QR header
    pub fido_partner_secret: Option<String>,  // clé AES-GCM (hex) pour chiffrer le payload QR
    pub fido_api_url:        Option<String>,
    pub fido_enabled:        bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoyaltyProgram {
    pub id: String,
    pub mid: String,
    pub name: String,
    #[serde(rename = "type")]
    pub program_type: String,
    pub status: String,
    pub config: serde_json::Value,
    pub synced_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct LoyaltyProgramInput {
    pub name: String,
    #[serde(rename = "type")]
    pub program_type: String,
    pub config: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct FidoTokenResponse {
    access_token: String,
}

// ── Helpers ────────────────────────────────────────────────────────────────

async fn kv_get(pool: &sqlx::SqlitePool, key: &str) -> Option<String> {
    sqlx::query_scalar::<_, String>("SELECT value FROM loyalty_config WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
        .filter(|v| !v.is_empty())
}

async fn kv_set(pool: &sqlx::SqlitePool, key: &str, value: &str) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO loyalty_config (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await
    .map(|_| ())
    .map_err(|e| e.to_string())
}

fn api_base(config: &LoyaltyConfig) -> String {
    normalize_base_url(
        config.fido_api_url.as_deref()
            .filter(|s| !s.is_empty())
            .unwrap_or(FIDO_API_URL)
    )
}

fn normalize_base_url(url: &str) -> String {
    url.trim_end_matches('/')
        .strip_suffix("/auth-token")
        .unwrap_or(url.trim_end_matches('/'))
        .trim_end_matches('/')
        .to_string()
}

/// If `s` is a 32-char hex string (UUID without hyphens), reformat it as a standard UUID.
fn normalize_uuid(s: &str) -> String {
    let s = s.trim();
    if s.len() == 32 && s.chars().all(|c| c.is_ascii_hexdigit()) {
        format!("{}-{}-{}-{}-{}", &s[0..8], &s[8..12], &s[12..16], &s[16..20], &s[20..32])
    } else {
        s.to_string()
    }
}

async fn fetch_token(base: &str, mid: &str, partner_secret: &str) -> Result<String, String> {
    let mid = normalize_uuid(mid.trim());
    let partner_secret = partner_secret.trim();
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/auth-token", base))
        .json(&serde_json::json!({
            "mid": mid,
            "partner_secret": partner_secret
        }))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Connexion impossible : {}", e))?;

    if !res.status().is_success() {
        let code = res.status().as_u16();
        let body = res.text().await.unwrap_or_default();
        let mid_hint = format!("{}…({}c)", &mid[..mid.len().min(8)], mid.len());
        let sec_hint = format!("secret={}c", partner_secret.len());
        return Err(format!("Erreur Fido {} : {} [mid: {}, {}]", code, body, mid_hint, sec_hint));
    }

    let data: FidoTokenResponse = res
        .json()
        .await
        .map_err(|e| format!("Réponse inattendue : {}", e))?;

    Ok(data.access_token)
}

/// Fetch active program from Fido API. Returns the raw JSON response on success.
async fn fetch_program_from_api(base: &str, mid: &str) -> Result<Option<serde_json::Value>, String> {
    let mid = normalize_uuid(mid);
    let client = reqwest::Client::new();
    let url = format!("{}/loyalty-programs?mid={}&status=active", base, mid);
    let res = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map_err(|e| format!("réseau: {}", e))?;

    let status = res.status();
    if status.as_u16() == 404 { return Ok(None); }

    let body = res.text().await.unwrap_or_default();

    if status.is_success() {
        serde_json::from_str(&body)
            .map(Some)
            .map_err(|e| format!("JSON invalide: {} — body: {}", e, &body[..body.len().min(200)]))
    } else {
        Err(format!("HTTP {} — {}", status, &body[..body.len().min(200)]))
    }
}

/// Compute loyalty units earned for this transaction.
/// Handles both spec key names (from API) and our local schema key names.
fn compute_earned(prog_type: &str, config: &serde_json::Value, total_cents: i64) -> i64 {
    match prog_type {
        "points" => {
            let ppe = config.get("points_per_euro").and_then(|v| v.as_i64()).unwrap_or(1);
            (total_cents / 100) * ppe
        }
        "tiers" => {
            let xpe = config.get("xp_per_euro").and_then(|v| v.as_i64()).unwrap_or(1);
            (total_cents / 100) * xpe
        }
        "stamps" => {
            // spec: min_amount_centimes — local schema: minimum_spend_cents
            let min = config.get("min_amount_centimes")
                .or_else(|| config.get("minimum_spend_cents"))
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            if total_cents >= min { 1 } else { 0 }
        }
        "cashback" => {
            // spec: cashback_rate as float (0.05) — local schema: cashback_rate_pct as int (5)
            if let Some(rate) = config.get("cashback_rate").and_then(|v| v.as_f64()) {
                (total_cents as f64 * rate) as i64
            } else {
                let pct = config.get("cashback_rate_pct").and_then(|v| v.as_i64()).unwrap_or(0);
                total_cents * pct / 10000
            }
        }
        "visits" => 1,
        _ => 0,
    }
}

// ── Commands ───────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_loyalty_config(state: State<'_, AppState>) -> Result<LoyaltyConfig, String> {
    let pool = &*state.db;
    Ok(LoyaltyConfig {
        fido_mid:            kv_get(pool, "fido_mid").await,
        fido_partner_id:     kv_get(pool, "fido_partner_id").await,
        fido_partner_secret: kv_get(pool, "fido_partner_secret").await,
        fido_api_url:        kv_get(pool, "fido_api_url").await,
        fido_enabled:        kv_get(pool, "fido_enabled").await
                               .map(|v| v == "true")
                               .unwrap_or(false),
    })
}

#[tauri::command]
pub async fn save_loyalty_config(
    state: State<'_, AppState>,
    config: LoyaltyConfig,
) -> Result<(), String> {
    let pool = &*state.db;
    kv_set(pool, "fido_mid",            config.fido_mid.as_deref().unwrap_or("")).await?;
    kv_set(pool, "fido_partner_id",     config.fido_partner_id.as_deref().unwrap_or("")).await?;
    kv_set(pool, "fido_partner_secret", config.fido_partner_secret.as_deref().unwrap_or("")).await?;
    kv_set(pool, "fido_api_url",        config.fido_api_url.as_deref().unwrap_or("")).await?;
    kv_set(pool, "fido_enabled",        if config.fido_enabled { "true" } else { "false" }).await?;
    Ok(())
}

#[tauri::command]
pub async fn test_loyalty_connection(state: State<'_, AppState>) -> Result<(), String> {
    let config = get_loyalty_config(state).await?;

    let mid = config
        .fido_mid
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or("MID manquant")?
        .to_string();

    let partner_secret = config
        .fido_partner_secret
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or("Clé partenaire manquante")?
        .to_string();

    let base = api_base(&config);
    if base.is_empty() {
        return Err("URL API Fido non configurée — renseignez l'URL dans les paramètres Fido.".to_string());
    }
    fetch_token(&base, &mid, &partner_secret).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_cached_program(
    state: State<'_, AppState>,
) -> Result<Option<LoyaltyProgram>, String> {
    let row = sqlx::query_as::<_, (String, String, String, String, String, String, Option<String>, String, String)>(
        "SELECT id, mid, name, type, status, config, synced_at, created_at, updated_at
         FROM loyalty_programs WHERE status != 'archived' ORDER BY updated_at DESC LIMIT 1",
    )
    .fetch_optional(&*state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(row.map(|(id, mid, name, t, status, config_str, synced_at, created_at, updated_at)| {
        LoyaltyProgram {
            id,
            mid,
            name,
            program_type: t,
            status,
            config: serde_json::from_str(&config_str).unwrap_or(serde_json::Value::Object(Default::default())),
            synced_at,
            created_at,
            updated_at,
        }
    }))
}

#[tauri::command]
pub async fn delete_local_program(state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query("DELETE FROM loyalty_programs")
        .execute(&*state.db)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_loyalty_program(
    state: State<'_, AppState>,
    program: LoyaltyProgramInput,
) -> Result<LoyaltyProgram, String> {
    let pool = &*state.db;
    let config = LoyaltyConfig {
        fido_mid:            kv_get(pool, "fido_mid").await,
        fido_partner_id:     kv_get(pool, "fido_partner_id").await,
        fido_partner_secret: kv_get(pool, "fido_partner_secret").await,
        fido_api_url:        kv_get(pool, "fido_api_url").await,
        fido_enabled:        kv_get(pool, "fido_enabled").await.map(|v| v == "true").unwrap_or(false),
    };

    let mid = config.fido_mid.as_deref().unwrap_or("").to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let config_str = serde_json::to_string(&program.config).map_err(|e| e.to_string())?;

    let existing_id: Option<String> =
        sqlx::query_scalar("SELECT id FROM loyalty_programs LIMIT 1")
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

    let id = if let Some(eid) = existing_id {
        sqlx::query(
            "UPDATE loyalty_programs SET name=?, type=?, config=?, status='draft', updated_at=? WHERE id=?",
        )
        .bind(&program.name)
        .bind(&program.program_type)
        .bind(&config_str)
        .bind(&now)
        .bind(&eid)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
        eid
    } else {
        let new_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO loyalty_programs (id, mid, name, type, status, config, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)",
        )
        .bind(&new_id)
        .bind(&mid)
        .bind(&program.name)
        .bind(&program.program_type)
        .bind(&config_str)
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
        new_id
    };

    match try_sync_program(pool, &config, &id, &mid, &program).await {
        Ok(Some(ref ts)) => {
            sqlx::query("UPDATE loyalty_programs SET status='active', synced_at=? WHERE id=?")
                .bind(ts)
                .bind(&id)
                .execute(pool)
                .await
                .ok();
        }
        Ok(None) => {}
        Err(e) => return Err(e), // credentials/network error — local save succeeded, surface to UI
    }

    sqlx::query_as::<_, (String, String, String, String, String, String, Option<String>, String, String)>(
        "SELECT id, mid, name, type, status, config, synced_at, created_at, updated_at
         FROM loyalty_programs WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(pool)
    .await
    .map(|(id, mid, name, t, status, cfg, synced_at, created_at, updated_at)| LoyaltyProgram {
        id, mid, name,
        program_type: t,
        status,
        config: serde_json::from_str(&cfg).unwrap_or_default(),
        synced_at,
        created_at,
        updated_at,
    })
    .map_err(|e| e.to_string())
}

async fn try_sync_program(
    _pool: &sqlx::SqlitePool,
    config: &LoyaltyConfig,
    prog_id: &str,
    mid: &str,
    program: &LoyaltyProgramInput,
) -> Result<Option<String>, String> {
    let partner_secret = match config.fido_partner_secret.as_deref().filter(|s| !s.is_empty()) {
        Some(s) => s,
        None => return Ok(None),
    };
    let base = api_base(config);
    if base.is_empty() {
        return Err("URL API Fido non configurée — renseignez l'URL dans les paramètres Fido.".to_string());
    }

    let token = fetch_token(&base, mid, partner_secret).await?;

    let client = reqwest::Client::new();
    let res = client
        .put(format!("{}/loyalty-programs/{}", base, prog_id))
        .bearer_auth(&token)
        .json(&serde_json::json!({
            "name": program.name,
            "type": program.program_type,
            "config": program.config,
            "status": "active"
        }))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Connexion impossible : {}", e))?;

    if res.status().is_success() {
        Ok(Some(chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()))
    } else {
        let code = res.status().as_u16();
        let body = res.text().await.unwrap_or_default();
        Err(format!("Erreur Fido {} : {}", code, body))
    }
}

// ── QR generation & RCT validation ────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct LoyaltyQrResult {
    pub payload_b64url: String,
    pub prog_id:        String,
    pub prog_type:      String,
    pub earned:         i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RctInfo {
    pub reward_type:  String,
    pub reward_value: i64,
    pub prog_id:      String,
    pub cid:          String,
    pub tid:          String,
    pub expires_at:   String,
}

/// Line item passed from the frontend when generating a QR.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QrLineItem {
    pub name:             String,
    pub quantity:         i64,
    pub unit_price_cents: i64,
}

#[tauri::command]
pub async fn generate_loyalty_qr(
    state: State<'_, AppState>,
    transaction_id: String,
    total_cents: i64,
    tax_cents: i64,
    items: Vec<QrLineItem>,
) -> Result<Option<LoyaltyQrResult>, String> {
    let pool = &*state.db;

    let enabled = kv_get(pool, "fido_enabled").await.map(|v| v == "true").unwrap_or(false);
    if !enabled { return Ok(None); }

    let mid            = match kv_get(pool, "fido_mid").await.filter(|s| !s.is_empty())            { Some(v) => v, None => return Ok(None) };
    let partner_secret = match kv_get(pool, "fido_partner_secret").await.filter(|s| !s.is_empty()) { Some(v) => v, None => return Ok(None) };
    // partner_id = credential de provisioning Fido (randomBytes(16).toString("hex"), 32 chars hex)
    // Distinct de fido_mid qui est l'UUID merchants.id — ne pas les confondre.
    let partner_id     = match kv_get(pool, "fido_partner_id").await.filter(|s| !s.is_empty())     { Some(v) => v, None => return Ok(None) };

    let base = kv_get(pool, "fido_api_url").await
        .filter(|s| !s.is_empty())
        .map(|s| normalize_base_url(&s))
        .unwrap_or_else(|| FIDO_API_URL.to_string());

    // Fetch program directly — no auth needed on GET /loyalty-programs
    let api_result: Result<Option<(String, String, serde_json::Value)>, String> =
        match fetch_program_from_api(&base, &mid).await {
            Err(e) => Err(e),
            Ok(None) => Ok(None),
            Ok(Some(body)) => {
                // API may return a single object or an array — handle both
                let prog = if body.is_array() {
                    body.as_array().and_then(|arr| arr.first()).cloned()
                } else {
                    Some(body)
                };

                match prog {
                    None => Ok(None),
                    Some(p) => {
                        let id    = p.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                        let ptype = p.get("type").and_then(|v| v.as_str()).unwrap_or("points").to_string();
                        let cfg   = p.get("config").cloned().unwrap_or_default();
                        if id.is_empty() {
                            return Err(format!("Programme sans id — réponse API: {:?}", p));
                        }
                        let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
                        let cfg_str = serde_json::to_string(&cfg).unwrap_or_default();
                        let _ = sqlx::query(
                            "INSERT INTO loyalty_programs
                                 (id, mid, name, type, status, config, synced_at, created_at, updated_at)
                             VALUES (?, ?, '', ?, 'active', ?, ?, ?, ?)
                             ON CONFLICT(id) DO UPDATE SET
                                 type=excluded.type, config=excluded.config,
                                 status='active', synced_at=excluded.synced_at,
                                 updated_at=excluded.updated_at",
                        )
                        .bind(&id).bind(&mid).bind(&ptype).bind(&cfg_str)
                        .bind(&now).bind(&now).bind(&now)
                        .execute(pool).await;
                        Ok(Some((id, ptype, cfg)))
                    }
                }
            }
        };

    let (prog_id, prog_type, prog_config, tentative) = match api_result {
        Ok(Some((id, ptype, cfg))) => (id, ptype, cfg, false),
        Err(api_err) => {
            // API call failed — surface the real error (no silent fallback)
            return Err(format!("Fido API: {}", api_err));
        }
        Ok(None) => {
            // Authenticated but no active program on server — try local cache
            let row = sqlx::query_as::<_, (String, String, String)>(
                "SELECT id, type, config FROM loyalty_programs
                 WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1",
            )
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

            match row {
                Some((id, t, cfg_str)) => {
                    let cfg = serde_json::from_str(&cfg_str).unwrap_or_default();
                    (id, t, cfg, true)
                }
                None => return Ok(None),
            }
        }
    };

    let earned = compute_earned(&prog_type, &prog_config, total_cents);

    // ── Build compact JSON payload (spec v1.1) ─────────────────────────────
    let ts = chrono::Utc::now().timestamp();
    let payload = serde_json::json!({
        "tx_id": transaction_id,
        "mid":   mid,
        "ts":    ts,
        "total": total_cents,
        "tax":   tax_cents,
        "items": items.iter().map(|i| serde_json::json!({
            "n": i.name,
            "q": i.quantity,
            "p": i.unit_price_cents,
        })).collect::<Vec<_>>(),
        "loyalty": {
            "prog_id":   prog_id,
            "type":      prog_type,
            "earned":    earned,
            "tentative": tentative,
        },
    });

    // Compact serialisation — no extra whitespace
    let json_bytes = serde_json::to_vec(&payload).map_err(|e| e.to_string())?;

    // ── Step 1: zlib DEFLATE raw, level 6 ─────────────────────────────────
    let mut enc = DeflateEncoder::new(Vec::new(), Compression::new(6));
    enc.write_all(&json_bytes).map_err(|e| e.to_string())?;
    let compressed = enc.finish().map_err(|e| e.to_string())?;

    // ── Step 2: AES-256-GCM, key = hex-decode(partner_secret) ─────────────
    let key_bytes = hex::decode(&partner_secret)
        .map_err(|_| "partner_secret invalide — 64 caractères hex attendus".to_string())?;
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| e.to_string())?;
    let iv = Aes256Gcm::generate_nonce(&mut OsRng); // fresh 12-byte IV every call
    let ciphertext = cipher.encrypt(&iv, compressed.as_ref())
        .map_err(|e| e.to_string())?;

    // ── Step 3: binary frame [partner_id 16B][IV 12B][ciphertext+tag] ─────
    let pid_bytes = hex::decode(&partner_id)
        .map_err(|_| "partner_id invalide — 32 caractères hex attendus".to_string())?;
    let mut frame = pid_bytes;           // 16 bytes
    frame.extend_from_slice(&iv);        // 12 bytes
    frame.extend_from_slice(&ciphertext); // N + 16 bytes GCM tag

    // base64url for transport in the Tauri response; ESC/POS builder decodes back to raw bytes
    let payload_b64url = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&frame);

    Ok(Some(LoyaltyQrResult { payload_b64url, prog_id, prog_type, earned }))
}

#[tauri::command]
pub async fn validate_rct_local(
    state: State<'_, AppState>,
    rct_raw: String,
) -> Result<RctInfo, String> {
    // RCT format: base64url(JSON)
    let json_bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(rct_raw.trim())
        .map_err(|_| "QR invalide : encodage incorrect")?;

    let rct: serde_json::Value = serde_json::from_slice(&json_bytes)
        .map_err(|_| "QR invalide : JSON malformé")?;

    let tid          = rct.get("tid").and_then(|v| v.as_str()).ok_or("Champ tid manquant")?.to_string();
    let cid          = rct.get("cid").and_then(|v| v.as_str()).ok_or("Champ cid manquant")?.to_string();
    let prog_id      = rct.get("prog_id").and_then(|v| v.as_str()).ok_or("Champ prog_id manquant")?.to_string();
    let expires_at   = rct.get("expires_at").and_then(|v| v.as_str()).ok_or("Champ expires_at manquant")?.to_string();
    let reward_type  = rct.get("reward_type").and_then(|v| v.as_str()).ok_or("Champ reward_type manquant")?.to_string();
    let reward_value = rct.get("reward_value").and_then(|v| v.as_i64()).ok_or("Champ reward_value manquant")?;

    let exp = chrono::DateTime::parse_from_rfc3339(&expires_at)
        .map_err(|_| "Format expires_at invalide")?;
    if exp < chrono::Utc::now() {
        return Err("Ce bon de récompense a expiré".to_string());
    }

    let pool = &*state.db;
    let nonce = rct.get("nonce").and_then(|v| v.as_str()).unwrap_or(&tid);
    let exists: Option<String> = sqlx::query_scalar(
        "SELECT nonce FROM loyalty_nonces WHERE nonce = ?",
    )
    .bind(nonce)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;
    if exists.is_some() {
        return Err("Ce bon a déjà été utilisé".to_string());
    }

    Ok(RctInfo { reward_type, reward_value, prog_id, cid, tid, expires_at })
}

#[tauri::command]
pub async fn consume_rct_local(
    state: State<'_, AppState>,
    rct_info: RctInfo,
) -> Result<(), String> {
    let pool = &*state.db;
    let now  = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let id   = uuid::Uuid::new_v4().to_string();

    sqlx::query("INSERT OR IGNORE INTO loyalty_nonces (nonce, created_at) VALUES (?, ?)")
        .bind(&rct_info.tid)
        .bind(&now)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO loyalty_redemption_queue
         (id, prog_id, cid, reward_type, reward_value, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)",
    )
    .bind(&id)
    .bind(&rct_info.prog_id)
    .bind(&rct_info.cid)
    .bind(&rct_info.reward_type)
    .bind(rct_info.reward_value)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
