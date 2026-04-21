import { usePrintStore } from "./store";
import type { PrintJob, EscPosReceiptDoc, EscPosRapportDoc } from "./types";
import type { TransactionFull } from "@/types/transaction";
import type { RapportX } from "@/types/session";
import { printReceiptEscpos, printRapportEscpos, getSetting } from "@/lib/tauri";

// ── Format helpers ────────────────────────────────────────────

async function getStoreName(): Promise<string> {
  try {
    return (await getSetting("store_name")) ?? "Mon Commerce";
  } catch {
    return "Mon Commerce";
  }
}

function buildReceiptDoc(tx: TransactionFull, storeName: string, cashierName?: string): EscPosReceiptDoc {
  const { transaction, lines, payments } = tx;
  const tvaMap = new Map<number, { tva: number; ht: number }>();
  for (const l of lines) {
    const existing = tvaMap.get(l.tva_rate_pct) ?? { tva: 0, ht: 0 };
    tvaMap.set(l.tva_rate_pct, {
      tva: existing.tva + l.line_total_tva,
      ht:  existing.ht  + l.line_total_ht,
    });
  }
  return {
    store_name:     storeName,
    sequence_no:    transaction.sequence_no,
    created_at:     transaction.created_at,
    cashier_name:   cashierName ?? null,
    lines: lines.map((l) => ({
      product_name:   l.product_name,
      quantity:       l.quantity,
      unit_price_ttc: l.unit_price_ttc,
      line_total_ttc: l.line_total_ttc,
      tva_rate_pct:   l.tva_rate_pct,
    })),
    total_ht:       transaction.total_ht,
    total_ttc:      transaction.total_ttc,
    discount_ttc:   transaction.discount_ttc,
    payment_method: payments[0]?.method ?? "AUTRE",
    payment_amount: payments[0]?.amount ?? transaction.total_ttc,
    cash_change:    payments[0]?.cash_change ?? null,
    tva_groups:     Array.from(tvaMap.entries()).map(([rate_pct, v]) => ({ rate_pct, ...v })),
    hash:           transaction.hash,
    is_avoir:       transaction.type === "AVOIR",
  };
}

function buildRapportDoc(rapport: RapportX, storeName: string): EscPosRapportDoc {
  const { session } = rapport;
  const sessionLabel = `Z-${session.opened_at.slice(0, 4)}-${session.id.slice(0, 6).toUpperCase()}`;
  const sessionDate = new Date(session.opened_at).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return {
    store_name:       storeName,
    session_label:    sessionLabel,
    session_date:     sessionDate,
    nb_transactions:  rapport.nb_transactions,
    net_ttc:          rapport.net_ttc,
    total_ventes_ttc: rapport.total_ventes_ttc,
    total_avoirs_ttc: rapport.total_avoirs_ttc,
    pay_cb:           rapport.pay_cb,
    pay_especes:      rapport.pay_especes,
    pay_cheque:       rapport.pay_cheque,
    pay_autre:        rapport.pay_autre,
    tva_550:  rapport.tva_550,  ht_550:  rapport.ht_550,
    tva_1000: rapport.tva_1000, ht_1000: rapport.ht_1000,
    tva_2000: rapport.tva_2000, ht_2000: rapport.ht_2000,
    is_z: session.status === "CLOSED",
  };
}

// ── JSON download ─────────────────────────────────────────────

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Public hook ───────────────────────────────────────────────

export function usePrint() {
  const trigger = usePrintStore((s) => s.trigger);
  return { trigger };
}

/** Called from PrintModal when the user picks a format. */
export async function executePrint(
  job: PrintJob,
  format: "escpos" | "pdf" | "json",
  cashierName?: string,
): Promise<void> {
  const storeName = await getStoreName();

  if (job.type === "receipt") {
    const tx = job.transaction;
    const label = `ticket-${tx.transaction.sequence_no.toString().padStart(5, "0")}`;

    switch (format) {
      case "escpos": {
        const doc = buildReceiptDoc(tx, storeName, cashierName);
        await printReceiptEscpos(doc);
        break;
      }
      case "pdf": {
        window.__PRINT_JOB__ = job;
        window.dispatchEvent(new CustomEvent("ldc:print-pdf", { detail: job }));
        await new Promise((r) => setTimeout(r, 100)); // let React render
        window.print();
        break;
      }
      case "json": {
        downloadJson(tx, `${label}.json`);
        break;
      }
    }
  } else {
    const rapport = job.rapport;
    const label   = `rapport-z-${rapport.session.opened_at.slice(0, 10)}`;

    switch (format) {
      case "escpos": {
        const doc = buildRapportDoc(rapport, storeName);
        await printRapportEscpos(doc);
        break;
      }
      case "pdf": {
        window.__PRINT_JOB__ = job;
        window.dispatchEvent(new CustomEvent("ldc:print-pdf", { detail: job }));
        await new Promise((r) => setTimeout(r, 100));
        window.print();
        break;
      }
      case "json": {
        downloadJson(rapport, `${label}.json`);
        break;
      }
    }
  }
}

// Augment window for the PDF print bridge
declare global {
  interface Window { __PRINT_JOB__?: PrintJob; }
}
