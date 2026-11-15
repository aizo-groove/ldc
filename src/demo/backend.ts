/**
 * Backend en mémoire du mode démo web : répond aux commandes Tauri appelées
 * par `src/lib/tauri.ts`. Les calculs (totaux, rapport X) reprennent ceux du
 * backend Rust. Tout est perdu au rechargement de la page.
 */
import type { Category, Product, TvaRate } from "@/types/catalogue";
import type { Cashier } from "@/types/cashier";
import type { RapportX, Session } from "@/types/session";
import type {
  CartLineInput,
  Payment,
  PaymentInput,
  Transaction,
  TransactionLine,
} from "@/types/transaction";
import type { JournalEntry } from "@/lib/tauri";
import type { Printer } from "@/types/printer";
import { MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_TVA_RATES } from "@/lib/mockData";
import { version } from "../../package.json";

export const DEMO_VERSION = version;

const UNAVAILABLE = "Non disponible dans la démo : téléchargez LDC pour utiliser cette fonction.";

type Args = Record<string, unknown>;

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

const state = {
  settings: new Map<string, string>([
    ["store_name", "Café de la Démo"],
    ["business_profile", "cafe"],
    // Pas de modal « Nouveautés » ni d'assistant au démarrage
    ["last_seen_version", DEMO_VERSION],
  ]),
  tvaRates: MOCK_TVA_RATES.map((t) => ({ ...t })) as TvaRate[],
  categories: MOCK_CATEGORIES.map((c) => ({ ...c })) as Category[],
  products: MOCK_PRODUCTS.map((p) => ({ ...p })) as Product[],
  cashiers: [
    { id: "demo-camille", name: "Camille", pin: null, role: "manager", active: 1, created_at: now() },
    { id: "demo-sam", name: "Sam", pin: null, role: "cashier", active: 1, created_at: now() },
  ] as Cashier[],
  sessions: [] as Session[],
  transactions: [] as Transaction[],
  lines: [] as TransactionLine[],
  payments: [] as Payment[],
  journal: [] as JournalEntry[],
  duplicatas: new Map<string, number>(),
  // Ticket affiché à l'écran : seul « imprimante » utilisable dans un navigateur
  printers: [
    {
      id: "demo-ecran", name: "Écran", printer_type: "screen", ip: null, port: 0,
      paper_mm: 80, roles: "receipt,kitchen", sort_order: 0, created_at: now(),
    },
  ] as Printer[],
};

function journal(event_type: string, entity_type: string, entity_id: string, payload: unknown) {
  state.journal.push({
    id: uuid(),
    sequence_no: state.journal.length + 1,
    event_type,
    entity_type,
    entity_id,
    payload: JSON.stringify(payload),
    created_at: now(),
  });
}

async function sha256Hex(input: string): Promise<string> {
  if (!crypto.subtle) return uuid().replace(/-/g, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Catalogue ─────────────────────────────────────────────────

function saveProduct(product: Product, isNew: boolean): Product {
  const saved = { ...product, id: isNew && !product.id ? uuid() : product.id, updated_at: now() };
  if (isNew) {
    saved.created_at = now();
    state.products.push(saved);
  } else {
    state.products = state.products.map((p) => (p.id === saved.id ? saved : p));
  }
  return saved;
}

// ── Transactions ──────────────────────────────────────────────

async function createTransaction(a: Args) {
  const sessionId = a.sessionId as string;
  const type = a.transactionType as Transaction["type"];
  const lines = a.lines as CartLineInput[];
  const payments = a.payments as PaymentInput[];
  const discount = (a.discountTtc as number) ?? 0;

  const totalHt = lines.reduce((s, l) => s + l.unit_price_ht * Math.abs(l.quantity) - l.discount_ttc, 0) - discount;
  const totalTtc = lines.reduce((s, l) => s + l.unit_price_ttc * Math.abs(l.quantity) - l.discount_ttc, 0) - discount;

  const sequenceNo = state.transactions.length + 1;
  const previousHash = state.transactions[state.transactions.length - 1]?.hash ?? null;
  const createdAt = now();
  const hash = await sha256Hex(`${sequenceNo}|${type}|${totalTtc}|${createdAt}|${previousHash ?? "GENESIS"}`);

  const tx: Transaction = {
    id: uuid(),
    session_id: sessionId,
    sequence_no: sequenceNo,
    type,
    ref_transaction_id: (a.refTransactionId as string | null) ?? null,
    total_ht: totalHt,
    total_tva: totalTtc - totalHt,
    total_ttc: totalTtc,
    discount_ttc: discount,
    previous_hash: previousHash,
    hash,
    receipt_printed: 0,
    receipt_email: null,
    created_at: createdAt,
  };

  const txLines: TransactionLine[] = lines.map((l, i) => {
    const ht = l.unit_price_ht * Math.abs(l.quantity) - l.discount_ttc;
    const ttc = l.unit_price_ttc * Math.abs(l.quantity) - l.discount_ttc;
    return {
      id: uuid(),
      transaction_id: tx.id,
      line_no: i + 1,
      product_id: l.product_id,
      product_name: l.product_name,
      product_sku: l.product_sku,
      quantity: l.quantity,
      unit_price_ttc: l.unit_price_ttc,
      unit_price_ht: l.unit_price_ht,
      tva_rate_pct: l.tva_rate_pct,
      discount_ttc: l.discount_ttc,
      line_total_ht: ht,
      line_total_tva: ttc - ht,
      line_total_ttc: ttc,
    };
  });

  const txPayments: Payment[] = payments.map((p) => ({
    id: uuid(),
    transaction_id: tx.id,
    method: p.method,
    amount: p.amount,
    cash_given: p.cash_given,
    cash_change: p.cash_given != null ? p.cash_given - p.amount : null,
    reference: p.reference ?? null,
    created_at: createdAt,
  }));

  for (const l of lines) {
    const product = state.products.find((p) => p.id === l.product_id);
    if (product?.track_stock) {
      product.stock_qty = (product.stock_qty ?? 0) + (type === "AVOIR" ? l.quantity : -l.quantity);
    }
  }

  state.transactions.push(tx);
  state.lines.push(...txLines);
  state.payments.push(...txPayments);
  journal("TRANSACTION_CREATED", "transaction", tx.id, { sequence_no: sequenceNo, type, total_ttc: totalTtc });
  return { transaction: tx, lines: txLines, payments: txPayments };
}

function getTransaction(id: string) {
  const transaction = state.transactions.find((t) => t.id === id);
  if (!transaction) throw "Ticket introuvable";
  return {
    transaction,
    lines: state.lines.filter((l) => l.transaction_id === id),
    payments: state.payments.filter((p) => p.transaction_id === id),
  };
}

// ── Sessions ──────────────────────────────────────────────────

function rapportX(sessionId: string): RapportX {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) throw "Session introuvable";
  const txs = state.transactions.filter((t) => t.session_id === sessionId);
  const sum = (type: string) => txs.filter((t) => t.type === type).reduce((s, t) => s + t.total_ttc, 0);
  const ventes = sum("VENTE");
  const avoirs = sum("AVOIR");

  const venteIds = new Set(txs.filter((t) => t.type === "VENTE").map((t) => t.id));
  const pay = (methods: string[] | null) =>
    state.payments
      .filter((p) => venteIds.has(p.transaction_id))
      .filter((p) => (methods ? methods.includes(p.method) : !["ESPECES", "CB", "CHEQUE"].includes(p.method)))
      .reduce((s, p) => s + p.amount, 0);

  // TVA et HT nettes des avoirs et annulations, comme nf525::cloture
  const txType = new Map(txs.map((t) => [t.id, t.type]));
  const byRate = (rate: number, field: "line_total_tva" | "line_total_ht") =>
    state.lines
      .filter((l) => txType.has(l.transaction_id) && l.tva_rate_pct === rate)
      .reduce((s, l) => s + (txType.get(l.transaction_id) === "VENTE" ? l[field] : -l[field]), 0);

  return {
    session,
    total_ventes_ttc: ventes,
    total_avoirs_ttc: avoirs,
    net_ttc: ventes - avoirs - sum("ANNULATION"),
    nb_transactions: txs.length,
    pay_especes: pay(["ESPECES"]),
    pay_cb: pay(["CB"]),
    pay_cheque: pay(["CHEQUE"]),
    pay_autre: pay(null),
    tva_2000: byRate(2000, "line_total_tva"), ht_2000: byRate(2000, "line_total_ht"),
    tva_1000: byRate(1000, "line_total_tva"), ht_1000: byRate(1000, "line_total_ht"),
    tva_550: byRate(550, "line_total_tva"), ht_550: byRate(550, "line_total_ht"),
    tva_210: byRate(210, "line_total_tva"), ht_210: byRate(210, "line_total_ht"),
    tva_0: byRate(0, "line_total_tva"), ht_0: byRate(0, "line_total_ht"),
  };
}

// ── Dispatcher ────────────────────────────────────────────────

export async function handle(cmd: string, payload?: unknown): Promise<unknown> {
  const a = (payload ?? {}) as Args;

  switch (cmd) {
    // Plugins Tauri
    case "plugin:app|version": return DEMO_VERSION;
    case "plugin:app|name": return "LDC";
    case "plugin:app|tauri_version": return "2";
    case "plugin:updater|check": return null;
    case "plugin:opener|open_url": window.open(a.url as string, "_blank", "noopener"); return null;

    // Catalogue
    case "list_tva_rates": return state.tvaRates;
    case "list_categories": return state.categories.filter((c) => c.active);
    case "list_products":
      return state.products.filter((p) => p.active && (!a.categoryId || p.category_id === a.categoryId));
    case "list_all_products": return state.products;
    case "search_products": {
      const q = String(a.query ?? "").toLowerCase();
      return state.products.filter(
        (p) => p.active && (p.name.toLowerCase().includes(q) || p.sku?.includes(q) || p.barcode?.includes(q)),
      );
    }
    case "create_product": return saveProduct(a.product as Product, true);
    case "update_product": return saveProduct(a.product as Product, false);
    case "delete_product":
      state.products = state.products.filter((p) => p.id !== a.productId);
      return null;

    // Sessions
    case "list_sessions": return [...state.sessions].reverse().slice(0, (a.limit as number) ?? 50);
    case "get_active_session": return state.sessions.find((s) => s.status === "OPEN") ?? null;
    case "open_session": {
      if (state.sessions.some((s) => s.status === "OPEN")) throw "Une session est déjà ouverte";
      const session: Session = {
        id: uuid(),
        status: "OPEN",
        opening_float: (a.openingFloat as number) ?? 0,
        opening_note: (a.openingNote as string | null) ?? null,
        opened_at: now(),
        closed_at: null,
        cloture_id: null,
      };
      state.sessions.push(session);
      journal("SESSION_OPEN", "session", session.id, { session_id: session.id });
      return session;
    }
    case "close_session": {
      const session = state.sessions.find((s) => s.id === a.sessionId && s.status === "OPEN");
      if (!session) throw "Session introuvable ou déjà clôturée";
      Object.assign(session, { status: "CLOSED", closed_at: now(), cloture_id: uuid() });
      journal("CLOTURE_Z", "cloture", session.cloture_id!, { session_id: session.id });
      journal("SESSION_CLOSE", "session", session.id, { session_id: session.id });
      return session;
    }
    case "get_rapport_x": return rapportX(a.sessionId as string);

    // Transactions
    case "create_transaction": return createTransaction(a);
    case "get_transaction": return getTransaction(a.transactionId as string);
    case "list_transactions": return state.transactions.filter((t) => t.session_id === a.sessionId);
    case "list_recent_transactions": return [...state.transactions].reverse().slice(0, a.limit as number);
    case "verify_chain": return state.transactions.length;
    case "create_duplicata": {
      const id = a.transactionId as string;
      const no = (state.duplicatas.get(id) ?? 0) + 1;
      state.duplicatas.set(id, no);
      journal("DUPLICATA", "transaction", id, { duplicata_no: no, canal: a.canal });
      return { id: uuid(), transaction_id: id, duplicata_no: no, canal: a.canal, created_at: now() };
    }
    case "list_journal_entries": return [...state.journal].reverse().slice(0, (a.limit as number) ?? 200);

    // Caissiers
    case "list_cashiers": return state.cashiers.filter((c) => c.active);
    case "create_cashier": {
      const cashier: Cashier = {
        id: uuid(), name: a.name as string, pin: (a.pin as string | null) ?? null,
        role: a.role as Cashier["role"], active: 1, created_at: now(),
      };
      state.cashiers.push(cashier);
      return cashier;
    }
    case "update_cashier": {
      const cashier = state.cashiers.find((c) => c.id === a.id);
      if (!cashier) throw "Caissier introuvable";
      Object.assign(cashier, { name: a.name, pin: a.pin ?? null, role: a.role });
      return cashier;
    }
    case "delete_cashier":
      state.cashiers = state.cashiers.filter((c) => c.id !== a.id);
      return null;
    case "verify_cashier_pin": {
      const cashier = state.cashiers.find((c) => c.id === a.cashierId);
      return !cashier?.pin || cashier.pin === a.pin;
    }

    // Réglages
    case "get_setting": return state.settings.get(a.key as string) ?? null;
    case "update_setting": state.settings.set(a.key as string, a.value as string); return null;
    case "get_db_path": return "Démo : aucune base de données, rien n'est enregistré";

    // Tables : pas de plan de salle dans le profil démo (Café)
    case "list_rooms":
    case "list_tables":
    case "list_open_orders":
      return [];
    case "list_printers": return state.printers;
    case "get_table_order": return null;

    // Fidélité : module désactivé
    case "get_loyalty_config":
      return { fido_mid: null, fido_partner_id: null, fido_partner_secret: null, fido_api_url: null, fido_enabled: false };
    case "get_cached_program": return null;
    case "generate_loyalty_qr": return null;

    // Fenêtres et événements : sans effet dans le navigateur
    default:
      if (cmd.startsWith("plugin:window|") || cmd.startsWith("plugin:webview|")) return null;
      throw UNAVAILABLE;
  }
}
