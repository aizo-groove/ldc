/**
 * PaymentView — Dynamic Ledger avec gestion multi-personnes.
 *
 * Chaque "personne" est un groupe de paiements. Le bouton "Personne suivante"
 * ferme le groupe courant et en ouvre un nouveau. Quand la validation est confirmée,
 * on passe au App.tsx :
 *   - PaymentInput[]  → backend (liste plate)
 *   - PersonGroup[]   → frontend (groupes pour la gestion des reçus)
 */
import { useState } from "react";
import { useSettingsStore } from "@/features/settings/store";
import {
  ArrowLeft, CreditCard, Banknote, FileText, Tag,
  CheckCircle, Trash2, Delete, UserPlus,
} from "lucide-react";
import { GhostSideNav } from "@/components/layout/GhostSideNav";
import { formatCents, cn } from "@/lib/utils";
import type { PaymentInput, PaymentMethod, PersonGroup } from "@/types/transaction";

// ── Constants ─────────────────────────────────────────────────

const MAX_CENTS = 9_999_999;

const METHODS = [
  { id: "CB"          as PaymentMethod, label: "Carte Bancaire", icon: <CreditCard size={22} strokeWidth={1.4} />, textColor: "text-primary",          borderHover: "hover:border-primary" },
  { id: "ESPECES"     as PaymentMethod, label: "Espèces",        icon: <Banknote   size={22} strokeWidth={1.4} />, textColor: "text-secondary",        borderHover: "hover:border-secondary" },
  { id: "CHEQUE"      as PaymentMethod, label: "Chèque",         icon: <FileText   size={22} strokeWidth={1.4} />, textColor: "text-tertiary",         borderHover: "hover:border-tertiary" },
  { id: "TITRE_RESTO" as PaymentMethod, label: "Titre Resto",    icon: <Tag        size={22} strokeWidth={1.4} />, textColor: "text-primary-fixed-dim", borderHover: "hover:border-primary-fixed-dim" },
] as const;

const METHOD_LABEL: Record<string, string> = {
  CB: "CB", ESPECES: "Espèces", CHEQUE: "Chèque",
  TITRE_RESTO: "Titre Resto", VIREMENT: "Virement", AVOIR: "Avoir", AUTRE: "Autre",
};

const METHOD_BORDER: Record<string, string> = {
  CB: "border-primary", ESPECES: "border-secondary", CHEQUE: "border-tertiary",
  TITRE_RESTO: "border-primary-fixed-dim", VIREMENT: "border-outline",
  AVOIR: "border-error", AUTRE: "border-outline",
};

const METHOD_ICON: Record<string, React.ReactNode> = {
  CB:          <CreditCard size={16} strokeWidth={1.4} />,
  ESPECES:     <Banknote   size={16} strokeWidth={1.4} />,
  CHEQUE:      <FileText   size={16} strokeWidth={1.4} />,
  TITRE_RESTO: <Tag        size={16} strokeWidth={1.4} />,
};

// ── Types ─────────────────────────────────────────────────────

interface LedgerEntry {
  id: string;
  method: PaymentMethod;
  amount: number;
  cashGiven: number | null;
  time: string;
}

interface PersonState {
  label: string;
  entries: LedgerEntry[];
}

interface PaymentViewProps {
  totalTtc: number;
  orderNumber: number;
  onBack: () => void;
  onValidate: (payments: PaymentInput[], groups: PersonGroup[]) => Promise<void>;
  error?: string | null;
}

// ── Component ─────────────────────────────────────────────────

export function PaymentView({
  totalTtc,
  orderNumber,
  onBack,
  onValidate,
  error,
}: PaymentViewProps) {
  const hasSplitBill = useSettingsStore((s) => s.flags.hasSplitBill);
  const [persons, setPersons]             = useState<PersonState[]>([{ label: "Personne 1", entries: [] }]);
  const [currentPersonIdx, setCurrentPersonIdx] = useState(0);
  const [draftCents, setDraftCents]       = useState(0);
  const [isValidating, setIsValidating]   = useState(false);
  const [customN, setCustomN]             = useState<number | null>(null);

  // ── Derived ───────────────────────────────────────────────

  const ledger      = persons.flatMap((p) => p.entries);
  const totalPaid   = ledger.reduce((s, e) => s + e.amount, 0);
  const remaining   = Math.max(0, totalTtc - totalPaid);

  const draftDisplay    = draftCents > 0 ? draftCents : remaining;
  const effectiveCharge = Math.min(draftDisplay, remaining);
  const change          = draftCents > 0 && draftCents > remaining ? draftCents - remaining : 0;

  const canValidate     = remaining <= 0 && ledger.length > 0;
  const currentPerson   = persons[currentPersonIdx];
  const canNextPerson   = currentPerson.entries.length > 0 && remaining > 0;

  // ── Numpad ────────────────────────────────────────────────

  const NUMPAD_KEYS = ["1","2","3","4","5","6","7","8","9","DEL","0","00"];

  function numpadPress(key: string) {
    if (key === "DEL")   { setDraftCents((c) => Math.floor(c / 10)); return; }
    if (key === "00")    { setDraftCents((c) => Math.min(c * 100, MAX_CENTS)); return; }
    if (key === "EXACT") { setDraftCents(remaining); return; }
    setDraftCents((c) => Math.min(c * 10 + parseInt(key), MAX_CENTS));
  }

  // ── Payment actions ───────────────────────────────────────

  function handleMethod(method: PaymentMethod) {
    if (effectiveCharge <= 0) return;
    const entry: LedgerEntry = {
      id:        `${Date.now()}-${Math.random()}`,
      method,
      amount:    effectiveCharge,
      cashGiven: method === "ESPECES" ? draftDisplay : null,
      time:      new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
    setPersons((prev) =>
      prev.map((p, i) =>
        i === currentPersonIdx ? { ...p, entries: [...p.entries, entry] } : p
      )
    );
    setDraftCents(0);
  }

  function removeEntry(entryId: string) {
    setPersons((prev) =>
      prev.map((p) => ({ ...p, entries: p.entries.filter((e) => e.id !== entryId) }))
    );
  }

  // ── Person management ─────────────────────────────────────

  function handleNextPerson() {
    if (!canNextPerson) return;
    setPersons((prev) => [
      ...prev,
      { label: `Personne ${prev.length + 1}`, entries: [] },
    ]);
    setCurrentPersonIdx((i) => i + 1);
    setDraftCents(0);
  }

  // ── Split shortcuts (pre-fill numpad) ─────────────────────

  function applySplit(n: number) {
    setDraftCents(Math.min(Math.ceil(remaining / n), remaining));
    setCustomN(null);
  }

  // ── Validate ──────────────────────────────────────────────

  async function handleValidate() {
    if (!canValidate || isValidating) return;
    setIsValidating(true);
    try {
      const flatPayments: PaymentInput[] = ledger.map((e) => ({
        method:     e.method,
        amount:     e.amount,
        cash_given: e.cashGiven,
      }));

      // Compute person groups with their payment indices
      let idx = 0;
      const groups: PersonGroup[] = persons
        .filter((p) => p.entries.length > 0)
        .map((p) => {
          const paymentIndices = p.entries.map((_, i) => idx + i);
          idx += p.entries.length;
          return {
            label:          p.label,
            paymentIndices,
            total:          p.entries.reduce((s, e) => s + e.amount, 0),
          };
        });

      await onValidate(flatPayments, groups);
    } finally {
      setIsValidating(false);
    }
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-surface text-on-surface flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-surface border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-primary hover:opacity-70 transition-opacity active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-black uppercase tracking-wider text-primary">
            PAIEMENT / COMMANDE #{orderNumber}
          </h1>
        </div>
      </header>

      {error && (
        <div className="shrink-0 bg-error/10 border-b border-error/30 px-8 py-3 text-error text-sm font-medium">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <GhostSideNav />

        <div className="ml-20 flex-1 grid grid-cols-12 overflow-hidden">

          {/* ── LEFT : Ledger ───────────────────────────────── */}
          <section className="col-span-8 flex flex-col border-r border-outline-variant/10 overflow-hidden">

            {/* Reste à payer */}
            <div className="px-8 py-6 bg-surface-container-low flex flex-col items-center justify-center text-center shrink-0">
              <span className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-2">
                {remaining <= 0 ? "Solde soldé" : "Reste à payer"}
              </span>
              <div className="font-black leading-none tracking-tighter">
                <span className={cn("text-[90px] transition-colors", remaining <= 0 ? "text-secondary" : "text-on-surface")}>
                  {(remaining / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={cn("text-4xl ml-2 transition-colors", remaining <= 0 ? "text-secondary" : "text-primary")}>€</span>
              </div>
            </div>

            {/* Ledger list grouped by person */}
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-lg font-bold uppercase tracking-widest text-on-surface opacity-40">
                  Paiements Effectués
                </h2>
                {totalPaid > 0 && (
                  <span className="text-sm font-semibold text-secondary">{formatCents(totalPaid)}</span>
                )}
              </div>

              {ledger.length === 0 ? (
                <div className="flex items-center p-6 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant/20 opacity-30">
                  <span className="text-sm font-medium italic">En attente de paiement…</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {persons.map((person, pIdx) => {
                    if (person.entries.length === 0 && pIdx !== currentPersonIdx) return null;
                    const isCurrent = pIdx === currentPersonIdx;
                    const personTotal = person.entries.reduce((s, e) => s + e.amount, 0);
                    return (
                      <div key={pIdx}>
                        {/* Person header — only show when there are multiple persons */}
                        {persons.filter(p => p.entries.length > 0 || p === currentPerson).length > 1 && (
                          <div className={cn(
                            "flex items-center justify-between px-3 py-1.5 rounded-lg mb-1.5 text-[10px] font-black uppercase tracking-widest",
                            isCurrent
                              ? "bg-primary/10 text-primary"
                              : "bg-surface-container text-outline"
                          )}>
                            <span>{person.label}</span>
                            {personTotal > 0 && <span>{formatCents(personTotal)}</span>}
                          </div>
                        )}

                        {/* Person's entries */}
                        <div className="space-y-2">
                          {person.entries.length === 0 && isCurrent ? (
                            <div className="flex items-center p-4 bg-surface-container-lowest rounded-xl border border-dashed border-primary/20 opacity-50">
                              <span className="text-xs font-medium italic text-primary">
                                En attente de paiement pour {person.label}…
                              </span>
                            </div>
                          ) : (
                            person.entries.map((entry) => (
                              <LedgerRow
                                key={entry.id}
                                entry={entry}
                                onRemove={() => removeEntry(entry.id)}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Change display */}
              {change > 0 && (
                <div className="flex items-center justify-between p-4 bg-secondary/10 border border-secondary/20 rounded-xl mt-3">
                  <span className="font-medium text-secondary text-sm">Rendu monnaie</span>
                  <span className="font-black text-secondary text-xl">{formatCents(change)}</span>
                </div>
              )}

              {/* Personne suivante */}
              {hasSplitBill && canNextPerson && (
                <button
                  onClick={handleNextPerson}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-outline-variant/40 text-on-surface-variant hover:border-primary hover:text-primary transition-all active:scale-[0.98] text-sm font-bold"
                >
                  <UserPlus size={16} />
                  Personne suivante
                </button>
              )}
            </div>

            {/* Split controls */}
            <div className="p-8 bg-surface-container-lowest border-t border-outline-variant/10 shrink-0">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface opacity-40 mb-4">
                Diviser la note
              </p>
              <div className="grid grid-cols-4 gap-4">
                {([2, 3, 4] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => applySplit(n)}
                    disabled={remaining <= 0}
                    className="h-16 flex flex-col items-center justify-center bg-surface-container-high rounded-xl hover:bg-surface-bright transition-all active:scale-95 disabled:opacity-30"
                  >
                    <span className="text-lg font-black">/{n}</span>
                    <span className="text-[10px] opacity-60 uppercase font-bold">
                      {formatCents(Math.ceil(remaining / n))}
                    </span>
                  </button>
                ))}

                {customN !== null ? (
                  <div className="h-16 flex items-center gap-1.5 bg-surface-container-high rounded-xl px-3 border border-primary/30">
                    <button onClick={() => setCustomN((n) => Math.max(2, (n ?? 2) - 1))} className="w-7 h-7 rounded bg-surface-container flex items-center justify-center text-lg font-black hover:bg-surface-bright">−</button>
                    <span className="flex-1 text-center text-lg font-black">{customN}</span>
                    <button onClick={() => setCustomN((n) => Math.min(20, (n ?? 2) + 1))} className="w-7 h-7 rounded bg-surface-container flex items-center justify-center text-lg font-black hover:bg-surface-bright">+</button>
                    <button onClick={() => applySplit(customN)} className="ml-1 px-2.5 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-black hover:opacity-90 active:scale-95">OK</button>
                  </div>
                ) : (
                  <button onClick={() => setCustomN(5)} disabled={remaining <= 0} className="h-16 flex flex-col items-center justify-center border-2 border-primary/20 text-primary rounded-xl hover:bg-primary/10 transition-all active:scale-95 disabled:opacity-30">
                    <span className="text-lg font-black">÷N</span>
                    <span className="text-[10px] uppercase font-bold">Personnalisé</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ── RIGHT : NumPad + Methods ─────────────────────── */}
          <section className="col-span-4 bg-surface-container-low flex flex-col overflow-y-auto">

            {/* NumPad */}
            <div className="p-6 border-b border-outline-variant/10 shrink-0">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2 block">
                Montant à encaisser
              </label>
              <div className="bg-surface-container-highest p-5 rounded-xl flex items-center justify-between border-b-4 border-primary mb-4">
                <span className="text-4xl font-black text-on-surface">
                  {(draftDisplay / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-2xl text-primary font-bold">€</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {NUMPAD_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => numpadPress(key)}
                    className={cn(
                      "h-16 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center",
                      key === "DEL"
                        ? "bg-surface-container-highest text-error hover:bg-error/20"
                        : "bg-surface-container-high text-on-surface text-2xl hover:bg-surface-bright"
                    )}
                  >
                    {key === "DEL" ? <Delete size={20} /> : key}
                  </button>
                ))}
                <button
                  onClick={() => numpadPress("EXACT")}
                  className="col-span-3 h-11 rounded-xl bg-primary/10 text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/20 transition-all active:scale-[0.98]"
                >
                  ↵ Montant exact (solde restant)
                </button>
              </div>
            </div>

            {/* Payment methods */}
            <div className="p-6 flex flex-col gap-3 flex-1">
              {/* Current person indicator */}
              {persons.length > 1 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg mb-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-black text-primary uppercase tracking-widest">
                    {currentPerson.label}
                  </span>
                </div>
              )}

              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface opacity-40 mb-1">
                Mode de Règlement
              </p>

              {METHODS.map(({ id, label, icon, textColor, borderHover }) => (
                <button
                  key={id}
                  onClick={() => handleMethod(id)}
                  disabled={remaining <= 0}
                  className={cn(
                    "group flex items-center justify-between p-5 bg-surface-container-high rounded-xl",
                    "border-l-8 border-transparent transition-all active:scale-[0.98]",
                    "hover:bg-surface-bright disabled:opacity-30 disabled:pointer-events-none",
                    borderHover
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 bg-surface-container-lowest rounded-lg flex items-center justify-center", textColor)}>
                      {icon}
                    </div>
                    <span className="text-lg font-bold tracking-tight">{label.toUpperCase()}</span>
                  </div>
                  <span className="text-xs font-bold text-on-surface opacity-0 group-hover:opacity-40 transition-opacity">
                    {formatCents(effectiveCharge)}
                  </span>
                </button>
              ))}

              {/* CLÔTURER */}
              <button
                onClick={handleValidate}
                disabled={!canValidate || isValidating}
                className={cn(
                  "mt-auto h-24 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] shadow-xl disabled:pointer-events-none",
                  canValidate
                    ? "bg-secondary-container text-on-secondary-container hover:brightness-110"
                    : "bg-surface-container text-on-surface-variant"
                )}
              >
                {isValidating ? (
                  <>
                    <svg className="animate-spin mb-1" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Enregistrement…</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-black uppercase tracking-[0.2em] opacity-70">
                      {canValidate ? "Valider l'encaissement" : "En attente de paiement"}
                    </span>
                    <span className="text-2xl font-black flex items-center gap-2">
                      {canValidate && <CheckCircle size={22} strokeWidth={1.5} />}
                      CLÔTURER LA VENTE
                    </span>
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── LedgerRow ─────────────────────────────────────────────────

function LedgerRow({ entry, onRemove }: { entry: LedgerEntry; onRemove: () => void }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-4 bg-surface-container-low rounded-xl",
      "group transition-all hover:bg-surface-container-high border-l-4",
      METHOD_BORDER[entry.method] ?? "border-outline"
    )}>
      <div className="flex items-center gap-3">
        <span className="text-on-surface-variant">{METHOD_ICON[entry.method] ?? <Banknote size={16} />}</span>
        <div>
          <p className="font-bold text-on-surface text-sm">{METHOD_LABEL[entry.method] ?? entry.method}</p>
          <p className="text-[10px] opacity-50 uppercase tracking-tighter">{entry.time}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <span className="text-lg font-black">{formatCents(entry.amount)}</span>
          {entry.cashGiven !== null && entry.cashGiven > entry.amount && (
            <p className="text-[10px] text-secondary opacity-80">Remis : {formatCents(entry.cashGiven)}</p>
          )}
        </div>
        <button
          onClick={onRemove}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-error-container text-on-error-container opacity-0 group-hover:opacity-100 transition-opacity hover:brightness-110 active:scale-95"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
