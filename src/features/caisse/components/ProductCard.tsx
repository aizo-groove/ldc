import { PlusCircle } from "lucide-react";
import { formatCents } from "@/lib/utils";
import type { Product } from "@/types/catalogue";

interface ProductCardProps {
  product: Product;
  categoryName?: string;
  onAdd: (product: Product) => void;
}

/** Indicateur visuel de gamme de prix */
function PriceRange({ priceTtc }: { priceTtc: number }) {
  if (priceTtc < 200) return <span className="text-sm font-black text-primary opacity-60 group-hover:opacity-100 transition-opacity">€</span>;
  if (priceTtc < 500) return <span className="text-sm font-black text-primary opacity-60 group-hover:opacity-100 transition-opacity">€€</span>;
  return <span className="text-sm font-black text-primary opacity-60 group-hover:opacity-100 transition-opacity">€€€</span>;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <button
      onClick={() => onAdd(product)}
      className="aspect-square bg-surface-container-high rounded-xl p-4 flex flex-col justify-between items-start text-left hover:bg-surface-container-highest active:scale-95 transition-all group"
    >
      <PriceRange priceTtc={product.price_ttc} />
      <div className="w-full">
        <div className="font-bold text-base leading-tight uppercase mb-1 line-clamp-2">
          {product.name}
        </div>
        {product.description && (
          <div className="text-xs font-medium text-outline line-clamp-1">
            {product.description}
          </div>
        )}
      </div>
      <div className="mt-2 text-xl font-black">
        {formatCents(product.price_ttc)}
      </div>
    </button>
  );
}

/** Bouton "Article Manuel" — entrée libre */
export function ManualArticleCard({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="aspect-square bg-surface-container-highest rounded-xl p-4 flex flex-col justify-center items-center text-center hover:bg-surface-bright active:scale-95 transition-all border-2 border-dashed border-outline-variant/30"
    >
      <PlusCircle size={32} className="mb-2 text-primary" />
      <div className="font-bold text-sm uppercase tracking-widest">
        Article Manuel
      </div>
    </button>
  );
}
