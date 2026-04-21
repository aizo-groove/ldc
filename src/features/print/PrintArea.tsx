import { useEffect, useState } from "react";
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

export function PrintArea() {
  const [job, setJob] = useState<PrintJob | null>(null);

  useEffect(() => {
    const handler = (e: Event) => setJob((e as CustomEvent<PrintJob>).detail);
    window.addEventListener("ldc:print-pdf", handler);
    return () => window.removeEventListener("ldc:print-pdf", handler);
  }, []);

  if (!job) return <div id="print-area" />;

  return (
    <div id="print-area">
      {job.type === "receipt" ? (
        <ReceiptPrint job={job} />
      ) : (
        <RapportPrint job={job} />
      )}
    </div>
  );
}

function ReceiptPrint({ job }: { job: Extract<PrintJob, { type: "receipt" }> }) {
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
    <div className="receipt">
      <div className="receipt-header">
        <strong>MON COMMERCE</strong>
        <div>{fmtDate(tx.created_at)}</div>
        <div>Ticket #{tx.sequence_no.toString().padStart(5, "0")}</div>
        {isAvoir && <div className="avoir-badge">*** AVOIR ***</div>}
      </div>

      <div className="receipt-sep" />

      <table className="receipt-lines">
        <tbody>
          {lines.map((l) => (
            <tr key={l.id}>
              <td>{l.product_name}</td>
              <td className="right">{l.quantity}×</td>
              <td className="right">{formatCents(l.line_total_ttc)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="receipt-sep" />

      <table className="receipt-totals">
        <tbody>
          <tr><td>Sous-total HT</td><td className="right">{formatCents(tx.total_ht)}</td></tr>
          {Object.entries(tvaGroups).map(([r, { tva }]) => (
            <tr key={r}><td>TVA {(Number(r) / 100).toFixed(1)} %</td><td className="right">{formatCents(tva)}</td></tr>
          ))}
          {tx.discount_ttc > 0 && (
            <tr><td>Remise</td><td className="right">-{formatCents(tx.discount_ttc)}</td></tr>
          )}
        </tbody>
      </table>

      <div className="receipt-total-line">
        <span>TOTAL TTC</span>
        <span>{isAvoir ? "-" : ""}{formatCents(tx.total_ttc)}</span>
      </div>

      <div className="receipt-sep" />

      <table className="receipt-totals">
        <tbody>
          <tr><td>{METHOD_LABELS[method] ?? method}</td><td className="right">{formatCents(payments[0]?.amount ?? tx.total_ttc)}</td></tr>
          {payments[0]?.cash_change != null && payments[0].cash_change > 0 && (
            <tr><td>Rendu monnaie</td><td className="right">{formatCents(payments[0].cash_change)}</td></tr>
          )}
        </tbody>
      </table>

      <div className="receipt-sep" />
      <div className="receipt-footer">
        <div>Merci de votre visite !</div>
        <div className="receipt-hash">NF525 #{tx.sequence_no} — {tx.hash.slice(0, 16)}</div>
      </div>
    </div>
  );
}

function RapportPrint({ job }: { job: Extract<PrintJob, { type: "rapport" }> }) {
  const r = job.rapport;
  const isClosed = r.session.status === "CLOSED";
  const label = `Z-${r.session.opened_at.slice(0, 4)}-${r.session.id.slice(0, 6).toUpperCase()}`;
  const date  = new Date(r.session.opened_at).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const tvaRows = [
    { rate: "5,5 %",  tva: r.tva_550,  ht: r.ht_550  },
    { rate: "10 %",   tva: r.tva_1000, ht: r.ht_1000 },
    { rate: "20 %",   tva: r.tva_2000, ht: r.ht_2000 },
  ].filter((row) => row.tva > 0);

  return (
    <div className="rapport">
      <div className="rapport-header">
        <h1>{isClosed ? "CLÔTURE Z" : "RAPPORT X"}</h1>
        <div className="rapport-meta">
          <span>{date}</span>
          <span className="mono">{label}</span>
        </div>
      </div>

      <section>
        <h2>Activité</h2>
        <table><tbody>
          <tr><td>Transactions</td><td>{r.nb_transactions}</td></tr>
          <tr><td>Ventes TTC</td><td>{formatCents(r.total_ventes_ttc)}</td></tr>
          {r.total_avoirs_ttc > 0 && <tr><td>Avoirs TTC</td><td>-{formatCents(r.total_avoirs_ttc)}</td></tr>}
          <tr className="total"><td>Net TTC</td><td>{formatCents(r.net_ttc)}</td></tr>
        </tbody></table>
      </section>

      <section>
        <h2>Ventilation paiements</h2>
        <table><tbody>
          {r.pay_cb      > 0 && <tr><td>Carte bancaire</td><td>{formatCents(r.pay_cb)}</td></tr>}
          {r.pay_especes > 0 && <tr><td>Espèces</td>       <td>{formatCents(r.pay_especes)}</td></tr>}
          {r.pay_cheque  > 0 && <tr><td>Chèques</td>       <td>{formatCents(r.pay_cheque)}</td></tr>}
          {r.pay_autre   > 0 && <tr><td>Autre</td>         <td>{formatCents(r.pay_autre)}</td></tr>}
        </tbody></table>
      </section>

      {tvaRows.length > 0 && (
        <section>
          <h2>Ventilation TVA</h2>
          <table>
            <thead><tr><th>Taux</th><th>Base HT</th><th>TVA</th></tr></thead>
            <tbody>
              {tvaRows.map(({ rate, tva, ht }) => (
                <tr key={rate}>
                  <td>{rate}</td>
                  <td>{formatCents(ht)}</td>
                  <td>{formatCents(tva)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {isClosed && (
        <div className="rapport-footer">Session verrouillée NF525 — {label}</div>
      )}
    </div>
  );
}
