export interface OpenOrder {
  id: string;
  table_id: string | null;
  session_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpenOrderLine {
  id: string;
  order_id: string;
  line_no: number;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price_ttc: number;
  unit_price_ht: number;
  tva_rate_pct: number;
  discount_ttc: number;
}

export interface OpenOrderFull {
  order: OpenOrder;
  lines: OpenOrderLine[];
}

export interface OpenOrderLineInput {
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price_ttc: number;
  unit_price_ht: number;
  tva_rate_pct: number;
  discount_ttc: number;
}
