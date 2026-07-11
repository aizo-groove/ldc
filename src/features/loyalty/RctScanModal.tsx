import { useRef, useState } from "react";
import { Gift, X, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { validateRctLocal, consumeRctLocal } from "@/lib/tauri";
import type { RctInfo } from "@/types/loyalty";
import { formatCents, cn } from "@/lib/utils";

const REWARD_LABELS: Record<string, string> = {
  points:   "points",
  stamps:   "tampon(s)",
  cashback: "€ remboursé(s)",
  visits:   "visite(s)",
  tiers:    "XP",
};

function formatReward(type: string, value: number): string {
  if (type === "cashback") return `${formatCents(value)} remboursé`;
  return `${value} ${REWARD_LABELS[type] ?? type}`;
}

interface Props {
  onClose: () => void;
}

type Phase = "scan" | "confirm" | "done";

export function RctScanModal({ onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw]       = useState("");
  const [phase, setPhase]   = useState<Phase>("scan");
  const [rctInfo, setRctInfo] = useState<RctInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleValidate() {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setError(null);
    setLoading(true);
    try {
      const info = await validateRctLocal(trimmed);
      setRctInfo(info);
      setPhase("confirm");
    } catch (e) {
      setError(typeof e === "string" ? e : "QR invalide ou expiré");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!rctInfo) return;
    setError(null);
    setLoading(true);
    try {
      await consumeRctLocal(rctInfo);
      setPhase("done");
    } catch (e) {
      setError(typeof e === "string" ? e : "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Gift size={18} className="text-primary" />
            </div>
            <h2 className="font-black text-on-surface text-lg">Récompense Fido</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors">
            <X size={16} className="text-on-surface-variant" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">

          {phase === "scan" && (
            <>
              <p className="text-sm text-on-surface-variant">
                Scannez ou collez le QR code de récompense du client (généré par l'app Fido).
              </p>
              <input
                ref={inputRef}
                autoFocus
                value={raw}
                onChange={(e) => { setRaw(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleValidate(); }}
                placeholder="Coller ou scanner le code ici…"
                className="w-full bg-surface-container-highest rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
              />
              {error && (
                <div className="flex items-center gap-2 text-error text-sm">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
              <button
                onClick={handleValidate}
                disabled={!raw.trim() || loading}
                className={cn(
                  "w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                  raw.trim() && !loading
                    ? "bg-primary text-on-primary hover:brightness-110 active:scale-95"
                    : "bg-surface-container-high text-outline cursor-not-allowed"
                )}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Valider"}
              </button>
            </>
          )}

          {phase === "confirm" && rctInfo && (
            <>
              <div className="bg-secondary/10 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-secondary">Récompense à valider</p>
                <p className="text-3xl font-black text-on-surface">
                  {formatReward(rctInfo.reward_type, rctInfo.reward_value)}
                </p>
                <p className="text-xs text-on-surface-variant">
                  Programme : <span className="font-mono text-on-surface">{rctInfo.prog_id.slice(0, 8)}…</span>
                </p>
                <p className="text-xs text-on-surface-variant">
                  Client : <span className="font-mono text-on-surface">{rctInfo.cid.slice(0, 12)}…</span>
                </p>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-error text-sm">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setPhase("scan"); setRctInfo(null); setRaw(""); }}
                  className="flex-1 h-12 rounded-xl font-bold text-sm border-2 border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 h-12 rounded-xl font-black text-sm bg-secondary-container text-on-secondary-container hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : (
                    <><CheckCircle size={16} />Confirmer</>
                  )}
                </button>
              </div>
            </>
          )}

          {phase === "done" && (
            <div className="py-4 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-secondary" />
              </div>
              <p className="font-black text-on-surface text-xl">Récompense enregistrée</p>
              <p className="text-sm text-on-surface-variant">
                La récompense a été acceptée et sera synchronisée avec Fido.
              </p>
              <button
                onClick={onClose}
                className="mt-2 h-12 px-8 rounded-full bg-secondary-container text-on-secondary-container font-black text-sm hover:brightness-110 active:scale-95 transition-all"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
