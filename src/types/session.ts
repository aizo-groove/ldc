export type SessionStatus = "OPEN" | "CLOSED";

export interface Session {
  id: string;
  status: SessionStatus;
  /** En centimes */
  opening_float: number;
  opening_note: string | null;
  opened_at: string;
  closed_at: string | null;
  cloture_id: string | null;
}

export interface RapportX {
  session: Session;
  total_ventes_ttc: number;
  total_avoirs_ttc: number;
  net_ttc: number;
  nb_transactions: number;
  pay_especes: number;
  pay_cb: number;
  pay_cheque: number;
  pay_autre: number;
  /** Montants TVA collectés par taux (centimes) */
  tva_2000: number;
  tva_1000: number;
  tva_550: number;
  tva_210: number;
  tva_0: number;
  /** Bases HT correspondantes (centimes) */
  ht_2000: number;
  ht_1000: number;
  ht_550: number;
  ht_210: number;
  ht_0: number;
}
