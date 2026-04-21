export type TransactionType = "VENTE" | "AVOIR" | "ANNULATION";

export type PaymentMethod =
  | "ESPECES"
  | "CB"
  | "CHEQUE"
  | "TITRE_RESTO"
  | "VIREMENT"
  | "AVOIR"
  | "AUTRE";

export interface Transaction {
  id: string;
  session_id: string;
  sequence_no: number;
  type: TransactionType;
  ref_transaction_id: string | null;
  /** Montants en centimes */
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  discount_ttc: number;
  previous_hash: string | null;
  hash: string;
  receipt_printed: number;
  receipt_email: string | null;
  created_at: string;
}

export interface TransactionLine {
  id: string;
  transaction_id: string;
  line_no: number;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  /** En centimes */
  unit_price_ttc: number;
  unit_price_ht: number;
  tva_rate_pct: number;
  discount_ttc: number;
  line_total_ht: number;
  line_total_tva: number;
  line_total_ttc: number;
}

export interface Payment {
  id: string;
  transaction_id: string;
  method: PaymentMethod;
  /** En centimes */
  amount: number;
  cash_given: number | null;
  cash_change: number | null;
  reference: string | null;
  created_at: string;
}

export interface TransactionFull {
  transaction: Transaction;
  lines: TransactionLine[];
  payments: Payment[];
}

/** Entrées envoyées par le frontend pour créer une transaction */
export interface CartLineInput {
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price_ttc: number;
  unit_price_ht: number;
  tva_rate_pct: number;
  discount_ttc: number;
}

export interface PaymentInput {
  method: PaymentMethod;
  amount: number;
  cash_given: number | null;
  reference?: string | null;
}

/**
 * Regroupe les paiements appartenant à une même personne.
 * paymentIndices = positions (dans le tableau PaymentInput[]) des paiements de cette personne.
 * Utilisé uniquement côté frontend pour la gestion des reçus — non envoyé au backend.
 */
export interface PersonGroup {
  label: string;          // "Commande" | "Personne 1" | …
  paymentIndices: number[]; // indices dans le tableau payments de TransactionFull
  total: number;           // centimes
}
