/**
 * NumPad tactile — saisie en centimes (INTEGER, jamais de float).
 *
 * Logique :
 *   chaque touche chiffre décale à gauche : inputCents = inputCents * 10 + digit
 *   "00"  → inputCents * 100
 *   "⌫"  → Math.floor(inputCents / 10)
 *   "."   → pas d'effet (saisie déjà en centimes)
 *   "MONTANT EXACT" → remplit avec le total dû
 */
import { Delete, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_CENTS = 99_999_99; // 999 999,99 € — plafond raisonnable

interface NumPadProps {
  inputCents: number;
  onChange: (cents: number) => void;
  onExact: () => void;
}

interface NumKey {
  label: React.ReactNode;
  action: (current: number) => number;
  wide?: boolean;
  variant?: "default" | "danger" | "primary";
}

export function NumPad({ inputCents, onChange, onExact }: NumPadProps) {
  const KEYS: NumKey[] = [
    { label: "7", action: (c) => Math.min(c * 10 + 7, MAX_CENTS) },
    { label: "8", action: (c) => Math.min(c * 10 + 8, MAX_CENTS) },
    { label: "9", action: (c) => Math.min(c * 10 + 9, MAX_CENTS) },
    { label: "4", action: (c) => Math.min(c * 10 + 4, MAX_CENTS) },
    { label: "5", action: (c) => Math.min(c * 10 + 5, MAX_CENTS) },
    { label: "6", action: (c) => Math.min(c * 10 + 6, MAX_CENTS) },
    { label: "1", action: (c) => Math.min(c * 10 + 1, MAX_CENTS) },
    { label: "2", action: (c) => Math.min(c * 10 + 2, MAX_CENTS) },
    { label: "3", action: (c) => Math.min(c * 10 + 3, MAX_CENTS) },
    { label: "0", action: (c) => Math.min(c * 10, MAX_CENTS) },
    { label: "00", action: (c) => Math.min(c * 100, MAX_CENTS) },
    { label: ".", action: (c) => c }, // no-op : saisie centimes
  ];

  return (
    <div className="col-span-8 flex flex-col gap-4">
      {/* En-tête */}
      <div className="flex justify-between items-end px-2">
        <span className="text-outline uppercase tracking-widest text-xs font-bold">
          Saisie Tactile
        </span>
        <span className="text-outline-variant font-mono text-xs select-none">
          INPUT_MODE: CURRENCY_EUR
        </span>
      </div>

      {/* Grille 3×4 */}
      <div className="grid grid-cols-3 gap-3 flex-1">
        {KEYS.map((key, i) => (
          <button
            key={i}
            onClick={() => onChange(key.action(inputCents))}
            className="bg-surface-container-high text-on-surface text-3xl font-bold rounded-xl hover:bg-surface-bright active:scale-95 transition-all"
          >
            {key.label}
          </button>
        ))}
      </div>

      {/* Ligne basse : Effacer + Montant Exact */}
      <div className="grid grid-cols-2 gap-3 h-20">
        <button
          onClick={() => onChange(Math.floor(inputCents / 10))}
          className={cn(
            "rounded-xl flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98]",
            "bg-surface-container-highest text-error hover:bg-error-container hover:text-on-error-container"
          )}
        >
          <Delete size={20} />
          <span>EFFACER</span>
        </button>
        <button
          onClick={onExact}
          className={cn(
            "rounded-xl flex items-center justify-center gap-2 font-black transition-all active:scale-[0.98]",
            "bg-primary text-on-primary hover:bg-primary-fixed-dim"
          )}
        >
          <Calculator size={20} />
          <span>MONTANT EXACT</span>
        </button>
      </div>
    </div>
  );
}
