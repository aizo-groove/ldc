import { useState } from "react";
import { Printer, FileJson, FileText, X, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrintStore } from "./store";
import { executePrint } from "./usePrint";
import { useSessionStore } from "@/features/session/store";

type Format = "escpos" | "pdf" | "json";

export function PrintModal() {
  const { job, clear } = usePrintStore();
  const cashier = useSessionStore((s) => s.cashier);

  const [status, setStatus] = useState<"idle" | "printing" | "done" | "error">("idle");
  const [error,  setError]  = useState<string | null>(null);

  if (!job) return null;

  const title = job.type === "receipt" ? "Imprimer le ticket" : "Imprimer le rapport";

  const handlePrint = async (format: Format) => {
    setStatus("printing");
    setError(null);
    try {
      await executePrint(job, format, cashier?.name);
      if (format === "pdf") {
        // window.print() is synchronous — if we get here it worked
        clear();
        return;
      }
      setStatus("done");
      setTimeout(clear, 1200);
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-low rounded-2xl shadow-2xl w-96 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <h2 className="font-black text-sm uppercase tracking-widest text-on-surface">{title}</h2>
          <button onClick={clear} className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">

          {status === "printing" && (
            <div className="flex items-center justify-center gap-3 py-4 text-outline">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm font-bold uppercase tracking-widest">Impression en cours…</span>
            </div>
          )}

          {status === "done" && (
            <div className="flex items-center justify-center gap-3 py-4 text-secondary">
              <CheckCircle2 size={20} />
              <span className="text-sm font-bold uppercase tracking-widest">Envoyé !</span>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start gap-3 p-3 bg-error/10 rounded-xl">
              <AlertTriangle size={16} className="text-error shrink-0 mt-0.5" />
              <p className="text-xs text-error leading-relaxed">{error}</p>
            </div>
          )}

          {(status === "idle" || status === "error") && (
            <div className="grid grid-cols-3 gap-3">
              {([
                { id: "escpos", icon: <Printer size={22} />,  label: "Imprimante", sub: "ESC/POS thermique" },
                { id: "pdf",    icon: <FileText size={22} />, label: "PDF",        sub: "Imprimer / sauvegarder" },
                { id: "json",   icon: <FileJson size={22} />, label: "JSON",       sub: "Export données" },
              ] as { id: Format; icon: React.ReactNode; label: string; sub: string }[]).map(({ id, icon, label, sub }) => (
                <button
                  key={id}
                  onClick={() => handlePrint(id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    "border-outline-variant/20 bg-surface-container hover:border-primary/50 hover:bg-primary/5 active:scale-95"
                  )}
                >
                  <span className="text-primary">{icon}</span>
                  <span className="font-black text-xs uppercase tracking-wide text-on-surface">{label}</span>
                  <span className="text-[10px] text-outline text-center leading-tight">{sub}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
