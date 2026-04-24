/**
 * Wrappers typés autour de invoke() de Tauri.
 * Tous les appels vers le backend Rust passent par ici.
 *
 * Règle Tauri v2 : les noms de paramètres dans invoke() doivent être en
 * camelCase (ex: session_id → sessionId). Les valeurs retournées par Rust
 * restent en snake_case (champs des structs sérialisés par serde).
 */
import { invoke } from "@tauri-apps/api/core";
import type { Category, Product, TvaRate } from "@/types/catalogue";
import type {
  CartLineInput,
  PaymentInput,
  Transaction,
  TransactionFull,
} from "@/types/transaction";
import type { RapportX, Session } from "@/types/session";
import type { Cashier } from "@/types/cashier";

// ── Catalogue ──────────────────────────────────────────────

export const listTvaRates = (): Promise<TvaRate[]> =>
  invoke("list_tva_rates");

export const listCategories = (): Promise<Category[]> =>
  invoke("list_categories");

export const listProducts = (categoryId?: string): Promise<Product[]> =>
  invoke("list_products", { categoryId: categoryId ?? null });

export const searchProducts = (query: string): Promise<Product[]> =>
  invoke("search_products", { query });

export const createProduct = (product: Product): Promise<Product> =>
  invoke("create_product", { product });

export const updateProduct = (product: Product): Promise<Product> =>
  invoke("update_product", { product });

export const listAllProducts = (): Promise<Product[]> =>
  invoke("list_all_products");

export const deleteProduct = (productId: string): Promise<void> =>
  invoke("delete_product", { productId });

// ── Sessions ───────────────────────────────────────────────

export const listSessions = (limit?: number): Promise<Session[]> =>
  invoke("list_sessions", { limit: limit ?? null });

export const getActiveSession = (): Promise<Session | null> =>
  invoke("get_active_session");

export const openSession = (
  openingFloat: number,
  openingNote?: string,
  cashierId?: string | null,
  stationId?: string,
): Promise<Session> =>
  invoke("open_session", {
    openingFloat,
    openingNote: openingNote ?? null,
    cashierId: cashierId ?? null,
    stationId: stationId ?? "main",
  });

export const closeSession = (sessionId: string): Promise<Session> =>
  invoke("close_session", { sessionId });

export const getRapportX = (sessionId: string): Promise<RapportX> =>
  invoke("get_rapport_x", { sessionId });

// ── Transactions ───────────────────────────────────────────

export const createTransaction = (params: {
  sessionId: string;
  transactionType: string;
  lines: CartLineInput[];
  payments: PaymentInput[];
  discountTtc: number;
  refTransactionId?: string | null;
}): Promise<TransactionFull> =>
  invoke("create_transaction", {
    ...params,
    refTransactionId: params.refTransactionId ?? null,
  });

export const getTransaction = (transactionId: string): Promise<TransactionFull> =>
  invoke("get_transaction", { transactionId });

export const listTransactions = (sessionId: string): Promise<Transaction[]> =>
  invoke("list_transactions", { sessionId });

export const listRecentTransactions = (limit: number): Promise<Transaction[]> =>
  invoke("list_recent_transactions", { limit });

export const verifyChain = (): Promise<number> => invoke("verify_chain");

// ── Open orders (tickets table) ───────────────────────────

import type { OpenOrderFull, OpenOrderLineInput } from "@/types/open_order";

export const getTableOrder = (tableId: string): Promise<OpenOrderFull | null> =>
  invoke("get_table_order", { tableId });

export const saveTableOrder = (
  tableId: string,
  sessionId: string | null,
  lines: OpenOrderLineInput[]
): Promise<OpenOrderFull> =>
  invoke("save_table_order", { tableId, sessionId, lines });

export const deleteTableOrder = (tableId: string): Promise<void> =>
  invoke("delete_table_order", { tableId });

// ── Tables ────────────────────────────────────────────────

import type { Room, RestaurantTable } from "@/types/table";

export const listRooms = (): Promise<Room[]> => invoke("list_rooms");
export const createRoom = (name: string): Promise<Room> => invoke("create_room", { name });
export const updateRoom = (id: string, name: string): Promise<Room> => invoke("update_room", { id, name });
export const deleteRoom = (id: string): Promise<void> => invoke("delete_room", { id });

export const listTables = (): Promise<RestaurantTable[]> => invoke("list_tables");
export const createTable = (table: RestaurantTable): Promise<RestaurantTable> => invoke("create_table", { table });
export const updateTable = (table: RestaurantTable): Promise<RestaurantTable> => invoke("update_table", { table });
export const updateTableStatus = (tableId: string, status: string): Promise<void> => invoke("update_table_status", { tableId, status });
export const updateTablePosition = (tableId: string, posX: number, posY: number): Promise<void> => invoke("update_table_position", { tableId, posX, posY });
export const deleteTable = (tableId: string): Promise<void> => invoke("delete_table", { tableId });

// ── Caissiers ─────────────────────────────────────────────

export const listCashiers = (): Promise<Cashier[]> =>
  invoke("list_cashiers");

export const createCashier = (name: string, pin: string | null, role: string): Promise<Cashier> =>
  invoke("create_cashier", { name, pin, role });

export const updateCashier = (id: string, name: string, pin: string | null, role: string): Promise<Cashier> =>
  invoke("update_cashier", { id, name, pin, role });

export const deleteCashier = (id: string): Promise<void> =>
  invoke("delete_cashier", { id });

export const verifyCashierPin = (cashierId: string, pin: string): Promise<boolean> =>
  invoke("verify_cashier_pin", { cashierId, pin });

// ── Print ─────────────────────────────────────────────────────

import type { EscPosReceiptDoc, EscPosRapportDoc, PrinterStatus } from "@/features/print/types";

export const printReceiptEscpos = (doc: EscPosReceiptDoc): Promise<void> =>
  invoke("print_receipt_escpos", { doc });

export const printRapportEscpos = (doc: EscPosRapportDoc): Promise<void> =>
  invoke("print_rapport_escpos", { doc });

export const testPrinter = (): Promise<PrinterStatus> =>
  invoke("test_printer");

export const openCashDrawer = (pin: number): Promise<void> =>
  invoke("open_cash_drawer", { pin });

// ── Settings ───────────────────────────────────────────────

export const getSetting = (key: string): Promise<string | null> =>
  invoke("get_setting", { key });

export const updateSetting = (key: string, value: string): Promise<void> =>
  invoke("update_setting", { key, value });

// ── Conformité NF525 ──────────────────────────────────────

export const exportArchive = (): Promise<unknown> => invoke("export_archive");

export const getDbPath = (): Promise<string> => invoke("get_db_path");

// ── Journal ────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  sequence_no: number;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: string | null;
  created_at: string;
}

export const listJournalEntries = (limit?: number): Promise<JournalEntry[]> =>
  invoke("list_journal_entries", { limit: limit ?? null });
