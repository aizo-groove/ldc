use crate::db::models::transaction::{
    CartLineInput, Payment, PaymentInput, Transaction, TransactionFull, TransactionLine,
};
use crate::nf525::chain::hash_transaction;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_transaction(
    state: State<'_, AppState>,
    session_id: String,
    transaction_type: String,
    lines: Vec<CartLineInput>,
    payments: Vec<PaymentInput>,
    discount_ttc: i64,
    ref_transaction_id: Option<String>,
) -> Result<TransactionFull, String> {
    let pool = state.db.as_ref();

    // -- Calcul des totaux --
    let total_ht: i64 = lines
        .iter()
        .map(|l| l.unit_price_ht * l.quantity.abs() - l.discount_ttc)
        .sum::<i64>()
        - discount_ttc;

    let total_ttc: i64 = lines
        .iter()
        .map(|l| l.unit_price_ttc * l.quantity.abs() - l.discount_ttc)
        .sum::<i64>()
        - discount_ttc;

    let total_tva = total_ttc - total_ht;

    // -- Séquence NF525 --
    let sequence_no: i64 = sqlx::query_scalar::<_, i64>(
        "SELECT COALESCE(MAX(sequence_no), 0) + 1 FROM transactions",
    )
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let previous_hash: Option<String> = sqlx::query_scalar::<_, String>(
        "SELECT hash FROM transactions ORDER BY sequence_no DESC LIMIT 1",
    )
    .fetch_optional(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let created_at = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    let prev = previous_hash.as_deref().unwrap_or("GENESIS");
    let hash = hash_transaction(sequence_no, &transaction_type, total_ttc, &created_at, prev);

    // -- Insertion transaction --
    let tx_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO transactions
           (id, session_id, sequence_no, type, ref_transaction_id,
            total_ht, total_tva, total_ttc, discount_ttc,
            previous_hash, hash, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&tx_id)
    .bind(&session_id)
    .bind(sequence_no)
    .bind(&transaction_type)
    .bind(&ref_transaction_id)
    .bind(total_ht)
    .bind(total_tva)
    .bind(total_ttc)
    .bind(discount_ttc)
    .bind(&previous_hash)
    .bind(&hash)
    .bind(&created_at)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    // -- Vérification des stocks avant insertion --
    if transaction_type == "VENTE" {
        for line in &lines {
            if let Some(ref product_id) = line.product_id {
                let row: Option<(i64, Option<i64>)> = sqlx::query_as(
                    "SELECT track_stock, stock_qty FROM products WHERE id = ?",
                )
                .bind(product_id)
                .fetch_optional(&*pool)
                .await
                .map_err(|e| e.to_string())?;

                if let Some((1, stock)) = row {
                    let available = stock.unwrap_or(0);
                    if available < line.quantity {
                        return Err(format!(
                            "Stock insuffisant pour « {} » : {} disponible(s), {} demandé(s).",
                            line.product_name, available, line.quantity
                        ));
                    }
                }
            }
        }
    }

    // -- Insertion des lignes --
    let mut inserted_lines = Vec::new();
    for (i, line) in lines.iter().enumerate() {
        let line_total_ht = line.unit_price_ht * line.quantity.abs() - line.discount_ttc;
        let line_total_ttc = line.unit_price_ttc * line.quantity.abs() - line.discount_ttc;
        let line_total_tva = line_total_ttc - line_total_ht;
        let line_id = uuid::Uuid::new_v4().to_string();
        let line_no = (i + 1) as i64;

        sqlx::query(
            r#"INSERT INTO transaction_lines
               (id, transaction_id, line_no, product_id, product_name, product_sku,
                quantity, unit_price_ttc, unit_price_ht, tva_rate_pct, discount_ttc,
                line_total_ht, line_total_tva, line_total_ttc)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
        )
        .bind(&line_id)
        .bind(&tx_id)
        .bind(line_no)
        .bind(&line.product_id)
        .bind(&line.product_name)
        .bind(&line.product_sku)
        .bind(line.quantity)
        .bind(line.unit_price_ttc)
        .bind(line.unit_price_ht)
        .bind(line.tva_rate_pct)
        .bind(line.discount_ttc)
        .bind(line_total_ht)
        .bind(line_total_tva)
        .bind(line_total_ttc)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

        inserted_lines.push(TransactionLine {
            id: line_id,
            transaction_id: tx_id.clone(),
            line_no,
            product_id: line.product_id.clone(),
            product_name: line.product_name.clone(),
            product_sku: line.product_sku.clone(),
            quantity: line.quantity,
            unit_price_ttc: line.unit_price_ttc,
            unit_price_ht: line.unit_price_ht,
            tva_rate_pct: line.tva_rate_pct,
            discount_ttc: line.discount_ttc,
            line_total_ht,
            line_total_tva,
            line_total_ttc,
        });
    }

    // -- Mise à jour du stock (produits avec track_stock = 1) --
    for line in &lines {
        if let Some(ref product_id) = line.product_id {
            let delta = if transaction_type == "AVOIR" { line.quantity } else { -line.quantity };
            sqlx::query(
                "UPDATE products SET stock_qty = stock_qty + ?, updated_at = ? WHERE id = ? AND track_stock = 1",
            )
            .bind(delta)
            .bind(&created_at)
            .bind(product_id)
            .execute(&*pool)
            .await
            .map_err(|e| e.to_string())?;
        }
    }

    // -- Insertion des paiements --
    let mut inserted_payments = Vec::new();
    for pay in &payments {
        let pay_id = uuid::Uuid::new_v4().to_string();
        let cash_change = pay.cash_given.map(|given| given - pay.amount);

        sqlx::query(
            r#"INSERT INTO payments
               (id, transaction_id, method, amount, cash_given, cash_change, reference)
               VALUES (?, ?, ?, ?, ?, ?, ?)"#,
        )
        .bind(&pay_id)
        .bind(&tx_id)
        .bind(&pay.method)
        .bind(pay.amount)
        .bind(pay.cash_given)
        .bind(cash_change)
        .bind(&pay.reference)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

        inserted_payments.push(Payment {
            id: pay_id,
            transaction_id: tx_id.clone(),
            method: pay.method.clone(),
            amount: pay.amount,
            cash_given: pay.cash_given,
            cash_change,
            reference: pay.reference.clone(),
            created_at: created_at.clone(),
        });
    }

    // -- Journal --
    sqlx::query(
        r#"INSERT INTO journal_entries
           (sequence_no, event_type, entity_type, entity_id, payload)
           VALUES (
               (SELECT COALESCE(MAX(sequence_no), 0) + 1 FROM journal_entries),
               'TRANSACTION_CREATED', 'transaction', ?,
               json_object('sequence_no', ?, 'type', ?, 'total_ttc', ?)
           )"#,
    )
    .bind(&tx_id)
    .bind(sequence_no)
    .bind(&transaction_type)
    .bind(total_ttc)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let transaction = sqlx::query_as::<_, Transaction>("SELECT * FROM transactions WHERE id = ?")
        .bind(&tx_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(TransactionFull {
        transaction,
        lines: inserted_lines,
        payments: inserted_payments,
    })
}

#[tauri::command]
pub async fn get_transaction(
    state: State<'_, AppState>,
    transaction_id: String,
) -> Result<TransactionFull, String> {
    let pool = state.db.as_ref();

    let transaction =
        sqlx::query_as::<_, Transaction>("SELECT * FROM transactions WHERE id = ?")
            .bind(&transaction_id)
            .fetch_one(&*pool)
            .await
            .map_err(|e| e.to_string())?;

    let lines = sqlx::query_as::<_, TransactionLine>(
        "SELECT * FROM transaction_lines WHERE transaction_id = ? ORDER BY line_no",
    )
    .bind(&transaction_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let payments = sqlx::query_as::<_, Payment>(
        "SELECT * FROM payments WHERE transaction_id = ?",
    )
    .bind(&transaction_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(TransactionFull {
        transaction,
        lines,
        payments,
    })
}

/// Retourne les N dernières transactions toutes sessions confondues (vue historique).
#[tauri::command]
pub async fn list_recent_transactions(
    state: State<'_, AppState>,
    limit: i64,
) -> Result<Vec<Transaction>, String> {
    let pool = state.db.as_ref();
    sqlx::query_as::<_, Transaction>(
        "SELECT * FROM transactions ORDER BY sequence_no DESC LIMIT ?",
    )
    .bind(limit)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_transactions(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<Vec<Transaction>, String> {
    let pool = state.db.as_ref();
    sqlx::query_as::<_, Transaction>(
        "SELECT * FROM transactions WHERE session_id = ? ORDER BY sequence_no",
    )
    .bind(&session_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[derive(sqlx::FromRow)]
struct ChainRow {
    sequence_no: i64,
    r#type: String,
    total_ttc: i64,
    created_at: String,
    previous_hash: Option<String>,
    hash: String,
}

/// Vérifie l'intégrité de toute la chaîne NF525.
#[tauri::command]
pub async fn verify_chain(state: State<'_, AppState>) -> Result<usize, String> {
    let pool = state.db.as_ref();

    let rows = sqlx::query_as::<_, ChainRow>(
        "SELECT sequence_no, type, total_ttc, created_at, previous_hash, hash
         FROM transactions ORDER BY sequence_no",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let chain: Vec<(i64, String, i64, String, Option<String>, String)> = rows
        .into_iter()
        .map(|r| (r.sequence_no, r.r#type, r.total_ttc, r.created_at, r.previous_hash, r.hash))
        .collect();

    crate::nf525::chain::verify_chain(&chain)
        .map_err(|seq| format!("Chaîne brisée à la transaction n°{}", seq))
}
