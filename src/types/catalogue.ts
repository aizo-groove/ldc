export interface TvaRate {
  id: number;
  label: string;
  /** En centièmes de % : 20% → 2000 */
  rate_pct: number;
  active: number;
}

export interface Category {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  active: number;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  barcode: string | null;
  sku: string | null;
  /** En centimes */
  price_ttc: number;
  tva_rate_id: number;
  price_ht: number;
  track_stock: number;
  stock_qty: number | null;
  active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
