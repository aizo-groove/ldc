import { useEffect, useState } from "react";
import { Plus, Download, FileText, Pencil, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { cn, formatCents } from "@/lib/utils";
import { useCatalogueStore } from "@/features/catalogue/store";
import { deleteProduct } from "@/lib/tauri";
import { ProductFormModal } from "./components/ProductFormModal";
import type { Product } from "@/types/catalogue";

const TVA_LABEL: Record<number, string> = {
  1: "20%", 2: "10%", 3: "5.5%", 4: "2.1%", 5: "0%",
};

const PAGE_SIZE = 10;

type StatusFilter = "tous" | "actifs" | "inactifs" | "rupture";

// ── Helpers ──────────────────────────────────────────────────

function isOutOfStock(p: Product): boolean {
  return p.track_stock === 1 && (p.stock_qty ?? 1) <= 0;
}

// ── Sous-composants ──────────────────────────────────────────

function ProductAvatar({ name, inactive }: { name: string; inactive: boolean }) {
  return (
    <div className={cn(
      "w-9 h-9 rounded-xl bg-surface-container-highest flex items-center justify-center text-sm font-black shrink-0",
      inactive ? "opacity-30 grayscale" : "text-on-surface-variant"
    )}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function StatusCell({ product }: { product: Product }) {
  const inactive = product.active === 0;
  const oos = isOutOfStock(product);

  if (inactive) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-outline-variant/20 text-outline text-[10px] font-black uppercase">
      <span className="w-1.5 h-1.5 rounded-full bg-outline" />
      Inactif
    </span>
  );
  if (oos) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error/10 text-error text-[10px] font-black uppercase">
      <span className="w-1.5 h-1.5 rounded-full bg-error" />
      Rupture
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-black uppercase">
      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
      En stock
    </span>
  );
}

interface ProductRowProps {
  product: Product;
  getCategoryName: (id: string | null) => string;
  onEdit: (p: Product) => void;
  onDeleteRequest: (id: string) => void;
  deleteConfirmId: string | null;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}

function ProductRow({
  product, getCategoryName, onEdit,
  onDeleteRequest, deleteConfirmId, onDeleteConfirm, onDeleteCancel,
}: ProductRowProps) {
  const inactive = product.active === 0;
  const confirming = deleteConfirmId === product.id;

  return (
    <tr className={cn(
      "transition-colors group",
      inactive
        ? "opacity-50 hover:opacity-80"
        : "hover:bg-surface-bright",
      confirming && "bg-error/5"
    )}>
      <td className="px-5 py-3 font-mono text-xs text-outline select-none">
        {product.sku ? `#${product.sku}` : product.id.slice(0, 6).toUpperCase()}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <ProductAvatar name={product.name} inactive={inactive} />
          <span className={cn("font-bold text-sm", inactive && "line-through text-outline")}>
            {product.name}
          </span>
        </div>
      </td>
      <td className="px-5 py-3">
        <span className="px-2 py-0.5 bg-surface-container-highest text-outline text-[10px] font-black uppercase rounded">
          {getCategoryName(product.category_id)}
        </span>
      </td>
      <td className="px-5 py-3 text-right font-black text-sm">
        {formatCents(product.price_ttc)}
      </td>
      <td className="px-5 py-3 text-center text-xs text-outline">
        {TVA_LABEL[product.tva_rate_id] ?? "—"}
      </td>
      <td className="px-5 py-3 text-center text-xs font-bold text-on-surface-variant">
        {product.track_stock === 1
          ? (product.stock_qty ?? 0)
          : <span className="text-outline">—</span>}
      </td>
      <td className="px-5 py-3 text-center">
        <StatusCell product={product} />
      </td>
      <td className="px-5 py-3 text-right">
        {confirming ? (
          <div className="flex items-center justify-end gap-2">
            <span className="text-[10px] font-bold text-error uppercase tracking-wide">Confirmer ?</span>
            <button
              onClick={() => onDeleteConfirm(product.id)}
              className="px-2 py-1 rounded bg-error text-on-error text-[10px] font-black uppercase hover:opacity-90 transition-opacity"
            >
              Oui
            </button>
            <button
              onClick={onDeleteCancel}
              className="px-2 py-1 rounded bg-surface-container-high text-on-surface text-[10px] font-black uppercase hover:bg-surface-bright transition-colors"
            >
              Non
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(product)}
              className="p-1.5 text-outline hover:text-primary transition-colors rounded-lg hover:bg-surface-container-high"
              title="Modifier"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => onDeleteRequest(product.id)}
              className="p-1.5 text-outline hover:text-error transition-colors rounded-lg hover:bg-surface-container-high"
              title="Désactiver"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Vue principale ───────────────────────────────────────────

export function InventaireView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("actifs");
  const [modalProduct, setModalProduct] = useState<Product | null | undefined>(undefined);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { allProducts, categories, tvaRates, isLoading, load, loadAll, getCategoryName } =
    useCatalogueStore();

  useEffect(() => {
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaved = async () => {
    setModalProduct(undefined);
    await Promise.all([load(), loadAll()]);
  };

  const handleDeleteConfirm = async (id: string) => {
    await deleteProduct(id);
    setDeleteConfirmId(null);
    await Promise.all([load(), loadAll()]);
  };

  // ── Filtrage ─────────────────────────────────────────────

  const byStatus = allProducts.filter((p) => {
    if (statusFilter === "actifs")   return p.active === 1;
    if (statusFilter === "inactifs") return p.active === 0;
    if (statusFilter === "rupture")  return isOutOfStock(p);
    return true;
  });

  const filtered = search
    ? byStatus.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(search.toLowerCase()) ||
        getCategoryName(p.category_id).toLowerCase().includes(search.toLowerCase())
      )
    : byStatus;

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const activeCount   = allProducts.filter((p) => p.active === 1).length;
  const inactiveCount = allProducts.filter((p) => p.active === 0).length;
  const ruptureCount  = allProducts.filter(isOutOfStock).length;
  const stockValue    = allProducts
    .filter((p) => p.active === 1)
    .reduce((sum, p) => sum + p.price_ttc * (p.stock_qty ?? 0), 0);

  const STATUS_FILTERS: { id: StatusFilter; label: string; count: number }[] = [
    { id: "tous",     label: "Tous",    count: allProducts.length },
    { id: "actifs",   label: "Actifs",  count: activeCount },
    { id: "inactifs", label: "Inactifs",count: inactiveCount },
    { id: "rupture",  label: "Rupture", count: ruptureCount },
  ];

  return (
    <>
    <main className="mt-16 p-8 h-[calc(100vh-64px)] bg-surface overflow-y-auto">
      <div className="fixed bottom-[-10%] right-[-5%] w-100 h-100 bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-[-10%] left-[14%] w-75 h-75 bg-secondary/5 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* ── En-tête ─────────────────────────────────────── */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-on-surface mb-1">
              Gestion du Catalogue
            </h1>
            <p className="text-outline text-sm">
              Gérez les produits, les prix et les niveaux de stock en temps réel.
            </p>
          </div>
          <button
            onClick={() => setModalProduct(null)}
            className="flex items-center gap-2 bg-secondary-container text-on-secondary-container px-6 py-3 rounded-full font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus size={18} />
            <span>Nouveau Produit</span>
          </button>
        </div>

        {/* ── Stats ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Produits"  value={allProducts.length.toLocaleString("fr-FR")} />
          <StatCard label="Catégories"      value={categories.length.toString()} valueClass="text-primary" />
          <StatCard label="Rupture Stock"   value={ruptureCount.toString()} valueClass="text-error" accent="error" />
          <StatCard label="Valeur Stock"    value={`${(stockValue / 100000).toFixed(1)}k€`} valueClass="text-secondary" />
        </div>

        {/* ── Tableau ─────────────────────────────────────── */}
        <div className="bg-surface-container-low rounded-2xl overflow-hidden shadow-2xl">

          {/* Barre de recherche + filtres status */}
          <div className="px-6 py-3 bg-surface-container border-b border-outline-variant/10 flex items-center gap-4">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Filtrer par nom, SKU ou catégorie…"
              className="bg-transparent text-sm text-on-surface placeholder:text-outline outline-none flex-1"
            />
            <div className="flex gap-1 shrink-0">
              {STATUS_FILTERS.map(({ id, label, count }) => (
                <button
                  key={id}
                  onClick={() => { setStatusFilter(id); setPage(1); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-colors flex items-center gap-1.5",
                    statusFilter === id
                      ? "bg-primary text-on-primary"
                      : "text-outline hover:bg-surface-container-high"
                  )}
                >
                  {id === "rupture" && count > 0 && <AlertTriangle size={11} />}
                  {label}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px]",
                    statusFilter === id ? "bg-white/20" : "bg-surface-container-high"
                  )}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high border-b border-outline-variant/10">
                  {[
                    { label: "Réf",       cls: "" },
                    { label: "Produit",   cls: "" },
                    { label: "Catégorie", cls: "" },
                    { label: "Prix TTC",  cls: "text-right" },
                    { label: "TVA",       cls: "text-center" },
                    { label: "Stock",     cls: "text-center" },
                    { label: "Statut",    cls: "text-center" },
                    { label: "Actions",   cls: "text-right" },
                  ].map(({ label, cls }) => (
                    <th key={label} className={cn("px-5 py-3 text-[10px] font-black text-outline uppercase tracking-widest", cls)}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {isLoading ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-outline text-sm">Chargement…</td></tr>
                ) : pageItems.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-outline text-sm">Aucun produit trouvé</td></tr>
                ) : (
                  pageItems.map((p) => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      getCategoryName={getCategoryName}
                      onEdit={(p) => setModalProduct(p)}
                      onDeleteRequest={(id) => setDeleteConfirmId(id)}
                      deleteConfirmId={deleteConfirmId}
                      onDeleteConfirm={handleDeleteConfirm}
                      onDeleteCancel={() => setDeleteConfirmId(null)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-surface-container-high px-6 py-4 flex items-center justify-between border-t border-outline-variant/10">
            <p className="text-xs text-outline">
              Affichage de{" "}
              <span className="text-on-surface font-bold">
                {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
              </span>{" "}
              sur <span className="text-on-surface font-bold">{filtered.length.toLocaleString("fr-FR")}</span> produits
            </p>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded bg-surface-container-low text-outline hover:bg-surface-bright disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-bold transition-colors",
                    n === currentPage ? "bg-primary text-on-primary" : "bg-surface-container-low text-outline hover:bg-surface-bright"
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded bg-surface-container-low text-outline hover:bg-surface-bright disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Export */}
        <div className="mt-8 flex justify-end">
          <div className="bg-surface-container-highest p-4 rounded-2xl flex items-center gap-6 shadow-xl border border-outline-variant/5">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-outline uppercase tracking-widest">Dernière Exportation</span>
              <span className="text-xs text-on-surface">Aujourd'hui, 08:45</span>
            </div>
            <div className="h-8 w-px bg-outline-variant/20" />
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface text-xs font-bold rounded-xl hover:bg-surface-bright transition-all active:scale-95">
                <Download size={14} />CSV
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface text-xs font-bold rounded-xl hover:bg-surface-bright transition-all active:scale-95">
                <FileText size={14} />PDF
              </button>
            </div>
          </div>
        </div>

      </div>
    </main>

    {modalProduct !== undefined && (
      <ProductFormModal
        product={modalProduct ?? undefined}
        categories={categories}
        tvaRates={tvaRates}
        onClose={() => setModalProduct(undefined)}
        onSaved={handleSaved}
      />
    )}
    </>
  );
}

// ── StatCard ─────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  valueClass?: string;
  accent?: "error";
}

function StatCard({ label, value, valueClass, accent }: StatCardProps) {
  return (
    <div className={cn("bg-surface-container-low p-5 rounded-xl", accent === "error" && "border-l-4 border-error/50")}>
      <p className="text-[11px] text-outline uppercase tracking-widest mb-1 select-none">{label}</p>
      <p className={cn("text-2xl font-black", valueClass ?? "text-on-surface")}>{value}</p>
    </div>
  );
}
