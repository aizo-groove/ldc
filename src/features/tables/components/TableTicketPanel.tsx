import { useEffect, useState } from "react";
import { ArrowLeft, Minus, Plus, Trash2, Save, CreditCard, UtensilsCrossed } from "lucide-react";
import { cn, formatCents } from "@/lib/utils";
import { useCatalogueStore } from "@/features/catalogue/store";
import { useSessionStore } from "@/features/session/store";
import { useCartStore } from "@/features/caisse/store";
import { ProductGrid } from "@/features/caisse/components/ProductGrid";
import { getTableOrder, saveTableOrder, deleteTableOrder } from "@/lib/tauri";
import { updateTableStatus } from "@/lib/tauri";
import type { RestaurantTable } from "@/types/table";
import type { CartItem } from "@/features/caisse/store";
import type { OpenOrderLineInput } from "@/types/open_order";

interface TableTicketPanelProps {
  table: RestaurantTable;
  onClose: () => void;
  onPay: () => void;
}

let ticketLineCounter = 0;

export function TableTicketPanel({ table, onClose, onPay }: TableTicketPanelProps) {
  const [items, setItems]         = useState<CartItem[]>([]);
  const [isSaving, setIsSaving]   = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { categories, products, load: loadCatalogue, getCategoryName, getTvaRatePct } =
    useCatalogueStore();
  const { session } = useSessionStore();
  const loadFromOrderLines = useCartStore((s) => s.loadFromOrderLines);
  const clearCart          = useCartStore((s) => s.clear);

  // Load catalogue if needed
  useEffect(() => {
    if (products.length === 0) loadCatalogue();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load existing open order for this table
  useEffect(() => {
    getTableOrder(table.id)
      .then((full) => {
        if (full) {
          setItems(full.lines.map((l) => ({
            lineId: `tline-${++ticketLineCounter}`,
            product_id: l.product_id,
            product_name: l.product_name,
            product_sku: l.product_sku,
            category_name: getCategoryName(null),
            quantity: l.quantity,
            unit_price_ttc: l.unit_price_ttc,
            unit_price_ht: l.unit_price_ht,
            tva_rate_pct: l.tva_rate_pct,
            discount_ttc: l.discount_ttc,
          })));
        } else if (table.status !== "libre") {
          // Status is stale — no open order exists, reset to libre
          updateTableStatus(table.id, "libre");
        }
      })
      .finally(() => setIsLoading(false));
  }, [table.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Item helpers ─────────────────────────────────────────

  const addProduct = (product: typeof products[0]) => {
    const tvaRatePct = getTvaRatePct(product.tva_rate_id);
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        lineId:        `tline-${++ticketLineCounter}`,
        product_id:    product.id,
        product_name:  product.name,
        product_sku:   product.sku,
        category_name: getCategoryName(product.category_id),
        quantity:      1,
        unit_price_ttc: product.price_ttc,
        unit_price_ht:  product.price_ht,
        tva_rate_pct:   tvaRatePct,
        discount_ttc:   0,
      }];
    });
  };

  const increment = (lineId: string) =>
    setItems((prev) => prev.map((i) => i.lineId === lineId ? { ...i, quantity: i.quantity + 1 } : i));

  const decrement = (lineId: string) =>
    setItems((prev) => {
      const item = prev.find((i) => i.lineId === lineId);
      if (!item) return prev;
      if (item.quantity <= 1) return prev.filter((i) => i.lineId !== lineId);
      return prev.map((i) => i.lineId === lineId ? { ...i, quantity: i.quantity - 1 } : i);
    });

  const totalTtc = items.reduce((s, i) => s + i.unit_price_ttc * i.quantity - i.discount_ttc, 0);

  // ── Save ──────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (items.length === 0) {
        await deleteTableOrder(table.id);
        await updateTableStatus(table.id, "libre");
      } else {
        const input: OpenOrderLineInput[] = items.map((i) => ({
          product_id:    i.product_id,
          product_name:  i.product_name,
          product_sku:   i.product_sku,
          quantity:      i.quantity,
          unit_price_ttc: i.unit_price_ttc,
          unit_price_ht:  i.unit_price_ht,
          tva_rate_pct:   i.tva_rate_pct,
          discount_ttc:   i.discount_ttc,
        }));
        await saveTableOrder(table.id, session?.id ?? null, input);
        await updateTableStatus(table.id, "occupe");
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // ── Pay ───────────────────────────────────────────────────

  const handlePay = async () => {
    // Persist order first so it survives the payment flow
    if (items.length > 0) {
      const input: OpenOrderLineInput[] = items.map((i) => ({
        product_id:    i.product_id,
        product_name:  i.product_name,
        product_sku:   i.product_sku,
        quantity:      i.quantity,
        unit_price_ttc: i.unit_price_ttc,
        unit_price_ht:  i.unit_price_ht,
        tva_rate_pct:   i.tva_rate_pct,
        discount_ttc:   i.discount_ttc,
      }));
      await saveTableOrder(table.id, session?.id ?? null, input);
    }
    clearCart();
    loadFromOrderLines(items.map((i) => ({
      id: "", order_id: "", line_no: 0,
      product_id: i.product_id,
      product_name: i.product_name,
      product_sku: i.product_sku,
      quantity: i.quantity,
      unit_price_ttc: i.unit_price_ttc,
      unit_price_ht: i.unit_price_ht,
      tva_rate_pct: i.tva_rate_pct,
      discount_ttc: i.discount_ttc,
    })));
    onPay();
  };

  const visibleProducts = activeCategory
    ? products.filter((p) => p.category_id === activeCategory)
    : products;

  return (
    <div className="mt-16 h-[calc(100vh-64px)] grid grid-cols-12 overflow-hidden bg-surface">

      {/* ── Left: Ticket ──────────────────────────────────── */}
      <section className="col-span-5 flex flex-col overflow-hidden bg-surface-container-lowest">

        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-outline-variant/10">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-lg uppercase tracking-tight truncate">
              {table.name}
            </h2>
            <p className="text-xs text-outline">{table.seats} couverts</p>
          </div>
          {items.length > 0 && (
            <span className="bg-surface-container-high px-3 py-1 rounded-full text-xs font-bold text-primary select-none">
              {items.reduce((s, i) => s + i.quantity, 0)} articles
            </span>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-outline text-sm animate-pulse uppercase tracking-widest">
              Chargement…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-outline gap-3 select-none">
              <UtensilsCrossed size={48} strokeWidth={1} />
              <p className="text-sm font-medium uppercase tracking-widest">Ticket vide</p>
              <p className="text-xs text-center max-w-50">
                Ajoutez des articles depuis la carte à droite
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.lineId}
                className="flex items-center gap-3 bg-surface-container-low rounded-xl px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-on-surface truncate">{item.product_name}</p>
                  <p className="text-xs text-outline">{formatCents(item.unit_price_ttc)} / u</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => decrement(item.lineId)}
                    className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center hover:bg-error/20 hover:text-error transition-colors"
                  >
                    {item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                  </button>
                  <span className="w-6 text-center font-black text-sm">{item.quantity}</span>
                  <button
                    onClick={() => increment(item.lineId)}
                    className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors"
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <span className="w-16 text-right font-black text-sm">
                  {formatCents(item.unit_price_ttc * item.quantity)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-surface-container-low p-5 space-y-4 border-t border-outline-variant/10">
          <div className="flex justify-between items-center">
            <span className="text-xl font-black uppercase tracking-tighter">Total</span>
            <span className="text-4xl font-black text-secondary-fixed tracking-tight">
              {formatCents(totalTtc)}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 h-16 bg-surface-container-highest rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-surface-bright active:scale-[0.98] transition-all disabled:opacity-50 text-on-surface"
            >
              <Save size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Enregistrer</span>
            </button>
            <button
              onClick={handlePay}
              disabled={items.length === 0}
              className={cn(
                "flex-2 h-16 rounded-xl flex items-center justify-center gap-3",
                "bg-secondary-container text-on-secondary-container",
                "hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
              )}
            >
              <CreditCard size={28} strokeWidth={1.5} />
              <div className="text-left">
                <span className="block text-[10px] font-black uppercase tracking-widest opacity-80">Encaisser</span>
                <span className="block text-2xl font-black uppercase tracking-tighter">RÉGLER</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ── Right: Product grid ───────────────────────────── */}
      <ProductGrid
        categories={categories}
        products={visibleProducts}
        activeCategoryId={activeCategory}
        onSelectCategory={setActiveCategory}
        onAddProduct={(p) => addProduct(p)}
        onManualArticle={() => {}}
      />
    </div>
  );
}
