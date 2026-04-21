import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { createProduct, updateProduct } from "@/lib/tauri";
import type { Product, Category, TvaRate } from "@/types/catalogue";

// ── Helpers ─────────────────────────────────────────────────

/** Centimes → "1.80" pour affichage dans un input */
const centsToEurStr = (c: number): string => (c / 100).toFixed(2);

/** "1.80" → 180 centimes (NaN-safe) */
const eurStrToCents = (s: string): number => {
  const v = parseFloat(s.replace(",", "."));
  return isNaN(v) ? 0 : Math.round(v * 100);
};

/** Calcule le prix HT à partir du TTC et du taux (en centièmes de %) */
const computeHt = (ttcCents: number, ratePct: number): number => {
  if (ratePct === 0) return ttcCents;
  return Math.round((ttcCents * 10000) / (10000 + ratePct));
};

// ── Types ────────────────────────────────────────────────────

interface ProductFormModalProps {
  /** undefined = création, Product = édition */
  product?: Product;
  categories: Category[];
  tvaRates: TvaRate[];
  defaultCategoryId?: string | null;
  onClose: () => void;
  onSaved: (p: Product) => void;
}

// ── Composant ────────────────────────────────────────────────

export function ProductFormModal({
  product,
  categories,
  tvaRates,
  defaultCategoryId,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const isEdit = !!product;

  // ── State du formulaire ──────────────────────────────────
  const [name, setName]               = useState(product?.name ?? "");
  const [categoryId, setCategoryId]   = useState(product?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? "");
  const [tvaRateId, setTvaRateId]     = useState(product?.tva_rate_id ?? tvaRates[0]?.id ?? 1);
  const [priceTtcStr, setPriceTtcStr] = useState(centsToEurStr(product?.price_ttc ?? 0));
  const [sku, setSku]                 = useState(product?.sku ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [sortOrder, setSortOrder]     = useState(String(product?.sort_order ?? 0));
  const [active, setActive]           = useState(product?.active !== 0);
  const [trackStock, setTrackStock]   = useState(product?.track_stock === 1);
  const [stockQtyStr, setStockQtyStr] = useState(String(product?.stock_qty ?? 0));

  const [isSaving, setIsSaving]       = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // ── Calcul HT affiché ───────────────────────────────────
  const selectedRate = tvaRates.find((r) => r.id === tvaRateId);
  const priceTtcCents = eurStrToCents(priceTtcStr);
  const priceHtCents = computeHt(priceTtcCents, selectedRate?.rate_pct ?? 0);

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Le nom du produit est obligatoire."); return; }
    if (priceTtcCents <= 0) { setError("Le prix TTC doit être supérieur à 0."); return; }

    setError(null);
    setIsSaving(true);

    const payload: Product = {
      id:          product?.id ?? "",
      created_at:  product?.created_at ?? "",
      updated_at:  product?.updated_at ?? "",
      category_id: categoryId || null,
      name:        name.trim(),
      description: description.trim() || null,
      barcode:     product?.barcode ?? null,
      sku:         sku.trim() || null,
      price_ttc:   priceTtcCents,
      tva_rate_id: tvaRateId,
      price_ht:    priceHtCents,
      track_stock: trackStock ? 1 : 0,
      stock_qty:   trackStock ? (parseInt(stockQtyStr) || 0) : null,
      active:      active ? 1 : 0,
      sort_order:  parseInt(sortOrder) || 0,
    };

    try {
      const saved = isEdit ? await updateProduct(payload) : await createProduct(payload);
      onSaved(saved);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsSaving(false);
    }
  };

  // Fermer sur Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panneau modal */}
      <div className="bg-surface-container-low rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h2 className="font-black text-on-surface tracking-tight text-lg">
            {isEdit ? `Modifier — ${product.name}` : "Nouveau produit"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">

          {error && (
            <div className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 text-error text-sm">
              {error}
            </div>
          )}

          {/* Nom */}
          <Field label="Nom *">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Expresso simple"
              className={INPUT_CLS}
            />
          </Field>

          {/* Catégorie */}
          <Field label="Catégorie">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={INPUT_CLS}
            >
              <option value="">— Sans catégorie —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          {/* Prix TTC + TVA */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix TTC (€) *">
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceTtcStr}
                onChange={(e) => setPriceTtcStr(e.target.value)}
                placeholder="0.00"
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Taux TVA">
              <select
                value={tvaRateId}
                onChange={(e) => setTvaRateId(Number(e.target.value))}
                className={INPUT_CLS}
              >
                {tvaRates.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Prix HT calculé */}
          {priceTtcCents > 0 && (
            <p className="text-xs text-outline -mt-2 pl-1">
              Prix HT calculé : <span className="font-bold text-on-surface-variant">
                {centsToEurStr(priceHtCents)} €
              </span>
            </p>
          )}

          {/* SKU */}
          <Field label="Référence (SKU)">
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Ex : 00101"
              className={INPUT_CLS}
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex : Simple / Double"
              className={INPUT_CLS}
            />
          </Field>

          {/* Ordre + Actif */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <Field label="Ordre d'affichage">
              <input
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
            <div className="flex items-center gap-3 pb-2">
              <button
                type="button"
                onClick={() => setActive((v) => !v)}
                className={`w-10 h-6 rounded-full transition-colors ${active ? "bg-secondary" : "bg-outline-variant"}`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white mx-1 transition-transform ${active ? "translate-x-4" : ""}`}
                />
              </button>
              <span className="text-sm text-on-surface-variant font-medium">
                {active ? "Actif" : "Inactif"}
              </span>
            </div>
          </div>

          {/* Gestion du stock */}
          <div className="pt-2 border-t border-outline-variant/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-outline uppercase tracking-widest">
                Suivi du stock
              </span>
              <button
                type="button"
                onClick={() => setTrackStock((v) => !v)}
                className={`w-10 h-6 rounded-full transition-colors ${trackStock ? "bg-secondary" : "bg-outline-variant"}`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white mx-1 transition-transform ${trackStock ? "translate-x-4" : ""}`}
                />
              </button>
            </div>
            {trackStock && (
              <Field label="Quantité en stock">
                <input
                  type="number"
                  min="0"
                  value={stockQtyStr}
                  onChange={(e) => setStockQtyStr(e.target.value)}
                  className={INPUT_CLS}
                />
              </Field>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant/10 bg-surface-container">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-on-surface-variant font-bold text-sm hover:bg-surface-container-high transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le produit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers internes ─────────────────────────────────────────

const INPUT_CLS =
  "w-full bg-surface-container rounded-xl px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-outline";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black text-outline uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}
