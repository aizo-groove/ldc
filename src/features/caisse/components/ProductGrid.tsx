import { cn } from "@/lib/utils";
import type { Category, Product } from "@/types/catalogue";
import { ProductCard, ManualArticleCard } from "./ProductCard";

interface ProductGridProps {
  categories: Category[];
  products: Product[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onAddProduct: (product: Product, categoryName?: string) => void;
  onManualArticle: () => void;
}

export function ProductGrid({
  categories,
  products,
  activeCategoryId,
  onSelectCategory,
  onAddProduct,
  onManualArticle,
}: ProductGridProps) {
  const filtered =
    activeCategoryId === null
      ? products
      : products.filter((p) => p.category_id === activeCategoryId);

  const getCategoryName = (categoryId: string | null) =>
    categories.find((c) => c.id === categoryId)?.name ?? "";

  return (
    <section className="col-span-7 flex flex-col bg-surface p-6 gap-6 overflow-hidden">
      {/* Onglets catégories */}
      <div className="flex gap-3 overflow-x-auto pb-1 shrink-0 scrollbar-hide">
        <button
          onClick={() => onSelectCategory(null)}
          className={cn(
            "whitespace-nowrap px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-colors shrink-0",
            activeCategoryId === null
              ? "bg-primary text-on-primary"
              : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
          )}
        >
          Tous
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={cn(
              "whitespace-nowrap px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-colors shrink-0",
              activeCategoryId === cat.id
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grille produits */}
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto flex-1 content-start">
        {filtered.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            categoryName={getCategoryName(product.category_id)}
            onAdd={(p) => onAddProduct(p, getCategoryName(p.category_id))}
          />
        ))}
        <ManualArticleCard onAdd={onManualArticle} />
      </div>
    </section>
  );
}
