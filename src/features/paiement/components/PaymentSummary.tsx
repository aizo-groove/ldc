import { ArrowLeft, CheckCircle, SplitSquareHorizontal, X } from "lucide-react";
import { formatCents } from "@/lib/utils";
import type { PaymentMethod } from "@/types/transaction";

const METHOD_BADGE: Record<PaymentMethod, string> = {
  CB:          "CB",
  ESPECES:     "ESP",
  CHEQUE:      "CHQ",
  VIREMENT:    "VIR",
  AVOIR:       "AV",
  TITRE_RESTO: "TR",
  AUTRE:       "AUT",
};

const METHOD_COLOR: Record<PaymentMethod, string> = {
  CB:          "bg-primary/10 text-primary",
  ESPECES:     "bg-secondary/10 text-secondary",
  CHEQUE:      "bg-tertiary/10 text-tertiary",
  VIREMENT:    "bg-outline/10 text-outline",
  AVOIR:       "bg-error/10 text-error",
  TITRE_RESTO: "bg-primary-fixed-dim/10 text-primary-fixed-dim",
  AUTRE:       "bg-outline/10 text-outline",
};

interface Entry {
  id: string;
  method: PaymentMethod;
  amount: number;
}

interface PaymentSummaryProps {
  totalTtc: number;
  entries: Entry[];
  remaining: number;
  onRemoveEntry: (id: string) => void;
  onBack: () => void;
  canValidate: boolean;
  isValidating: boolean;
  onValidate: () => void;
  showSplit: boolean;
  splitInput: string;
  onToggleSplit: () => void;
  onSplitInputChange: (v: string) => void;
  onApplySplit: () => void;
}

export function PaymentSummary({
  totalTtc,
  entries,
  remaining,
  onRemoveEntry,
  onBack,
  canValidate,
  isValidating,
  onValidate,
  showSplit,
  splitInput,
  onToggleSplit,
  onSplitInputChange,
  onApplySplit,
}: PaymentSummaryProps) {
  return (
    <div className="w-80 flex flex-col p-6 bg-surface-container-low gap-4 overflow-y-auto">
      {/* Retour */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-primary hover:opacity-80 active:scale-95 transition-all self-start"
      >
        <ArrowLeft size={18} />
        <span className="font-bold tracking-widest uppercase text-xs">Retour</span>
      </button>

      {/* Total à payer */}
      <div>
        <span className="block text-outline uppercase tracking-widest text-[10px] mb-1 select-none">
          Total à payer
        </span>
        <div className="text-5xl font-black tracking-tighter text-on-surface select-none">
          {formatCents(totalTtc)}
        </div>
      </div>

      {/* Paiements ajoutés */}
      {entries.length > 0 && (
        <div className="space-y-2">
          <span className="block text-outline uppercase tracking-widest text-[10px] select-none">
            Paiements ajoutés
          </span>
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 bg-surface-container rounded-lg px-3 py-2"
            >
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${METHOD_COLOR[e.method]}`}>
                {METHOD_BADGE[e.method]}
              </span>
              <span className="flex-1 font-bold text-sm text-on-surface">
                {formatCents(e.amount)}
              </span>
              <button
                onClick={() => onRemoveEntry(e.id)}
                className="text-outline hover:text-error transition-colors p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {/* Reste à payer */}
          <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20">
            <span className="text-xs text-on-surface-variant font-medium">Reste à payer</span>
            <span className={`font-black text-base ${remaining === 0 ? "text-secondary" : "text-on-surface"}`}>
              {remaining === 0 ? "Soldé" : formatCents(remaining)}
            </span>
          </div>
        </div>
      )}

      {/* Partager la note */}
      <div className="border-t border-outline-variant/10 pt-4">
        <button
          onClick={onToggleSplit}
          className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest"
        >
          <SplitSquareHorizontal size={14} />
          Partager la note
        </button>

        {showSplit && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-on-surface-variant shrink-0">En</span>
            <input
              type="number"
              min={2}
              max={20}
              value={splitInput}
              onChange={(e) => onSplitInputChange(e.target.value)}
              className="w-14 text-center bg-surface-container rounded-lg px-2 py-1.5 text-sm font-bold text-on-surface outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-on-surface-variant shrink-0">parts égales</span>
            <button
              onClick={onApplySplit}
              className="ml-auto px-3 py-1.5 bg-primary text-on-primary text-xs font-black rounded-lg hover:opacity-90 active:scale-95 transition-all"
            >
              OK
            </button>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bouton validation */}
      <button
        onClick={onValidate}
        disabled={!canValidate || isValidating}
        className="w-full h-20 bg-secondary-container text-on-secondary-container rounded-xl flex flex-col items-center justify-center gap-1 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
      >
        {isValidating ? (
          <>
            <span className="text-xs font-black uppercase tracking-[0.2em]">Enregistrement…</span>
            <svg className="animate-spin mt-0.5" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </>
        ) : (
          <>
            <span className="text-xs font-black uppercase tracking-[0.2em]">Valider &amp; Imprimer</span>
            <CheckCircle size={28} strokeWidth={1.5} className="mt-0.5" />
          </>
        )}
      </button>
    </div>
  );
}
