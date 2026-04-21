/**
 * Catalogue store — charge les catégories, produits et taux de TVA depuis Tauri.
 *
 * Remplace MOCK_PRODUCTS / MOCK_CATEGORIES / MOCK_TVA_RATES de mockData.ts.
 * Expose aussi `getTvaRatePct(tvaRateId)` utilisé lors de l'ajout au panier.
 */
import { create } from "zustand";
import type { Category, Product, TvaRate } from "@/types/catalogue";
import { listCategories, listProducts, listTvaRates, listAllProducts } from "@/lib/tauri";

interface CatalogueStore {
  categories: Category[];
  products: Product[];
  allProducts: Product[];
  tvaRates: TvaRate[];
  isLoading: boolean;
  error: string | null;

  /** Charge les produits actifs (pour la caisse). */
  load: () => Promise<void>;
  /** Charge tous les produits y compris inactifs (pour l'inventaire). */
  loadAll: () => Promise<void>;

  /** Retourne le rate_pct (centièmes de %) pour un tva_rate_id donné. */
  getTvaRatePct: (tvaRateId: number) => number;

  /** Nom de catégorie pour un id donné. */
  getCategoryName: (categoryId: string | null) => string;
}

export const useCatalogueStore = create<CatalogueStore>((set, get) => ({
  categories: [],
  products: [],
  allProducts: [],
  tvaRates: [],
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const [categories, products, tvaRates] = await Promise.all([
        listCategories(),
        listProducts(),
        listTvaRates(),
      ]);
      set({ categories, products, tvaRates, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  loadAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const [categories, allProducts, tvaRates] = await Promise.all([
        listCategories(),
        listAllProducts(),
        listTvaRates(),
      ]);
      set({ categories, allProducts, tvaRates, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  getTvaRatePct: (tvaRateId) => {
    const rate = get().tvaRates.find((r) => r.id === tvaRateId);
    return rate?.rate_pct ?? 0;
  },

  getCategoryName: (categoryId) => {
    if (!categoryId) return "—";
    return get().categories.find((c) => c.id === categoryId)?.name ?? "—";
  },
}));
