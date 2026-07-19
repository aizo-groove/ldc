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
import type { LoyaltyConfig, LoyaltyProgram, LoyaltyProgramInput, LoyaltyQrResult, RctInfo } from "@/types/loyalty";
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

import type { OpenOrder, OpenOrderFull, OpenOrderLineInput } from "@/types/open_order";

export const getTableOrder = (tableId: string): Promise<OpenOrderFull | null> =>
  invoke("get_table_order", { tableId });

export const listOpenOrders = (): Promise<OpenOrder[]> =>
  invoke("list_open_orders");

export const saveTableOrder = (
  tableId: string,
  sessionId: string | null,
  covers: number,
  note: string | null,
  lines: OpenOrderLineInput[]
): Promise<OpenOrderFull> =>
  invoke("save_table_order", { tableId, sessionId, covers, note, lines });

export const deleteTableOrder = (tableId: string): Promise<void> =>
  invoke("delete_table_order", { tableId });

export const markSentToKitchen = (tableId: string): Promise<void> =>
  invoke("mark_sent_to_kitchen", { tableId });

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

import type { EscPosReceiptDoc, EscPosRapportDoc, EscPosKitchenDoc, PrinterStatus } from "@/features/print/types";

// ── Printers ──────────────────────────────────────────────────

import type { Printer, PrinterInput } from "@/types/printer";

export const listPrinters = (): Promise<Printer[]> =>
  invoke("list_printers");

export const createPrinter = (input: PrinterInput): Promise<Printer> =>
  invoke("create_printer", { input });

export const updatePrinter = (id: string, input: PrinterInput): Promise<Printer> =>
  invoke("update_printer", { id, input });

export const deletePrinter = (id: string): Promise<void> =>
  invoke("delete_printer", { id });

export const testPrinterById = (id: string): Promise<PrinterStatus> =>
  invoke("test_printer_by_id", { id });

export const printReceiptEscpos = (doc: EscPosReceiptDoc): Promise<void> =>
  invoke("print_receipt_escpos", { doc });

export const printRapportEscpos = (doc: EscPosRapportDoc): Promise<void> =>
  invoke("print_rapport_escpos", { doc });

export const printKitchenEscpos = (doc: EscPosKitchenDoc): Promise<void> =>
  invoke("print_kitchen_escpos", { doc });

export const testPrinter = (): Promise<PrinterStatus> =>
  invoke("test_printer");

export const testKitchenPrinter = (): Promise<PrinterStatus> =>
  invoke("test_kitchen_printer");

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

// ── Loyalty (Fido) ─────────────────────────────────────────

export const getLoyaltyConfig = (): Promise<LoyaltyConfig> =>
  invoke("get_loyalty_config");

export const saveLoyaltyConfig = (config: LoyaltyConfig): Promise<void> =>
  invoke("save_loyalty_config", { config });

export const testLoyaltyConnection = (): Promise<void> =>
  invoke("test_loyalty_connection");

export const getCachedProgram = (): Promise<LoyaltyProgram | null> =>
  invoke("get_cached_program");

export const saveLoyaltyProgram = (program: LoyaltyProgramInput): Promise<LoyaltyProgram> =>
  invoke("save_loyalty_program", { program });

export const deleteLocalProgram = (): Promise<void> =>
  invoke("delete_local_program");

export interface QrLineItem {
  name:           string;
  quantity:       number;
  unitPriceCents: number;
}

export const generateLoyaltyQr = (
  transactionId: string,
  totalCents: number,
  taxCents: number,
  items: QrLineItem[],
): Promise<LoyaltyQrResult | null> =>
  invoke("generate_loyalty_qr", { transactionId, totalCents, taxCents, items });

export const validateRctLocal = (rctRaw: string): Promise<RctInfo> =>
  invoke("validate_rct_local", { rctRaw });

export const consumeRctLocal = (rctInfo: RctInfo): Promise<void> =>
  invoke("consume_rct_local", { rctInfo });

// ── Admin ──────────────────────────────────────────────────

export const wipeAllData = (managerPin: string): Promise<void> =>
  invoke("wipe_all_data", { managerPin });

// ── Dev tools (debug builds only) ─────────────────────────

export const devResetOnboarding = (): Promise<void> =>
  invoke("dev_reset_onboarding");
