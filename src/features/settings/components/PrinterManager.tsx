import { useEffect, useState } from "react";
import { Plus, Printer, Monitor, Pencil, Trash2, Wifi, WifiOff, Loader2, X, ChefHat, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { listPrinters, createPrinter, updatePrinter, deletePrinter, testPrinterById } from "@/lib/tauri";
import type { Printer as PrinterModel, PrinterInput } from "@/types/printer";
import { printerHasRole } from "@/types/printer";
import type { PrinterStatus } from "@/features/print/types";

// ── Printer card ──────────────────────────────────────────────

interface CardProps {
  printer: PrinterModel;
  onEdit:   () => void;
  onDelete: () => void;
}

function PrinterCard({ printer: p, onEdit, onDelete }: CardProps) {
  const [testing, setTesting] = useState(false);
  const [status,  setStatus]  = useState<PrinterStatus | null>(null);

  const test = async () => {
    setTesting(true);
    setStatus(null);
    try {
      setStatus(await testPrinterById(p.id));
    } catch {
      setStatus({ connected: false, ip: "", port: 0 });
    } finally {
      setTesting(false);
    }
  };

  const isScreen  = p.printer_type === "screen";
  const hasReceipt = printerHasRole(p, "receipt");
  const hasKitchen = printerHasRole(p, "kitchen");

  return (
    <div className="flex items-center gap-4 bg-surface-container rounded-2xl px-4 py-3">
      {/* Type icon */}
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        isScreen ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary",
      )}>
        {isScreen ? <Monitor size={20} /> : <Printer size={20} />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm text-on-surface truncate">{p.name}</p>
        <p className="text-[10px] text-outline truncate">
          {isScreen ? "Affichage à l'écran" : `${p.ip ?? "IP non définie"}:${p.port} · ${p.paper_mm} mm`}
        </p>
        {/* Role badges */}
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {hasReceipt && (
            <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
              <Receipt size={8} /> Clients
            </span>
          )}
          {hasKitchen && (
            <span className="inline-flex items-center gap-1 bg-tertiary/10 text-tertiary text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
              <ChefHat size={8} /> Cuisine
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Connection status */}
        {status && (
          <span className={cn("flex items-center gap-1 text-[10px] font-bold", status.connected ? "text-secondary" : "text-error")}>
            {status.connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {status.connected ? "OK" : "KO"}
          </span>
        )}
        {!isScreen && (
          <button
            onClick={test}
            disabled={testing}
            title="Tester la connexion"
            className="w-8 h-8 rounded-xl bg-surface-container-high flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-bright transition-colors disabled:opacity-40"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
          </button>
        )}
        <button
          onClick={onEdit}
          title="Modifier"
          className="w-8 h-8 rounded-xl bg-surface-container-high flex items-center justify-center text-outline hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          title="Supprimer"
          className="w-8 h-8 rounded-xl bg-surface-container-high flex items-center justify-center text-outline hover:text-error hover:bg-error/10 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Add / Edit drawer ─────────────────────────────────────────

const EMPTY_INPUT: PrinterInput = {
  name: "",
  printer_type: "thermal_tcp",
  ip: null,
  port: 9100,
  paper_mm: 80,
  roles: "receipt",
};

interface DrawerProps {
  initial?: PrinterModel | null;
  onSaved: (p: PrinterModel) => void;
  onClose: () => void;
}

function PrinterDrawer({ initial, onSaved, onClose }: DrawerProps) {
  const [form, setForm] = useState<PrinterInput>(
    initial
      ? { name: initial.name, printer_type: initial.printer_type, ip: initial.ip, port: initial.port, paper_mm: initial.paper_mm, roles: initial.roles }
      : EMPTY_INPUT,
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const set = <K extends keyof PrinterInput>(k: K, v: PrinterInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleRole = (role: "receipt" | "kitchen") => {
    const parts = form.roles.split(",").map((r) => r.trim()).filter(Boolean);
    const next  = parts.includes(role) ? parts.filter((r) => r !== role) : [...parts, role];
    if (next.length === 0) return; // at least one role required
    set("roles", next.join(","));
  };

  const hasRole = (role: "receipt" | "kitchen") =>
    form.roles.split(",").map((r) => r.trim()).includes(role);

  const save = async () => {
    if (!form.name.trim()) { setError("Le nom est requis."); return; }
    if (form.printer_type === "thermal_tcp" && !form.ip?.trim()) {
      setError("L'adresse IP est requise pour une imprimante thermique."); return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = initial
        ? await updatePrinter(initial.id, form)
        : await createPrinter(form);
      onSaved(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-container-low rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:w-125 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <h3 className="font-black text-sm uppercase tracking-widest">
            {initial ? "Modifier l'imprimante" : "Ajouter une imprimante"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Type selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Type</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: "thermal_tcp", icon: <Printer size={20} />, label: "Thermique TCP/IP", sub: "Imprimante ESC/POS réseau" },
                { id: "screen",      icon: <Monitor size={20} />, label: "Affichage écran",  sub: "Sans imprimante" },
              ] as { id: PrinterInput["printer_type"]; icon: React.ReactNode; label: string; sub: string }[]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => set("printer_type", t.id)}
                  className={cn(
                    "flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all",
                    form.printer_type === t.id
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant/20 hover:border-outline-variant/40",
                  )}
                >
                  <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                    form.printer_type === t.id ? "bg-primary text-on-primary" : "bg-surface-container-highest text-outline")}>
                    {t.icon}
                  </span>
                  <div>
                    <p className={cn("font-black text-xs", form.printer_type === t.id ? "text-primary" : "text-on-surface")}>{t.label}</p>
                    <p className="text-[10px] text-outline mt-0.5 leading-snug">{t.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Nom</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={form.printer_type === "screen" ? "Affichage caisse" : "Imprimante caisse"}
              className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* TCP fields */}
          {form.printer_type === "thermal_tcp" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Adresse IP</label>
                  <input
                    value={form.ip ?? ""}
                    onChange={(e) => set("ip", e.target.value || null)}
                    placeholder="192.168.1.100"
                    className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Port</label>
                  <input
                    value={form.port}
                    onChange={(e) => set("port", Number(e.target.value) || 9100)}
                    placeholder="9100"
                    type="number"
                    className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Largeur du papier</label>
                <div className="flex gap-3">
                  {(["58", "80"] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => set("paper_mm", Number(w))}
                      className={cn(
                        "flex-1 h-10 rounded-xl text-sm font-bold border-2 transition-all",
                        form.paper_mm === Number(w)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-outline-variant/20 text-outline hover:border-outline-variant/50",
                      )}
                    >
                      {w} mm
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Roles */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Utiliser pour</label>
            <div className="flex gap-3">
              {([
                { role: "receipt" as const, icon: <Receipt size={14} />,  label: "Tickets clients" },
                { role: "kitchen" as const, icon: <ChefHat size={14} />,  label: "Tickets cuisine" },
              ]).map(({ role, icon, label }) => (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  className={cn(
                    "flex-1 h-10 rounded-xl text-xs font-bold border-2 flex items-center justify-center gap-2 transition-all",
                    hasRole(role)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-outline-variant/20 text-outline hover:border-outline-variant/50",
                  )}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-xs font-medium">{error}</div>
          )}

          {/* Save */}
          <button
            onClick={save}
            disabled={saving}
            className={cn(
              "w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50",
              "bg-primary text-on-primary hover:brightness-110",
            )}
          >
            {saving ? <Loader2 size={18} className="animate-spin mx-auto" /> : initial ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main manager ──────────────────────────────────────────────

export function PrinterManager() {
  const [printers, setPrinters]   = useState<PrinterModel[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [drawer,   setDrawer]     = useState<PrinterModel | null | undefined>(undefined);
  // undefined = closed, null = add new, PrinterModel = edit

  useEffect(() => {
    listPrinters()
      .then(setPrinters)
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (p: PrinterModel) => {
    setPrinters((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      return idx >= 0 ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p];
    });
    setDrawer(undefined);
  };

  const handleDelete = async (id: string) => {
    await deletePrinter(id);
    setPrinters((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <>
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-outline animate-pulse text-xs uppercase tracking-widest">
            Chargement…
          </div>
        ) : printers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-outline">
            <Printer size={32} strokeWidth={1} />
            <p className="text-sm font-bold">Aucune imprimante configurée</p>
            <p className="text-xs text-center max-w-64 leading-snug">
              Ajoutez une imprimante thermique TCP/IP ou activez l'affichage écran pour fonctionner sans imprimante.
            </p>
          </div>
        ) : (
          printers.map((p) => (
            <PrinterCard
              key={p.id}
              printer={p}
              onEdit={() => setDrawer(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))
        )}

        <button
          onClick={() => setDrawer(null)}
          className="w-full h-10 rounded-xl border-2 border-dashed border-outline-variant/30 text-outline hover:border-primary/50 hover:text-primary hover:bg-primary/5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide transition-all"
        >
          <Plus size={14} /> Ajouter une imprimante
        </button>

        {printers.length > 0 && (
          <p className="text-[10px] text-outline/60 text-center leading-snug">
            Une imprimante avec les rôles "Clients" et "Cuisine" gère les deux flux.
            Sans imprimante cuisine configurée, la caisse est utilisée en fallback.
          </p>
        )}
      </div>

      {drawer !== undefined && (
        <PrinterDrawer
          initial={drawer}
          onSaved={handleSaved}
          onClose={() => setDrawer(undefined)}
        />
      )}
    </>
  );
}
