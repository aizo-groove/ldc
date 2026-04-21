import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/utils";
import type { CartItem as CartItemType } from "../store";

interface CartItemProps {
  item: CartItemType;
  isActive?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function CartItem({
  item,
  isActive = false,
  onIncrement,
  onDecrement,
}: CartItemProps) {
  const lineTotal = item.unit_price_ttc * item.quantity - item.discount_ttc;

  return (
    <div
      className={cn(
        "p-5 rounded-xl flex items-center justify-between gap-4 transition-all",
        isActive
          ? "bg-surface-bright border-l-4 border-primary"
          : "bg-surface-container-low"
      )}
    >
      {/* Infos produit */}
      <div className="flex-1 min-w-0">
        {item.category_name && (
          <div
            className={cn(
              "text-xs font-bold mb-1 uppercase tracking-wider",
              isActive ? "text-primary" : "text-outline"
            )}
          >
            {item.category_name}
          </div>
        )}
        <h3 className="text-lg font-bold leading-tight truncate">
          {item.product_name}
        </h3>
        {item.product_sku && (
          <div className="text-sm text-outline">SKU: {item.product_sku}</div>
        )}
      </div>

      {/* Contrôle quantité */}
      <div
        className={cn(
          "flex items-center rounded-xl p-1 shrink-0",
          isActive ? "bg-surface-container-low" : "bg-surface-container-high"
        )}
      >
        <button
          onClick={onDecrement}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-lg transition-colors active:scale-95",
            isActive
              ? "hover:bg-surface-container-high text-primary"
              : "hover:bg-surface-container-highest text-on-surface"
          )}
          aria-label="Réduire quantité"
        >
          <Minus size={18} />
        </button>
        <span className="w-12 text-center font-bold text-xl select-none">
          {item.quantity}
        </span>
        <button
          onClick={onIncrement}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-lg transition-colors active:scale-95",
            isActive
              ? "hover:bg-surface-container-high text-primary"
              : "hover:bg-surface-container-highest text-on-surface"
          )}
          aria-label="Augmenter quantité"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Montant ligne */}
      <div className="text-right min-w-[80px] shrink-0">
        <div className="text-xl font-black">{formatCents(lineTotal)}</div>
      </div>
    </div>
  );
}
