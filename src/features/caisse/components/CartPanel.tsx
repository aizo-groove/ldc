import { useState } from "react";
import { Trash2, Tag, CreditCard } from "lucide-react";
import { formatCents } from "@/lib/utils";
import { useCartStore } from "../store";
import { useCatalogueStore } from "@/features/catalogue/store";
import { CartItem } from "./CartItem";
import type { CartItem as CartItemType } from "../store";

interface CartPanelProps {
  onPay: () => void;
  stockError?: string | null;
  onClearStockError?: () => void;
}

export function CartPanel({ onPay, stockError, onClearStockError }: CartPanelProps) {
  const [incrementError, setIncrementError] = useState<string | null>(null);

  const items = useCartStore((s) => s.items);
  const totalTtc = useCartStore((s) => s.totalTtc)();
  const totalHt = useCartStore((s) => s.totalHt)();
  const totalTva = useCartStore((s) => s.totalTva)();
  const itemCount = useCartStore((s) => s.itemCount)();
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const clear = useCartStore((s) => s.clear);

  const catalogueProducts = useCatalogueStore((s) => s.products);

  const handleIncrement = (item: CartItemType) => {
    const p = catalogueProducts.find((p) => p.id === item.product_id);
    if (p && p.track_stock && item.quantity >= (p.stock_qty ?? 0)) {
      setIncrementError(
        `Stock insuffisant pour « ${p.name} » : ${p.stock_qty ?? 0} disponible(s).`
      );
      return;
    }
    setIncrementError(null);
    onClearStockError?.();
    increment(item.lineId);
  };

  // Le premier article est considéré comme "actif" (dernier ajouté)
  const activeLineId = items.length > 0 ? items[items.length - 1].lineId : null;

  return (
    <section className="col-span-5 flex flex-col overflow-hidden bg-surface-container-lowest">
      {/* En-tête */}
      <div className="p-6 flex items-center justify-between border-b border-outline-variant/10">
        <h2 className="text-xl font-bold tracking-tight uppercase select-none">
          Panier Actuel
        </h2>
        {itemCount > 0 && (
          <span className="bg-surface-container-high px-3 py-1 rounded-full text-xs font-bold text-primary select-none">
            {itemCount} ARTICLE{itemCount > 1 ? "S" : ""}
          </span>
        )}
      </div>

      {/* Liste des articles */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-outline gap-3 select-none">
            <CreditCard size={48} strokeWidth={1} />
            <p className="text-sm font-medium uppercase tracking-widest">
              Panier vide
            </p>
          </div>
        ) : (
          [...items].reverse().map((item) => (
            <CartItem
              key={item.lineId}
              item={item}
              isActive={item.lineId === activeLineId}
              onIncrement={() => handleIncrement(item)}
              onDecrement={() => decrement(item.lineId)}
            />
          ))
        )}
      </div>

      {/* Totaux + actions */}
      <div className="bg-surface-container-low p-6 space-y-4">
        {/* Sous-total / TVA */}
        <div className="space-y-2">
          <div className="flex justify-between items-end text-outline">
            <span className="text-sm font-bold uppercase tracking-widest">
              Sous-total HT
            </span>
            <span className="text-base font-bold">{formatCents(totalHt)}</span>
          </div>
          <div className="flex justify-between items-end text-outline">
            <span className="text-sm font-bold uppercase tracking-widest">
              TVA
            </span>
            <span className="text-base font-bold">{formatCents(totalTva)}</span>
          </div>
        </div>

        {/* Total TTC */}
        <div className="pt-3 border-t border-outline-variant/10 flex justify-between items-center">
          <span className="text-xl font-black uppercase tracking-tighter select-none">
            Total à Payer
          </span>
          <span className="text-5xl font-black text-secondary-fixed tracking-tight select-none">
            {formatCents(totalTtc)}
          </span>
        </div>

        {/* Erreur stock */}
        {(stockError || incrementError) && (
          <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-2 text-error text-xs font-bold">
            {stockError ?? incrementError}
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-4 pt-2">
          {/* Vider panier */}
          <button
            onClick={clear}
            disabled={items.length === 0}
            className="flex-1 h-20 bg-error-container text-on-error-container rounded-xl flex flex-col items-center justify-center gap-1 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <Trash2 size={22} />
            <span className="text-xs font-black uppercase tracking-widest">
              Vider
            </span>
          </button>

          {/* Fidélité (placeholder) */}
          <button className="flex-1 h-20 bg-surface-container-highest rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-surface-bright active:scale-[0.98] transition-all">
            <Tag size={22} />
            <span className="text-xs font-black uppercase tracking-widest">
              Fidélité
            </span>
          </button>

          {/* PAYER */}
          <button
            onClick={onPay}
            disabled={items.length === 0}
            className="flex-2 h-20 px-6 bg-secondary-container text-on-secondary-container rounded-xl flex items-center justify-center gap-4 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <div className="text-left">
              <span className="block text-xs font-black uppercase tracking-widest opacity-80 leading-none">
                Confirmer la vente
              </span>
              <span className="block text-3xl font-black uppercase tracking-tighter">
                PAYER
              </span>
            </div>
            <CreditCard size={36} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </section>
  );
}
