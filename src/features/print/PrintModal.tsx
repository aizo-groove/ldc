import { useEffect, useState } from "react";
import { Printer, FileJson, FileText, X, Loader2, AlertTriangle, CheckCircle2, Monitor, ChefHat, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrintStore } from "./store";
import { executePrint } from "./usePrint";
import { useSessionStore } from "@/features/session/store";
import { listPrinters, getSetting, generateLoyaltyQr } from "@/lib/tauri";
import type { Printer as PrinterModel } from "@/types/printer";
import { printerHasRole } from "@/types/printer";
import { openCustomerDisplayWindow, emitDisplay } from "@/features/customer-display/window";
import { useLoyaltyStore } from "@/features/loyalty/store";

type Format = "escpos" | "screen" | "pdf" | "json";

export function PrintModal() {
  const { job, clear } = usePrintStore();
  const cashier = useSessionStore((s) => s.cashier);
  const [status,   setStatus]   = useState<"idle" | "printing" | "done" | "error">("idle");
  const [error,    setError]    = useState<string | null>(null);
  const [printers, setPrinters] = useState<PrinterModel[]>([]);

  // Load printer list + loyalty config once when modal opens
  useEffect(() => {
    if (job) {
      listPrinters().then(setPrinters).catch(() => setPrinters([]));
      useLoyaltyStore.getState().load();
      setStatus("idle");
      setError(null);
    }
  }, [job]);

  if (!job) return null;

  const isReceipt = job.type === "receipt";
  const title = isReceipt ? "Imprimer le ticket" : "Imprimer le rapport";

  const receiptPrinters = printers.filter((p) => printerHasRole(p, "receipt"));

  const handlePrint = async (format: Format) => {
    setStatus("printing");
    setError(null);
    try {
      const loyaltyQr = job.type === "receipt" ? job.loyaltyQr : undefined;
      await executePrint(job, format, cashier?.name, loyaltyQr);
      if (format === "pdf" || format === "screen") {
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

  const handleFidoQr = async () => {
    if (job.type !== "receipt") return;
    setStatus("printing");
    setError(null);
    try {
      let payloadB64url = job.loyaltyQr ?? null;

      if (!payloadB64url) {
        const tx = job.transaction.transaction;
        const taxCents = tx.total_ttc - tx.total_ht;
        const qrItems = job.transaction.lines.map((l) => ({
          name: l.product_name,
          quantity: l.quantity,
          unitPriceCents: l.unit_price_ttc,
        }));
        const result = await generateLoyaltyQr(tx.id, tx.total_ttc, taxCents, qrItems);
        if (!result) {
          setError("Pas de programme Fido actif — vérifiez la configuration.");
          setStatus("error");
          return;
        }
        payloadB64url = result.payload_b64url;
      }

      const [storeName, isNew] = await Promise.all([
        getSetting("store_name").catch(() => ""),
        openCustomerDisplayWindow(),
      ]);

      if (isNew) await new Promise<void>((r) => setTimeout(r, 800));

      await emitDisplay({
        type:          "fido-qr",
        storeName:     storeName ?? "",
        total:         job.transaction.transaction.total_ttc,
        payloadB64url,
      });
      clear();
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  };

  const showFidoQrButton = job.type === "receipt";

  const busy   = status === "printing";
  const showActions = status === "idle" || status === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-low rounded-2xl shadow-2xl w-105 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <h2 className="font-black text-sm uppercase tracking-widest text-on-surface">{title}</h2>
          <button onClick={clear} className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── Status feedback ───────────────────────────── */}
          {busy && (
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

          {showActions && (
            <>
              {/* ── Configured printers ───────────────────── */}
              {receiptPrinters.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-outline uppercase tracking-widest">Imprimantes configurées</p>
                  <div className="space-y-2">
                    {receiptPrinters.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handlePrint(p.printer_type === "screen" ? "screen" : "escpos")}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-outline-variant/20 bg-surface-container hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98] transition-all text-left"
                      >
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          {p.printer_type === "screen" ? <Monitor size={18} /> : <Printer size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-on-surface truncate">{p.name}</p>
                          <p className="text-[10px] text-outline truncate">
                            {p.printer_type === "screen"
                              ? "Affichage à l'écran"
                              : `${p.ip ?? "—"}:${p.port} · ${p.paper_mm} mm`}
                          </p>
                        </div>
                        {printerHasRole(p, "kitchen") && printerHasRole(p, "receipt") && (
                          <ChefHat size={14} className="text-tertiary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Fallback / always visible ─────────────── */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-outline uppercase tracking-widest">
                  {receiptPrinters.length > 0 ? "Autres formats" : "Format d'impression"}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {receiptPrinters.length === 0 && (
                    <FormatButton
                      id="escpos"
                      icon={<Printer size={22} />}
                      label="Imprimante"
                      sub="ESC/POS thermique"
                      onClick={() => handlePrint("escpos")}
                    />
                  )}
                  <FormatButton
                    id="pdf"
                    icon={<FileText size={22} />}
                    label="PDF"
                    sub="Imprimer / sauvegarder"
                    onClick={() => handlePrint("pdf")}
                  />
                  <FormatButton
                    id="json"
                    icon={<FileJson size={22} />}
                    label="JSON"
                    sub="Export données"
                    onClick={() => handlePrint("json")}
                  />
                  {showFidoQrButton && (
                    <FormatButton
                      id="qr"
                      icon={<QrCode size={22} />}
                      label="QR Fido"
                      sub="Écran client"
                      onClick={handleFidoQr}
                    />
                  )}
                </div>
              </div>

              {/* Setup hint when no printers configured */}
              {receiptPrinters.length === 0 && (
                <p className="text-[10px] text-outline/60 text-center leading-snug">
                  Configurez vos imprimantes dans Paramètres → Appareils → Imprimante
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FormatButton({ icon, label, sub, onClick }: {
  id: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
        "border-outline-variant/20 bg-surface-container hover:border-primary/50 hover:bg-primary/5 active:scale-95"
      )}
    >
      <span className="text-primary">{icon}</span>
      <span className="font-black text-xs uppercase tracking-wide text-on-surface">{label}</span>
      <span className="text-[10px] text-outline text-center leading-tight">{sub}</span>
    </button>
  );
}
