import type { TransactionFull } from "@/types/transaction";
import type { RapportX } from "@/types/session";

export type PrintJob =
  | { type: "receipt"; transaction: TransactionFull }
  | { type: "rapport"; rapport: RapportX };

// ── ESC/POS input shapes (mirror of Rust structs) ─────────────

export interface EscPosReceiptDoc {
  store_name:     string;
  sequence_no:    number;
  created_at:     string;
  cashier_name:   string | null;
  lines: Array<{
    product_name:   string;
    quantity:       number;
    unit_price_ttc: number;
    line_total_ttc: number;
    tva_rate_pct:   number;
  }>;
  total_ht:       number;
  total_ttc:      number;
  discount_ttc:   number;
  payment_method: string;
  payment_amount: number;
  cash_change:    number | null;
  tva_groups: Array<{ rate_pct: number; tva: number; ht: number }>;
  hash:           string;
  is_avoir:       boolean;
}

export interface EscPosRapportDoc {
  store_name:       string;
  session_label:    string;
  session_date:     string;
  nb_transactions:  number;
  net_ttc:          number;
  total_ventes_ttc: number;
  total_avoirs_ttc: number;
  pay_cb:           number;
  pay_especes:      number;
  pay_cheque:       number;
  pay_autre:        number;
  tva_550:          number; ht_550:  number;
  tva_1000:         number; ht_1000: number;
  tva_2000:         number; ht_2000: number;
  is_z:             boolean;
}

export interface PrinterStatus {
  connected: boolean;
  ip:        string;
  port:      number;
}
