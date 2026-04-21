use crate::db::models::{Category, Product, TvaRate};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_tva_rates(state: State<'_, AppState>) -> Result<Vec<TvaRate>, String> {
    let pool = state.db.as_ref();
    sqlx::query_as::<_, TvaRate>("SELECT * FROM tva_rates WHERE active = 1 ORDER BY id")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_categories(state: State<'_, AppState>) -> Result<Vec<Category>, String> {
    let pool = state.db.as_ref();
    sqlx::query_as::<_, Category>(
        "SELECT * FROM categories WHERE active = 1 ORDER BY sort_order, name",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_products(
    state: State<'_, AppState>,
    category_id: Option<String>,
) -> Result<Vec<Product>, String> {
    let pool = state.db.as_ref();
    match category_id {
        Some(cat_id) => sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE active = 1 AND category_id = ? ORDER BY sort_order, name",
        )
        .bind(cat_id)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string()),

        None => sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE active = 1 ORDER BY sort_order, name",
        )
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string()),
    }
}

#[tauri::command]
pub async fn search_products(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<Product>, String> {
    let pool = state.db.as_ref();
    let pattern = format!("%{}%", query.to_lowercase());
    sqlx::query_as::<_, Product>(
        r#"SELECT * FROM products
           WHERE active = 1
             AND (lower(name) LIKE ? OR barcode = ? OR sku = ?)
           ORDER BY sort_order, name
           LIMIT 50"#,
    )
    .bind(&pattern)
    .bind(&query)
    .bind(&query)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_product(
    state: State<'_, AppState>,
    product: Product,
) -> Result<Product, String> {
    let pool = state.db.as_ref();
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO products
           (id, category_id, name, description, barcode, sku,
            price_ttc, tva_rate_id, price_ht, active, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&id)
    .bind(&product.category_id)
    .bind(&product.name)
    .bind(&product.description)
    .bind(&product.barcode)
    .bind(&product.sku)
    .bind(product.price_ttc)
    .bind(product.tva_rate_id)
    .bind(product.price_ht)
    .bind(product.active)
    .bind(product.sort_order)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Product>("SELECT * FROM products WHERE id = ?")
        .bind(&id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_product(
    state: State<'_, AppState>,
    product: Product,
) -> Result<Product, String> {
    let pool = state.db.as_ref();
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    sqlx::query(
        r#"UPDATE products SET
           category_id = ?, name = ?, description = ?, barcode = ?, sku = ?,
           price_ttc = ?, tva_rate_id = ?, price_ht = ?,
           track_stock = ?, stock_qty = ?,
           active = ?, sort_order = ?, updated_at = ?
           WHERE id = ?"#,
    )
    .bind(&product.category_id)
    .bind(&product.name)
    .bind(&product.description)
    .bind(&product.barcode)
    .bind(&product.sku)
    .bind(product.price_ttc)
    .bind(product.tva_rate_id)
    .bind(product.price_ht)
    .bind(product.track_stock)
    .bind(product.stock_qty)
    .bind(product.active)
    .bind(product.sort_order)
    .bind(&now)
    .bind(&product.id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Product>("SELECT * FROM products WHERE id = ?")
        .bind(&product.id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_all_products(state: State<'_, AppState>) -> Result<Vec<Product>, String> {
    let pool = state.db.as_ref();
    sqlx::query_as::<_, Product>(
        "SELECT * FROM products ORDER BY active DESC, sort_order, name",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_product(
    state: State<'_, AppState>,
    product_id: String,
) -> Result<(), String> {
    let pool = state.db.as_ref();
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    sqlx::query("UPDATE products SET active = 0, updated_at = ? WHERE id = ?")
        .bind(&now)
        .bind(&product_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
