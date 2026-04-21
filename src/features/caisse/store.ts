import { create } from "zustand";
import type { Product } from "@/types/catalogue";
import type { OpenOrderLine } from "@/types/open_order";

export interface CartItem {
  /** ID unique de la ligne dans le panier (pas l'ID produit) */
  lineId: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  category_name: string;
  quantity: number;
  /** En centimes */
  unit_price_ttc: number;
  unit_price_ht: number;
  tva_rate_pct: number;
  discount_ttc: number;
}

interface CartStore {
  items: CartItem[];

  /** Ajoute un produit (incrémente si déjà présent). tvaRatePct en centièmes (ex: 2000 = 20%). */
  addProduct: (product: Product, categoryName: string, tvaRatePct: number) => void;

  /** Incrémente la quantité d'une ligne */
  increment: (lineId: string) => void;

  /** Décrémente la quantité. Supprime la ligne si quantity tombe à 0. */
  decrement: (lineId: string) => void;

  /** Supprime une ligne du panier */
  removeLine: (lineId: string) => void;

  /** Vide tout le panier */
  clear: () => void;

  /** Charge les lignes d'un ticket ouvert dans le panier */
  loadFromOrderLines: (lines: OpenOrderLine[]) => void;

  // Calculés
  totalTtc: () => number;
  totalHt: () => number;
  totalTva: () => number;
  itemCount: () => number;
}

let lineCounter = 0;

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addProduct: (product, categoryName, tvaRatePct) => {
    set((state) => {
      // Si le produit est déjà dans le panier, on incrémente
      const existing = state.items.find((i) => i.product_id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product_id === product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      // Sinon nouvelle ligne
      return {
        items: [
          ...state.items,
          {
            lineId: `line-${++lineCounter}`,
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            category_name: categoryName,
            quantity: 1,
            unit_price_ttc: product.price_ttc,
            unit_price_ht: product.price_ht,
            tva_rate_pct: tvaRatePct,
            discount_ttc: 0,
          },
        ],
      };
    });
  },

  increment: (lineId) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.lineId === lineId ? { ...i, quantity: i.quantity + 1 } : i
      ),
    })),

  decrement: (lineId) =>
    set((state) => {
      const item = state.items.find((i) => i.lineId === lineId);
      if (!item) return state;
      if (item.quantity <= 1) {
        return { items: state.items.filter((i) => i.lineId !== lineId) };
      }
      return {
        items: state.items.map((i) =>
          i.lineId === lineId ? { ...i, quantity: i.quantity - 1 } : i
        ),
      };
    }),

  removeLine: (lineId) =>
    set((state) => ({
      items: state.items.filter((i) => i.lineId !== lineId),
    })),

  clear: () => set({ items: [] }),

  loadFromOrderLines: (lines) =>
    set({
      items: lines.map((l) => ({
        lineId: `line-${++lineCounter}`,
        product_id: l.product_id,
        product_name: l.product_name,
        product_sku: l.product_sku,
        category_name: "",
        quantity: l.quantity,
        unit_price_ttc: l.unit_price_ttc,
        unit_price_ht: l.unit_price_ht,
        tva_rate_pct: l.tva_rate_pct,
        discount_ttc: l.discount_ttc,
      })),
    }),

  totalTtc: () => {
    const { items } = get();
    return items.reduce(
      (sum, i) => sum + i.unit_price_ttc * i.quantity - i.discount_ttc,
      0
    );
  },

  totalHt: () => {
    const { items } = get();
    return items.reduce(
      (sum, i) => sum + i.unit_price_ht * i.quantity - i.discount_ttc,
      0
    );
  },

  totalTva: () => {
    const { totalTtc, totalHt } = get();
    return totalTtc() - totalHt();
  },

  itemCount: () => {
    const { items } = get();
    return items.reduce((sum, i) => sum + i.quantity, 0);
  },
}));
