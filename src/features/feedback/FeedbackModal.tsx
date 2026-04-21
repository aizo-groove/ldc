import { useState } from "react";
import { X, MessageSquarePlus, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeedbackStore } from "./store";

const APP_VERSION = "0.1.0";
const FEEDBACK_URL = import.meta.env.VITE_FEEDBACK_URL as string | undefined;

type Category = "bug" | "suggestion" | "autre";

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "bug",        label: "Bug",        emoji: "🐛" },
  { id: "suggestion", label: "Suggestion", emoji: "💡" },
  { id: "autre",      label: "Autre",      emoji: "💬" },
];

export function FeedbackModal() {
  const { open, hide } = useFeedbackStore();

  const [category, setCategory] = useState<Category>("suggestion");
  const [message,  setMessage]  = useState("");
  const [status,   setStatus]   = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error,    setError]    = useState<string | null>(null);

  if (!open) return null;

  const handleClose = () => {
    hide();
    setTimeout(() => {
      setCategory("suggestion");
      setMessage("");
      setStatus("idle");
      setError(null);
    }, 300);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    if (!FEEDBACK_URL) {
      setError("URL de feedback non configurée (VITE_FEEDBACK_URL manquant).");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setError(null);

    try {
      const res = await fetch(FEEDBACK_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message: message.trim(), version: APP_VERSION }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("done");
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-low rounded-2xl shadow-2xl w-[480px] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <div className="flex items-center gap-2">
            <MessageSquarePlus size={16} className="text-primary" />
            <h2 className="font-black text-sm uppercase tracking-widest text-on-surface">
              Envoyer un retour
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {status === "done" ? (
            <div className="flex flex-col items-center gap-3 py-8 text-secondary">
              <CheckCircle2 size={36} />
              <p className="font-black text-sm uppercase tracking-widest">Merci !</p>
              <p className="text-xs text-outline text-center">
                Votre retour a bien été transmis au développeur.
              </p>
              <button
                onClick={handleClose}
                className="mt-2 px-6 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-bright transition-colors"
              >
                Fermer
              </button>
            </div>
          ) : (
            <>
              {/* Category chips */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-2">
                  Catégorie
                </p>
                <div className="flex gap-2">
                  {CATEGORIES.map(({ id, label, emoji }) => (
                    <button
                      key={id}
                      onClick={() => setCategory(id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2",
                        category === id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-outline-variant/20 text-outline hover:border-outline-variant/50 hover:text-on-surface"
                      )}
                    >
                      <span>{emoji}</span> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-2">
                  Message
                </p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Décrivez le problème ou la suggestion…"
                  rows={5}
                  className="w-full bg-surface-container-high rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                />
                <p className="text-right text-[10px] text-outline mt-1">{message.length} / 2000</p>
              </div>

              {/* Error */}
              {status === "error" && error && (
                <div className="flex items-start gap-2 p-3 bg-error/10 rounded-xl">
                  <AlertTriangle size={14} className="text-error shrink-0 mt-0.5" />
                  <p className="text-xs text-error">{error}</p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] text-outline">v{APP_VERSION}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || status === "sending"}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {status === "sending" && <Loader2 size={13} className="animate-spin" />}
                    Envoyer
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
