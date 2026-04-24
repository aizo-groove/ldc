use std::sync::Arc;
use tauri::Manager;

mod commands;
mod db;
mod nf525;
mod printer;
mod sync;

pub use db::DbPool;

/// État global de l'application partagé entre les commandes Tauri.
/// SqlitePool est déjà thread-safe et gère le pool de connexions en interne —
/// pas besoin de Mutex supplémentaire.
pub struct AppState {
    pub db: Arc<DbPool>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            // Initialisation asynchrone de la DB au démarrage
            tauri::async_runtime::block_on(async move {
                let pool = db::init(&handle)
                    .await
                    .expect("Impossible d'initialiser la base de données");
                handle.manage(AppState {
                    db: Arc::new(pool),
                });
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Catalogue
            commands::catalogue::list_tva_rates,
            commands::catalogue::list_categories,
            commands::catalogue::list_products,
            commands::catalogue::search_products,
            commands::catalogue::create_product,
            commands::catalogue::update_product,
            commands::catalogue::list_all_products,
            commands::catalogue::delete_product,
            // Print
            commands::print::print_receipt_escpos,
            commands::print::print_rapport_escpos,
            commands::print::test_printer,
            commands::print::open_cash_drawer,
            // Sessions
            commands::caisse::list_sessions,
            commands::caisse::get_active_session,
            commands::caisse::open_session,
            commands::caisse::close_session,
            commands::caisse::get_rapport_x,
            // Caissiers
            commands::cashiers::list_cashiers,
            commands::cashiers::create_cashier,
            commands::cashiers::update_cashier,
            commands::cashiers::delete_cashier,
            commands::cashiers::verify_cashier_pin,
            // Conformité NF525
            commands::compliance::export_archive,
            commands::compliance::get_db_path,
            // Transactions
            commands::transactions::create_transaction,
            commands::transactions::get_transaction,
            commands::transactions::list_transactions,
            commands::transactions::list_recent_transactions,
            commands::transactions::verify_chain,
            // Journal
            commands::journal::list_journal_entries,
            // Open orders (tickets table)
            commands::open_orders::get_table_order,
            commands::open_orders::save_table_order,
            commands::open_orders::delete_table_order,
            // Settings
            commands::settings::get_setting,
            commands::settings::update_setting,
            // Tables
            commands::tables::list_rooms,
            commands::tables::create_room,
            commands::tables::update_room,
            commands::tables::delete_room,
            commands::tables::list_tables,
            commands::tables::create_table,
            commands::tables::update_table,
            commands::tables::update_table_status,
            commands::tables::update_table_position,
            commands::tables::delete_table,
        ])
        .run(tauri::generate_context!())
        .expect("erreur au démarrage de l'application");
}
