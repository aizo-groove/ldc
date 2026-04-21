/**
 * Données mock partagées — utilisées par CaisseView ET InventaireView
 * en attendant le branchement du backend Tauri (listProducts / listCategories).
 */
import type { Category, Product, TvaRate } from "@/types/catalogue";

export const MOCK_TVA_RATES: TvaRate[] = [
  { id: 1, label: "Taux normal",        rate_pct: 2000, active: 1 },
  { id: 2, label: "Taux intermédiaire", rate_pct: 1000, active: 1 },
  { id: 3, label: "Taux réduit",         rate_pct:  550, active: 1 },
  { id: 4, label: "Taux super-réduit",   rate_pct:  210, active: 1 },
  { id: 5, label: "Exonéré",             rate_pct:    0, active: 1 },
];

export const TVA_LABEL: Record<number, string> = {
  1: "20%",
  2: "10%",
  3: "5.5%",
  4: "2.1%",
  5: "0%",
};

export const MOCK_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Boissons",     color: "#b4c5ff", icon: null, sort_order: 0, active: 1, created_at: "" },
  { id: "cat-2", name: "Viennoiserie", color: "#ffb3ad", icon: null, sort_order: 1, active: 1, created_at: "" },
  { id: "cat-3", name: "Snacks",       color: "#4ae176", icon: null, sort_order: 2, active: 1, created_at: "" },
  { id: "cat-4", name: "Alimentation", color: "#8d90a0", icon: null, sort_order: 3, active: 1, created_at: "" },
  { id: "cat-5", name: "Desserts",     color: "#ffb3ad", icon: null, sort_order: 4, active: 1, created_at: "" },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: "p-1",  category_id: "cat-1", name: "Expresso",            description: "Simple / Double",  barcode: null, sku: "00101", price_ttc:  180, tva_rate_id: 2, price_ht:  164, track_stock: 0, stock_qty: null,  active: 1, sort_order: 0, created_at: "", updated_at: "" },
  { id: "p-2",  category_id: "cat-1", name: "Cappuccino",          description: "Mousse de lait",   barcode: null, sku: "00102", price_ttc:  390, tva_rate_id: 2, price_ht:  355, track_stock: 0, stock_qty: null,  active: 1, sort_order: 1, created_at: "", updated_at: "" },
  { id: "p-3",  category_id: "cat-1", name: "Café Latte Grande",   description: "Sans sucre",       barcode: null, sku: "00921", price_ttc:  450, tva_rate_id: 2, price_ht:  409, track_stock: 0, stock_qty: null,  active: 1, sort_order: 2, created_at: "", updated_at: "" },
  { id: "p-4",  category_id: "cat-1", name: "Eau Minérale",        description: "50cl Plate",       barcode: null, sku: "00201", price_ttc:  150, tva_rate_id: 1, price_ht:  125, track_stock: 0, stock_qty: null,  active: 1, sort_order: 3, created_at: "", updated_at: "" },
  { id: "p-5",  category_id: "cat-1", name: "Smoothie",            description: "Fruits Frais",     barcode: null, sku: "00301", price_ttc:  550, tva_rate_id: 2, price_ht:  500, track_stock: 0, stock_qty: null,  active: 1, sort_order: 4, created_at: "", updated_at: "" },
  { id: "p-6",  category_id: "cat-2", name: "Croissant Pur Beurre",description: null,               barcode: null, sku: "00412", price_ttc:  180, tva_rate_id: 3, price_ht:  171, track_stock: 0, stock_qty: null,  active: 1, sort_order: 0, created_at: "", updated_at: "" },
  { id: "p-7",  category_id: "cat-2", name: "Pain Chocolat",       description: "Double barre",     barcode: null, sku: "00413", price_ttc:  210, tva_rate_id: 3, price_ht:  199, track_stock: 0, stock_qty: null,  active: 1, sort_order: 1, created_at: "", updated_at: "" },
  { id: "p-8",  category_id: "cat-3", name: "Cookie Choc Noir",    description: null,               barcode: null, sku: "01104", price_ttc:  220, tva_rate_id: 2, price_ht:  200, track_stock: 0, stock_qty: null,  active: 1, sort_order: 0, created_at: "", updated_at: "" },
  { id: "p-9",  category_id: "cat-3", name: "Muffin Myrtille",     description: "Cœur fondant",     barcode: null, sku: "01105", price_ttc:  320, tva_rate_id: 2, price_ht:  291, track_stock: 0, stock_qty: null,  active: 1, sort_order: 1, created_at: "", updated_at: "" },
  { id: "p-10", category_id: "cat-4", name: "Burger Classique XL", description: null,               barcode: null, sku: "00421", price_ttc: 1450, tva_rate_id: 2, price_ht: 1318, track_stock: 1, stock_qty: 14,   active: 1, sort_order: 0, created_at: "", updated_at: "" },
  { id: "p-11", category_id: "cat-1", name: "IPA Artisanale 33cl", description: null,               barcode: null, sku: "00422", price_ttc:  680, tva_rate_id: 1, price_ht:  567, track_stock: 1, stock_qty: 30,   active: 1, sort_order: 5, created_at: "", updated_at: "" },
  { id: "p-12", category_id: "cat-5", name: "Brownie Maison",      description: null,               barcode: null, sku: "00425", price_ttc:  450, tva_rate_id: 3, price_ht:  427, track_stock: 1, stock_qty: 0,    active: 1, sort_order: 0, created_at: "", updated_at: "" },
  { id: "p-13", category_id: "cat-4", name: "Pizza Margherita",    description: null,               barcode: null, sku: "00435", price_ttc: 1100, tva_rate_id: 2, price_ht: 1000, track_stock: 1, stock_qty: 8,    active: 1, sort_order: 1, created_at: "", updated_at: "" },
];
