import { useEffect, useRef, useState } from "react";
import {
  Printer, Mail, CheckCircle, Building2, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { formatCents, cn } from "@/lib/utils";
import type { TransactionFull, TransactionLine, Payment, PersonGroup } from "@/types/transaction";
import { usePrintStore } from "@/features/print/store";

// ── Constants ─────────────────────────────────────────────────

const COUNTDOWN_MS  = 10_000;
const CIRCUMFERENCE = 2 * Math.PI * 10;
const TICK_MS       = 50;

const DESCRIPTION_PRESETS = [
  "Repas complet",
  "Menu déjeuner",
  "Menu express",
  "Plat seul",
  "À emporter",
];

const METHOD_LABELS: Record<string, string> = {
  CB: "CB", ESPECES: "Espèces", CHEQUE: "Chèque",
  TITRE_RESTO: "Titre Resto", VIREMENT: "Virement", AVOIR: "Avoir", AUTRE: "Autre",
};

const METHOD_BADGE_COLOR: Record<string, string> = {
  CB:          "bg-primary/10 text-primary",
  ESPECES:     "bg-secondary/10 text-secondary",
  CHEQUE:      "bg-tertiary/10 text-tertiary",
  TITRE_RESTO: "bg-primary-fixed-dim/10 text-primary-fixed-dim",
  VIREMENT:    "bg-outline/10 text-outline",
  AVOIR:       "bg-error/10 text-error",
  AUTRE:       "bg-outline/10 text-outline",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Types ─────────────────────────────────────────────────────

interface ConfirmationViewProps {
  orderNumber:  number;
  transaction:  TransactionFull;
  personGroups: PersonGroup[];
  onNewSale:    () => void;
}

interface PersonReceiptState {
  description:  string;
  proOpen:      boolean;
  companyName:  string;
  tvaNumber:    string;
}

// ── Main component ────────────────────────────────────────────

export function ConfirmationView({
  orderNumber,
  transaction,
  personGroups,
  onNewSale,
}: ConfirmationViewProps) {
  const { transaction: tx, lines, payments } = transaction;
  const triggerPrint = usePrintStore((s) => s.trigger);

  const [remainingMs, setRemainingMs] = useState(COUNTDOWN_MS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // One UI state per person group
  const [receiptStates, setReceiptStates] = useState<PersonReceiptState[]>(
    () => personGroups.map(() => ({ description: "", proOpen: false, companyName: "", tvaNumber: "" }))
  );

  function updateReceipt(idx: number, patch: Partial<PersonReceiptState>) {
    setReceiptStates((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  // Countdown
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - TICK_MS;
        if (next <= 0) { clearInterval(intervalRef.current!); setTimeout(onNewSale, 0); return 0; }
        return next;
      });
    }, TICK_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopCountdown = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setRemainingMs(0);
  };

  const transactionId = `#${String(orderNumber).padStart(5, "0")}`;
  const secondsDisplay = Math.ceil(remainingMs / 1000);
  const strokeDashoffset = (1 - remainingMs / COUNTDOWN_MS) * CIRCUMFERENCE;
  const isSplit = personGroups.length > 1;

  // ── Render ────────────────────────────────────────────────

  return (
    <main className="mt-16 h-[calc(100vh-64px)] bg-surface overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-10 space-y-8">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full mb-4">
              <CheckCircle size={16} strokeWidth={2} />
              <span className="text-sm font-bold tracking-wide uppercase">Paiement Terminé</span>
            </div>
            <h1 className="text-4xl font-black text-on-surface tracking-tight mb-1">
              {isSplit ? "Gestion des Reçus" : "Vente validée"}
            </h1>
            <p className="text-on-surface-variant font-medium text-sm">
              {formatDate(tx.created_at)} · <span className="text-primary font-mono">{transactionId}</span> · N°{tx.sequence_no}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="text-xs text-outline uppercase tracking-widest mb-1">Total encaissé</p>
            <p className="text-4xl font-black text-on-surface">{formatCents(tx.total_ttc)}</p>
          </div>
        </div>

        {/* ── Person cards ───────────────────────────────── */}
        <div className="space-y-4">
          {personGroups.map((group, gIdx) => {
            const groupPayments = group.paymentIndices.map((i) => payments[i]).filter(Boolean);
            const state = receiptStates[gIdx];

            return (
              <PersonCard
                key={gIdx}
                group={group}
                groupIndex={gIdx}
                groupPayments={groupPayments}
                lines={lines}
                state={state}
                onUpdate={(patch) => { stopCountdown(); updateReceipt(gIdx, patch); }}
                onPrint={() => { stopCountdown(); triggerPrint({ type: "receipt", transaction }); }}
                onEmail={() => { stopCountdown(); console.log("TODO: email receipt for", group.label); }}
              />
            );
          })}
        </div>

        {/* ── Summary + actions ──────────────────────────── */}
        <div className="p-8 bg-surface-container-high rounded-xl border border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-on-surface-variant font-bold uppercase tracking-widest text-xs mb-1">
              Total Transaction
            </p>
            <p className="text-5xl font-black text-on-surface">{formatCents(tx.total_ttc)}</p>
          </div>

          <div className="flex flex-col items-end gap-4 w-full md:w-auto">
            <button
              onClick={() => { stopCountdown(); onNewSale(); }}
              className="w-full md:w-auto h-20 px-12 bg-secondary-container text-on-secondary-container font-black text-xl rounded-full flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl hover:brightness-110"
            >
              <CheckCircle size={28} strokeWidth={1.5} />
              NOUVELLE VENTE
            </button>

            {remainingMs > 0 && (
              <div className="flex items-center gap-2 text-on-surface-variant">
                <CountdownCircle dashoffset={strokeDashoffset} circumference={CIRCUMFERENCE} />
                <span className="text-sm font-medium">
                  Retour automatique dans {secondsDisplay}s
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ── PersonCard ────────────────────────────────────────────────

interface PersonCardProps {
  group:         PersonGroup;
  groupIndex:    number;
  groupPayments: Payment[];
  lines:         TransactionLine[];
  state:         PersonReceiptState;
  onUpdate:      (patch: Partial<{ description: string; proOpen: boolean; companyName: string; tvaNumber: string }>) => void;
  onPrint:       () => void;
  onEmail:       () => void;
}

function PersonCard({
  group, groupIndex, groupPayments, lines, state, onUpdate, onPrint, onEmail,
}: PersonCardProps) {
  const [showItems, setShowItems] = useState(false);
  const totalChange = groupPayments.reduce((s, p) => s + (p.cash_change ?? 0), 0);

  return (
    <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-lg">

      {/* ── Card header ──────────────────────────────────── */}
      <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="w-14 h-14 bg-surface-container-high rounded-xl flex items-center justify-center shrink-0">
            <span className="text-xl font-black text-on-surface">
              P{groupIndex + 1}
            </span>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-xl font-bold text-on-surface">{group.label}</h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-2xl font-black text-secondary-fixed">{formatCents(group.total)}</span>
              <span className="bg-secondary/20 text-secondary text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                Payé
              </span>
              {totalChange > 0 && (
                <span className="text-xs text-secondary opacity-70 font-medium">
                  Rendu : {formatCents(totalChange)}
                </span>
              )}
            </div>

            {/* Payment method badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {groupPayments.map((p) => (
                <span
                  key={p.id}
                  className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider",
                    METHOD_BADGE_COLOR[p.method] ?? "bg-outline/10 text-outline"
                  )}
                >
                  {METHOD_LABELS[p.method] ?? p.method} · {formatCents(p.amount)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 shrink-0">
          <button
            onClick={onPrint}
            className="h-12 px-5 bg-surface-container-highest text-on-surface font-bold rounded-xl flex items-center gap-2 hover:bg-surface-bright transition-colors text-sm"
          >
            <Printer size={16} strokeWidth={1.6} />
            Ticket
          </button>
          <button
            onClick={onEmail}
            className="h-12 px-5 bg-surface-container-highest text-on-surface font-bold rounded-xl flex items-center gap-2 hover:bg-surface-bright transition-colors text-sm"
          >
            <Mail size={16} strokeWidth={1.6} />
            Email
          </button>
          <button
            onClick={() => onUpdate({ proOpen: !state.proOpen })}
            className={cn(
              "h-12 px-5 font-bold rounded-xl flex items-center gap-2 transition-colors text-sm",
              state.proOpen
                ? "bg-primary text-on-primary"
                : "border-2 border-primary/30 text-primary hover:bg-primary/10"
            )}
          >
            <Building2 size={16} strokeWidth={1.6} />
            Facture Pro
          </button>
        </div>
      </div>

      {/* ── Description / receipt content ──────────────── */}
      <div className="border-t border-outline-variant/10 px-6 md:px-8 py-5 space-y-4">

        {/* Preset chips + free input */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-2">
            Description pour le reçu
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {DESCRIPTION_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => onUpdate({ description: state.description === preset ? "" : preset })}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95",
                  state.description === preset
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright hover:text-on-surface"
                )}
              >
                {preset}
              </button>
            ))}
            {state.description && !DESCRIPTION_PRESETS.includes(state.description) && (
              <button
                onClick={() => onUpdate({ description: "" })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-primary text-on-primary"
              >
                {state.description}
                <X size={12} />
              </button>
            )}
          </div>
          <input
            value={DESCRIPTION_PRESETS.includes(state.description) ? "" : state.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Ou saisir une description personnalisée…"
            className="w-full bg-surface-container-highest rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* Expandable item list */}
        <button
          onClick={() => setShowItems((v) => !v)}
          className="flex items-center gap-2 text-xs font-bold text-outline hover:text-on-surface transition-colors uppercase tracking-widest"
        >
          {showItems ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showItems ? "Masquer le détail" : `Voir les ${lines.length} article(s)`}
        </button>

        {showItems && (
          <div className="font-mono text-xs space-y-1 bg-surface-container-lowest rounded-xl p-4">
            {lines.map((l) => (
              <div key={l.id} className="flex justify-between gap-2">
                <span className="text-on-surface-variant truncate flex-1">{l.quantity} × {l.product_name}</span>
                <span className="text-on-surface shrink-0">{formatCents(l.line_total_ttc)}</span>
              </div>
            ))}
            <div className="border-t border-dashed border-outline-variant/30 mt-2 pt-2 flex justify-between font-black text-on-surface">
              <span>TOTAL</span>
              <span>{formatCents(lines.reduce((s, l) => s + l.line_total_ttc, 0))}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Facture Pro panel ──────────────────────────────── */}
      {state.proOpen && (
        <div className="border-t border-outline-variant/10 bg-surface-container-lowest px-6 md:px-8 py-6">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-4">
            Informations Facture Pro
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                Nom de l'entreprise
              </label>
              <input
                value={state.companyName}
                onChange={(e) => onUpdate({ companyName: e.target.value })}
                placeholder="Ex : TECH SOLUTIONS SARL"
                className="w-full h-12 bg-surface-container-highest border-b-2 border-primary text-on-surface px-4 rounded-t-lg text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                N° TVA / SIREN
              </label>
              <input
                value={state.tvaNumber}
                onChange={(e) => onUpdate({ tvaNumber: e.target.value })}
                placeholder="Ex : FR 82 123 456 789"
                className="w-full h-12 bg-surface-container-highest border-b-2 border-primary text-on-surface px-4 rounded-t-lg text-sm outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => console.log("TODO: generate invoice for", group.label, state)}
              className="h-11 px-6 bg-secondary-container text-on-secondary-container font-black rounded-full uppercase text-xs tracking-widest flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all"
            >
              Enregistrer la facture
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CountdownCircle ───────────────────────────────────────────

function CountdownCircle({ dashoffset, circumference }: { dashoffset: number; circumference: number }) {
  return (
    <div className="relative w-5 h-5 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-20" />
        <circle
          cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"
          strokeDasharray={circumference} strokeDashoffset={dashoffset} strokeLinecap="round"
          className="text-primary transition-[stroke-dashoffset] duration-50"
        />
      </svg>
    </div>
  );
}
