import { useEffect, useState } from "react";
import { X, Monitor } from "lucide-react";
import { formatCents } from "@/lib/utils";
import type { PrintJob } from "./types";

const METHOD_LABELS: Record<string, string> = {
  CB: "Carte bancaire", ESPECES: "Espèces", CHEQUE: "Chèque",
  TITRE_RESTO: "Titre Resto", VIREMENT: "Virement", AVOIR: "Avoir", AUTRE: "Autre",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function ScreenReceiptOverlay() {
  const [job, setJob] = useState<PrintJob | null>(null);

  useEffect(() => {
    const handler = (e: Event) => setJob((e as CustomEvent<PrintJob>).detail);
    window.addEventListener("ldc:screen-receipt", handler);
    return () => window.removeEventListener("ldc:screen-receipt", handler);
  }, []);

  if (!job) return null;

  const close = () => setJob(null);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="relative bg-white text-zinc-900 rounded-2xl shadow-2xl w-80 max-h-[90vh] overflow-y-auto font-mono text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-zinc-100 rounded-t-2xl border-b border-zinc-200">
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-sans font-bold uppercase tracking-widest">
            <Monitor size={13} />
            Ticket affiché
          </div>
          <button onClick={close} className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {job.type === "receipt" ? (
            <ReceiptContent job={job} />
          ) : (
            <RapportContent job={job} />
          )}
        </div>

        {/* Close button */}
        <div className="sticky bottom-0 px-4 pb-4 pt-2 bg-white rounded-b-2xl">
          <button
            onClick={close}
            className="w-full h-12 bg-zinc-900 text-white rounded-xl font-sans font-black text-sm uppercase tracking-widest hover:bg-zinc-700 transition-colors active:scale-[0.98]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptContent({ job }: { job: Extract<PrintJob, { type: "receipt" }> }) {
  const { transaction: tx, lines, payments } = job.transaction;
  const isAvoir = tx.type === "AVOIR";
  const method  = payments[0]?.method ?? "AUTRE";

  const tvaGroups = lines.reduce<Record<number, { tva: number; ht: number }>>((acc, l) => {
    if (!acc[l.tva_rate_pct]) acc[l.tva_rate_pct] = { tva: 0, ht: 0 };
    acc[l.tva_rate_pct].tva += l.line_total_tva;
    acc[l.tva_rate_pct].ht  += l.line_total_ht;
    return acc;
  }, {});

  return (
    <>
      {/* Store / date */}
      <div className="text-center space-y-0.5">
        <p className="font-black text-base font-sans">{tx.sequence_no ? `Ticket #${tx.sequence_no.toString().padStart(5, "0")}` : "Ticket"}</p>
        <p className="text-xs text-zinc-500">{fmtDate(tx.created_at)}</p>
        {isAvoir && (
          <p className="mt-1 font-bold text-red-600 text-xs tracking-widest uppercase">★ AVOIR ★</p>
        )}
      </div>

      <div className="border-t border-dashed border-zinc-300" />

      {/* Lines */}
      <div className="space-y-1.5">
        {lines.map((l) => (
          <div key={l.id} className="flex items-baseline justify-between gap-2 text-xs">
            <span className="flex-1 truncate">{l.product_name}</span>
            <span className="text-zinc-400 shrink-0">{l.quantity}×</span>
            <span className="shrink-0 font-bold">{formatCents(l.line_total_ttc)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-zinc-300" />

      {/* Totals */}
      <div className="space-y-1 text-xs text-zinc-500">
        <div className="flex justify-between"><span>Sous-total HT</span><span>{formatCents(tx.total_ht)}</span></div>
        {Object.entries(tvaGroups).map(([r, { tva }]) => (
          <div key={r} className="flex justify-between">
            <span>TVA {(Number(r) / 100).toFixed(2).replace(".", ",")} %</span>
            <span>{formatCents(tva)}</span>
          </div>
        ))}
        {tx.discount_ttc > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Remise</span><span>-{formatCents(tx.discount_ttc)}</span>
          </div>
        )}
      </div>

      {/* Total TTC */}
      <div className="flex items-center justify-between border-t-2 border-zinc-900 pt-2">
        <span className="font-black text-base font-sans uppercase tracking-tight">Total TTC</span>
        <span className="font-black text-2xl font-sans">{formatCents(tx.total_ttc)}</span>
      </div>

      {/* Payment */}
      <div className="text-xs space-y-1 text-zinc-500">
        <div className="flex justify-between">
          <span>{METHOD_LABELS[method] ?? method}</span>
          <span>{formatCents(payments[0]?.amount ?? tx.total_ttc)}</span>
        </div>
        {(payments[0]?.cash_change ?? 0) > 0 && (
          <div className="flex justify-between">
            <span>Rendu monnaie</span>
            <span>{formatCents(payments[0]!.cash_change!)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-zinc-300" />

      <div className="text-center text-[10px] text-zinc-400 space-y-0.5">
        <p>Merci de votre visite !</p>
        <p className="font-mono">NF525 #{tx.sequence_no} — {tx.hash.slice(0, 16)}</p>
      </div>
    </>
  );
}

function RapportContent({ job }: { job: Extract<PrintJob, { type: "rapport" }> }) {
  const r = job.rapport;
  const label = `Z-${r.session.opened_at.slice(0, 4)}-${r.session.id.slice(0, 6).toUpperCase()}`;

  return (
    <>
      <div className="text-center">
        <p className="font-black text-base font-sans uppercase tracking-widest">
          {r.session.status === "CLOSED" ? "Clôture Z" : "Rapport X"}
        </p>
        <p className="text-xs text-zinc-500 font-mono">{label}</p>
      </div>
      <div className="border-t border-dashed border-zinc-300" />
      <div className="space-y-1 text-xs">
        <div className="flex justify-between"><span>Transactions</span><span>{r.nb_transactions}</span></div>
        <div className="flex justify-between"><span>Ventes TTC</span><span>{formatCents(r.total_ventes_ttc)}</span></div>
        {r.total_avoirs_ttc > 0 && <div className="flex justify-between text-red-600"><span>Avoirs TTC</span><span>-{formatCents(r.total_avoirs_ttc)}</span></div>}
        <div className="flex justify-between font-black border-t border-zinc-200 pt-1"><span>Net TTC</span><span>{formatCents(r.net_ttc)}</span></div>
      </div>
    </>
  );
}
