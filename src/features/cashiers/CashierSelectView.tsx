import { useEffect, useState } from "react";
import { User, Delete, Settings2, X, Check, Pencil, Trash2, KeyRound, Plus, Euro } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCashiersStore } from "./store";
import { useSessionStore } from "@/features/session/store";
import { verifyCashierPin } from "@/lib/tauri";
import type { Cashier } from "@/types/cashier";

interface CashierSelectViewProps {
  onSelect: (cashier: Cashier, openingFloat?: number) => void;
}

type Mode = "list" | "cashier-pin" | "manager-pin" | "float-entry" | "manage";
type CashierForm = { name: string; pin: string; role: "cashier" | "manager" };
const EMPTY_FORM: CashierForm = { name: "", pin: "", role: "cashier" };

export function CashierSelectView({ onSelect }: CashierSelectViewProps) {
  const { cashiers, isLoading, load, add, update, remove } = useCashiersStore();
  const { session } = useSessionStore();

  const [mode, setMode]                   = useState<Mode>("list");
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);

  // Float entry state
  const [floatStr, setFloatStr]           = useState("0,00");

  // Cashier PIN state
  const [cashierPin, setCashierPin]       = useState("");
  const [cashierPinError, setCashierPinError] = useState<string | null>(null);

  // Manager PIN state
  const [managerPin, setManagerPin]       = useState("");
  const [managerPinError, setManagerPinError] = useState<string | null>(null);

  // Manage mode state
  const [editingId, setEditingId]         = useState<string | null | "new">(null);
  const [form, setForm]                   = useState<CashierForm>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving]               = useState(false);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cashier selection ────────────────────────────────────

  const openFloatEntry = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setFloatStr("0,00");
    setMode("float-entry");
  };

  const confirmFloat = () => {
    if (!selectedCashier) return;
    const cents = Math.round(
      parseFloat(floatStr.replace(",", ".").replace(/[^0-9.]/g, "") || "0") * 100
    );
    onSelect(selectedCashier, cents);
  };

  const handleSelectCashier = (cashier: Cashier) => {
    if (!cashier.pin) {
      if (!session) { openFloatEntry(cashier); return; }
      onSelect(cashier);
      return;
    }
    setSelectedCashier(cashier);
    setCashierPin("");
    setCashierPinError(null);
    setMode("cashier-pin");
  };

  const handleCashierPinDigit = (digit: string) => {
    if (cashierPin.length >= 4) return;
    const next = cashierPin + digit;
    setCashierPin(next);
    if (next.length === 4) verifyCashierPinFlow(next);
  };

  const verifyCashierPinFlow = async (entered: string) => {
    if (!selectedCashier) return;
    const ok = await verifyCashierPin(selectedCashier.id, entered);
    if (ok) {
      if (!session) { openFloatEntry(selectedCashier); return; }
      onSelect(selectedCashier);
    } else {
      setCashierPin("");
      setCashierPinError("PIN incorrect");
    }
  };

  // ── Float entry screen ───────────────────────────────────

  if (mode === "float-entry" && selectedCashier) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-1">
            <span className="text-xl font-black text-primary">
              {selectedCashier.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">{selectedCashier.name}</h2>
          <p className="text-sm text-outline">Fonds de caisse à l'ouverture</p>
        </div>

        <div className="w-72 space-y-4">
          <div className="relative">
            <Euro size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              value={floatStr}
              onChange={(e) => setFloatStr(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => { if (e.key === "Enter") confirmFloat(); }}
              className="w-full bg-surface-container-high rounded-2xl pl-10 pr-4 py-4 text-2xl font-black text-right outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
            />
          </div>
          <p className="text-xs text-outline text-center">
            Entrez le montant espèces en caisse. Mettez 0 si vous ne gérez pas les espèces.
          </p>
          <button
            onClick={confirmFloat}
            className="w-full py-4 bg-primary text-on-primary rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Ouvrir la session
          </button>
          <button
            onClick={() => setMode("list")}
            className="w-full py-2 text-outline text-xs font-bold uppercase tracking-wide hover:text-on-surface transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // ── Manager access ───────────────────────────────────────

  const openManagerAccess = () => {
    const managers = cashiers.filter((c) => c.role === "manager");
    if (managers.length === 0) {
      // No manager configured yet — open directly (first-time setup)
      setMode("manage");
      return;
    }
    setManagerPin("");
    setManagerPinError(null);
    setMode("manager-pin");
  };

  const handleManagerPinDigit = (digit: string) => {
    if (managerPin.length >= 4) return;
    const next = managerPin + digit;
    setManagerPin(next);
    if (next.length === 4) verifyManagerPinFlow(next);
  };

  const verifyManagerPinFlow = async (entered: string) => {
    const managers = cashiers.filter((c) => c.role === "manager");
    for (const mgr of managers) {
      const ok = await verifyCashierPin(mgr.id, entered);
      if (ok) {
        setManagerPin("");
        setMode("manage");
        return;
      }
    }
    setManagerPin("");
    setManagerPinError("PIN responsable incorrect");
  };

  // ── Cashier CRUD ─────────────────────────────────────────

  const openNew = () => { setForm(EMPTY_FORM); setEditingId("new"); };
  const openEdit = (c: Cashier) => {
    setForm({ name: c.name, pin: "", role: c.role as CashierForm["role"] });
    setEditingId(c.id);
  };
  const closeForm = () => { setEditingId(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const pin = form.pin.trim() || null;
      if (editingId === "new") {
        await add(form.name.trim(), pin, form.role);
      } else if (editingId) {
        await update(editingId, form.name.trim(), pin, form.role);
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  // ── PIN pad shared component ─────────────────────────────

  const PinPad = ({
    title,
    subtitle,
    pin,
    error,
    onDigit,
    onBackspace,
    onBack,
  }: {
    title: string;
    subtitle: string;
    pin: string;
    error: string | null;
    onDigit: (d: string) => void;
    onBackspace: () => void;
    onBack: () => void;
  }) => (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center">
          <User size={36} className="text-primary" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight">{title}</h2>
        <p className="text-sm text-outline">{subtitle}</p>
      </div>

      <div className="flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "w-4 h-4 rounded-full border-2 transition-all",
              i < pin.length ? "bg-primary border-primary" : "border-outline"
            )}
          />
        ))}
      </div>

      {error && <p className="text-error text-sm font-bold">{error}</p>}

      <div className="grid grid-cols-3 gap-3 w-64">
        {["1","2","3","4","5","6","7","8","9"].map((d) => (
          <button
            key={d}
            onClick={() => onDigit(d)}
            className="h-16 rounded-2xl bg-surface-container-high text-2xl font-black hover:bg-surface-container-highest active:scale-95 transition-all"
          >
            {d}
          </button>
        ))}
        <button
          onClick={onBack}
          className="h-16 rounded-2xl bg-surface-container-low text-xs font-bold text-outline hover:bg-surface-container-high active:scale-95 transition-all uppercase tracking-wide"
        >
          Retour
        </button>
        <button
          onClick={() => onDigit("0")}
          className="h-16 rounded-2xl bg-surface-container-high text-2xl font-black hover:bg-surface-container-highest active:scale-95 transition-all"
        >
          0
        </button>
        <button
          onClick={onBackspace}
          className="h-16 rounded-2xl bg-surface-container-low flex items-center justify-center hover:bg-surface-container-high active:scale-95 transition-all text-outline hover:text-on-surface"
        >
          <Delete size={22} />
        </button>
      </div>
    </div>
  );

  // ── Cashier PIN screen ───────────────────────────────────

  if (mode === "cashier-pin" && selectedCashier) {
    return (
      <PinPad
        title={selectedCashier.name}
        subtitle="Entrez votre code PIN"
        pin={cashierPin}
        error={cashierPinError}
        onDigit={handleCashierPinDigit}
        onBackspace={() => { setCashierPin((p) => p.slice(0, -1)); setCashierPinError(null); }}
        onBack={() => { setMode("list"); setSelectedCashier(null); }}
      />
    );
  }

  // ── Manager PIN screen ───────────────────────────────────

  if (mode === "manager-pin") {
    return (
      <PinPad
        title="Accès responsable"
        subtitle="Entrez le PIN responsable"
        pin={managerPin}
        error={managerPinError}
        onDigit={handleManagerPinDigit}
        onBackspace={() => { setManagerPin((p) => p.slice(0, -1)); setManagerPinError(null); }}
        onBack={() => setMode("list")}
      />
    );
  }

  // ── Manage screen ────────────────────────────────────────

  if (mode === "manage") {
    return (
      <div className="fixed inset-0 bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-outline-variant/10">
          <h1 className="text-2xl font-black uppercase tracking-tight">Gestion des caissiers</h1>
          <button
            onClick={() => { setMode("list"); closeForm(); setConfirmDelete(null); }}
            className="p-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-xl mx-auto space-y-3">

            {/* Add button */}
            {editingId === null && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={openNew}
                  className="flex items-center gap-2 px-3 py-1.5 bg-secondary-container text-on-secondary-container rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all"
                >
                  <Plus size={13} /> Ajouter
                </button>
              </div>
            )}

            {/* Cashier list */}
            {cashiers.map((c) => (
              <div key={c.id} className="bg-surface-container-low rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                  <span className="text-sm font-black text-primary">{c.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{c.name}</p>
                  <p className="text-[10px] text-outline uppercase tracking-wide">
                    {c.role === "manager" ? "Responsable" : "Caissier"}
                    {c.pin ? " · PIN actif" : ""}
                  </p>
                </div>

                {confirmDelete === c.id ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-error font-bold">Supprimer ?</span>
                    <button
                      onClick={() => { remove(c.id); setConfirmDelete(null); }}
                      className="px-2 py-1 bg-error text-on-error rounded-lg font-bold"
                    >
                      Oui
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-2 py-1 bg-surface-container-high rounded-lg font-bold"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container-high transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(c.id)}
                      disabled={cashiers.length <= 1}
                      className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-surface-container-high transition-colors disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Add / edit form */}
            {editingId !== null && (
              <div className="bg-surface-container rounded-xl p-4 space-y-3 border border-outline-variant/20">
                <p className="text-xs font-black text-outline uppercase tracking-widest">
                  {editingId === "new" ? "Nouveau caissier" : "Modifier"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] text-outline uppercase tracking-wide block mb-1">Nom</label>
                    <input
                      autoFocus
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") closeForm(); }}
                      className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="Prénom ou pseudonyme"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-outline uppercase tracking-wide flex items-center gap-1 mb-1">
                      <KeyRound size={10} /> PIN (optionnel)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={form.pin}
                      onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "") }))}
                      className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder={editingId !== "new" ? "Laisser vide = inchangé" : "4 chiffres"}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-outline uppercase tracking-wide block mb-1">Rôle</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as CashierForm["role"] }))}
                      className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="cashier">Caissier</option>
                      <option value="manager">Responsable</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={closeForm}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-outline hover:bg-surface-container-high transition-colors"
                  >
                    <X size={12} /> Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!form.name.trim() || saving}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                  >
                    <Check size={12} /> {saving ? "…" : "Enregistrer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Cashier list (default) ───────────────────────────────

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-8 px-8">
      <div className="text-center">
        <h1 className="text-3xl font-black uppercase tracking-tight">LDC POS</h1>
        <p className="text-outline text-sm mt-1">Qui encaisse ?</p>
      </div>

      {isLoading ? (
        <p className="text-outline text-sm animate-pulse uppercase tracking-widest">Chargement…</p>
      ) : (
        <div className="flex flex-wrap gap-4 justify-center max-w-2xl">
          {cashiers.map((cashier) => (
            <button
              key={cashier.id}
              onClick={() => handleSelectCashier(cashier)}
              className="flex flex-col items-center gap-3 p-6 w-40 bg-surface-container-low rounded-2xl hover:bg-surface-container-high hover:scale-105 active:scale-95 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
                <span className="text-2xl font-black text-primary">
                  {cashier.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="font-bold text-sm text-center leading-tight">{cashier.name}</span>
              {cashier.pin && (
                <span className="text-[10px] text-outline uppercase tracking-wide">PIN requis</span>
              )}
            </button>
          ))}

          <button
            onClick={openManagerAccess}
            className="flex flex-col items-center gap-3 p-6 w-40 border-2 border-dashed border-outline/30 rounded-2xl hover:border-outline/60 hover:bg-surface-container-low active:scale-95 transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
              <Settings2 size={24} className="text-outline" />
            </div>
            <span className="font-bold text-xs text-outline text-center">Gérer les caissiers</span>
          </button>
        </div>
      )}
    </div>
  );
}
