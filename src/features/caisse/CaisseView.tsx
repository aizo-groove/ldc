import { useEffect, useState } from "react";
import { useCatalogueStore } from "@/features/catalogue/store";
import { useCartStore } from "./store";
import { CartPanel } from "./components/CartPanel";
import { ProductGrid } from "./components/ProductGrid";
import { ProductFormModal } from "@/features/inventaire/components/ProductFormModal";
import type { Product } from "@/types/catalogue";

interface CaisseViewProps {
  onPay: () => void;
}

export function CaisseView({ onPay }: CaisseViewProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [search, _setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const { categories, tvaRates, products, isLoading, load, getCategoryName, getTvaRatePct } =
    useCatalogueStore();
  const addProduct = useCartStore((s) => s.addProduct);
  const cartItems  = useCartStore((s) => s.items);

  const handleAddProduct = (product: Product) => {
    if (product.track_stock) {
      const currentQty = cartItems.find((i) => i.product_id === product.id)?.quantity ?? 0;
      if (currentQty >= (product.stock_qty ?? 0)) {
        setStockError(
          `Stock insuffisant pour « ${product.name} » : ${product.stock_qty ?? 0} disponible(s).`
        );
        return;
      }
    }
    setStockError(null);
    addProduct(product, getCategoryName(product.category_id), getTvaRatePct(product.tva_rate_id));
  };

  // Charge le catalogue au premier montage si vide
  useEffect(() => {
    if (products.length === 0 && !isLoading) {
      load();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProductCreated = async (saved: Product) => {
    setShowCreateModal(false);
    await load();
    addProduct(saved, getCategoryName(saved.category_id), getTvaRatePct(saved.tva_rate_id));
  };

  const baseProducts =
    activeCategoryId === null
      ? products
      : products.filter((p) => p.category_id === activeCategoryId);

  const visibleProducts = search
    ? baseProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku?.toLowerCase().includes(search.toLowerCase())
      )
    : baseProducts;

  return (
    <>
      <main className="mt-16 h-[calc(100vh-64px)] grid grid-cols-12 overflow-hidden bg-surface">
        <CartPanel onPay={onPay} stockError={stockError} onClearStockError={() => setStockError(null)} />
        <ProductGrid
          categories={categories}
          products={visibleProducts}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
          onAddProduct={handleAddProduct}
          onManualArticle={() => setShowCreateModal(true)}
        />
      </main>

      {showCreateModal && (
        <ProductFormModal
          categories={categories}
          tvaRates={tvaRates}
          defaultCategoryId={activeCategoryId}
          onClose={() => setShowCreateModal(false)}
          onSaved={handleProductCreated}
        />
      )}
    </>
  );
}
