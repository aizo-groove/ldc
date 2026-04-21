import { useEffect, useState } from "react";
import {
  CreditCard, Banknote, FileCheck, RotateCcw, Printer,
  Undo2, Trash2, Search, History, RefreshCw, Archive,
  CheckCircle2, Clock,
} from "lucide-react";
import { cn, formatCents } from "@/lib/utils";
import { listRecentTransactions, getTransaction, listSessions, getRapportX } from "@/lib/tauri";
import type { Transaction, TransactionFull } from "@/types/transaction";
import type { Session, RapportX } from "@/types/session";
import { usePrintStore } from "@/features/print/store";

// ── Helpers ───────────────────────────────────────────────────

function formatDate(iso: string): { day: string; time: string } {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  return {
    day: isToday
      ? "Aujourd'hui"
      : isYesterday
      ? "Hier"
      : date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  };
}

const PAYMENT_META: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  CB:       { label: "Carte Bancaire", icon: <CreditCard size={15} />, className: "text-primary" },
  ESPECES:  { label: "Espèces",        icon: <Banknote   size={15} />, className: "text-secondary" },
  CHEQUE:   { label: "Chèque",         icon: <FileCheck  size={15} />, className: "text-outline" },
  AVOIR:    { label: "Avoir",          icon: <RotateCcw  size={15} />, className: "text-error" },
  VIREMENT: { label: "Virement",       icon: <RefreshCw  size={15} />, className: "text-primary" },
  AUTRE:    { label: "Autre",          icon: <Banknote   size={15} />, className: "text-outline" },
};

type FilterTab = "all" | "ventes" | "retours";
type MainTab   = "transactions" | "clotures";

// ── Sous-composants ───────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-outline">
      <History size={36} strokeWidth={1.5} />
      <p className="text-sm font-bold uppercase tracking-widest">Aucune transaction</p>
      <p className="text-xs opacity-60">Les ventes apparaîtront ici.</p>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-outline">
      <CreditCard size={32} strokeWidth={1.5} />
      <p className="text-xs font-bold uppercase tracking-widest">Sélectionnez une transaction</p>
    </div>
  );
}

function EmptyClotures() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-outline">
      <Archive size={36} strokeWidth={1.5} />
      <p className="text-sm font-bold uppercase tracking-widest">Aucune clôture</p>
      <p className="text-xs opacity-60">Les clôtures Z apparaîtront ici.</p>
    </div>
  );
}

// ── Vue principale ─────────────────────────────────────────────

export function HistoriqueView() {
  const [mainTab, setMainTab] = useState<MainTab>("transactions");

  // ── Transactions tab state ──
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [detail, setDetail]             = useState<TransactionFull | null>(null);
  const [filter, setFilter]             = useState<FilterTab>("all");
  const [search, setSearch]             = useState("");
  const [isLoadingList, setIsLoadingList]     = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [listError, setListError]             = useState<string | null>(null);

  // ── Clôtures tab state ──
  const [sessions, setSessions]           = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionRapport, setSessionRapport]   = useState<RapportX | null>(null);
  const [isLoadingSessions, setIsLoadingSessions]   = useState(false);
  const [isLoadingRapport, setIsLoadingRapport]     = useState(false);

  // Load transactions
  useEffect(() => {
    listRecentTransactions(100)
      .then((txs) => {
        setTransactions(txs);
        if (txs.length > 0) setSelectedId(txs[0].id);
      })
      .catch((e) => setListError(String(e)))
      .finally(() => setIsLoadingList(false));
  }, []);

  // Load sessions when tab becomes active
  useEffect(() => {
    if (mainTab !== "clotures" || sessions.length > 0) return;
    setIsLoadingSessions(true);
    listSessions(50)
      .then(setSessions)
      .catch(console.error)
      .finally(() => setIsLoadingSessions(false));
  }, [mainTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load detail when transaction selection changes
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setIsLoadingDetail(true);
    getTransaction(selectedId)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setIsLoadingDetail(false));
  }, [selectedId]);

  // Load rapport when session selection changes
  useEffect(() => {
    if (!selectedSession) { setSessionRapport(null); return; }
    setIsLoadingRapport(true);
    getRapportX(selectedSession.id)
      .then(setSessionRapport)
      .catch(console.error)
      .finally(() => setIsLoadingRapport(false));
  }, [selectedSession]);

  const filtered = transactions.filter((t) => {
    if (filter === "ventes"  && t.type !== "VENTE") return false;
    if (filter === "retours" && t.type !== "AVOIR") return false;
    if (search) {
      const q = search.toLowerCase();
      return t.id.toLowerCase().includes(q) || t.sequence_no.toString().includes(q);
    }
    return true;
  });

  const reloadTransactions = () => {
    setIsLoadingList(true);
    setListError(null);
    listRecentTransactions(100)
      .then((txs) => { setTransactions(txs); if (txs.length > 0 && !selectedId) setSelectedId(txs[0].id); })
      .catch((e) => setListError(String(e)))
      .finally(() => setIsLoadingList(false));
  };

  const reloadSessions = () => {
    setIsLoadingSessions(true);
    setSessions([]);
    setSelectedSession(null);
    listSessions(50)
      .then(setSessions)
      .catch(console.error)
      .finally(() => setIsLoadingSessions(false));
  };

  return (
    <main className="mt-16 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-surface">

      {/* ── Tab switcher ──────────────────────────────────── */}
      <div className="flex items-center gap-1 px-4 pt-4 shrink-0">
        {([
          { id: "transactions", label: "Transactions", icon: <History size={15} /> },
          { id: "clotures",     label: "Clôtures Z",   icon: <Archive size={15} /> },
        ] as { id: MainTab; label: string; icon: React.ReactNode }[]).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setMainTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors",
              mainTab === id
                ? "bg-surface-container-high text-primary"
                : "text-outline hover:text-on-surface hover:bg-surface-container-low"
            )}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden gap-4 p-4">

        {mainTab === "transactions" ? (
          <>
            {/* ── Left: transaction list ─────────────────── */}
            <section className="flex-1 flex flex-col bg-surface-container-low rounded-2xl overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between border-b border-outline-variant/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex bg-surface-container-lowest rounded-lg p-1 gap-0.5">
                    {(["all", "ventes", "retours"] as FilterTab[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                          "px-3 py-1.5 text-[10px] font-black uppercase tracking-wide rounded-md transition-colors",
                          filter === f
                            ? "bg-surface-container-high text-primary"
                            : "text-on-surface/40 hover:text-on-surface"
                        )}
                      >
                        {f === "all" ? "Tous" : f === "ventes" ? "Ventes" : "Retours"}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="N° transaction…"
                      className="bg-surface-container-lowest text-sm pl-8 pr-3 py-1.5 rounded-lg outline-none border border-outline-variant/10 focus:border-primary/40 transition-colors w-44 text-on-surface placeholder:text-outline"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-outline font-bold uppercase">
                    {filtered.length} transaction{filtered.length > 1 ? "s" : ""}
                  </span>
                  <button onClick={reloadTransactions} className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container-high transition-colors">
                    <RefreshCw size={14} className={cn(isLoadingList && "animate-spin")} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoadingList ? (
                  <div className="flex items-center justify-center h-full text-outline text-sm animate-pulse uppercase tracking-widest">Chargement…</div>
                ) : listError ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-error px-8 text-center">
                    <p className="text-xs font-black uppercase tracking-widest">Erreur</p>
                    <p className="text-xs font-mono opacity-70 break-all">{listError}</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <EmptyState />
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-surface-container-low z-10">
                      <tr className="border-b border-outline-variant/10">
                        {["ID", "Date / Heure", "Type", "Paiement", "Total TTC"].map((h, i) => (
                          <th key={h} className={cn("px-5 py-3 text-[10px] font-black uppercase text-outline tracking-widest", i === 4 && "text-right")}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                      {filtered.map((tx) => {
                        const { day, time } = formatDate(tx.created_at);
                        const isSelected = tx.id === selectedId;
                        const isAvoir    = tx.type === "AVOIR";
                        return (
                          <tr
                            key={tx.id}
                            onClick={() => setSelectedId(tx.id)}
                            className={cn(
                              "cursor-pointer transition-colors border-l-4",
                              isSelected ? "bg-surface-container-high/60 border-primary" : "hover:bg-surface-container-high/30 border-transparent"
                            )}
                          >
                            <td className="px-5 py-4">
                              <span className={cn("font-mono text-sm font-bold", isSelected ? "text-primary" : "text-on-surface/50")}>
                                #{tx.sequence_no.toString().padStart(5, "0")}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-bold text-on-surface">{day}</p>
                              <p className="text-xs text-outline">{time}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded", isAvoir ? "bg-error/10 text-error" : "bg-primary/10 text-primary")}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <PaymentBadge transactionId={tx.id} detail={isSelected ? detail : null} />
                            </td>
                            <td className={cn("px-5 py-4 text-right font-mono text-base font-black", isAvoir ? "text-error" : "text-on-surface")}>
                              {isAvoir ? "−" : ""}{formatCents(tx.total_ttc)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* ── Right: transaction detail ──────────────── */}
            <section className="w-100 shrink-0 bg-surface-container-low rounded-2xl flex flex-col overflow-hidden shadow-2xl">
              {isLoadingDetail ? (
                <div className="flex items-center justify-center h-full text-outline text-sm animate-pulse uppercase tracking-widest">Chargement…</div>
              ) : !detail ? (
                <EmptyDetail />
              ) : (
                <DetailPanel detail={detail} onPrint={() => usePrintStore.getState().trigger({ type: "receipt", transaction: detail })} />
              )}
            </section>
          </>
        ) : (
          <>
            {/* ── Left: sessions list ────────────────────── */}
            <section className="w-80 shrink-0 flex flex-col bg-surface-container-low rounded-2xl overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between border-b border-outline-variant/10 shrink-0">
                <span className="text-[10px] font-black text-outline uppercase tracking-widest">
                  {sessions.length} session{sessions.length > 1 ? "s" : ""}
                </span>
                <button onClick={reloadSessions} className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container-high transition-colors">
                  <RefreshCw size={14} className={cn(isLoadingSessions && "animate-spin")} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoadingSessions ? (
                  <div className="flex items-center justify-center h-full text-outline text-sm animate-pulse uppercase tracking-widest">Chargement…</div>
                ) : sessions.length === 0 ? (
                  <EmptyClotures />
                ) : (
                  <div className="divide-y divide-outline-variant/5">
                    {sessions.map((s) => {
                      const { day, time } = formatDate(s.opened_at);
                      const isClosed   = s.status === "CLOSED";
                      const isSelected = selectedSession?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelectedSession(s)}
                          className={cn(
                            "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-l-4",
                            isSelected
                              ? "bg-surface-container-high/60 border-primary"
                              : "hover:bg-surface-container-high/30 border-transparent"
                          )}
                        >
                          <div className={cn("shrink-0", isClosed ? "text-secondary" : "text-primary")}>
                            {isClosed ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-on-surface truncate">{day}</p>
                            <p className="text-xs text-outline">{time}</p>
                          </div>
                          <span className={cn(
                            "text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0",
                            isClosed ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
                          )}>
                            {isClosed ? "Clôturée" : "En cours"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* ── Right: rapport detail ─────────────────── */}
            <section className="flex-1 bg-surface-container-low rounded-2xl overflow-y-auto">
              {isLoadingRapport ? (
                <div className="flex items-center justify-center h-full text-outline text-sm animate-pulse uppercase tracking-widest">Chargement du rapport…</div>
              ) : !sessionRapport ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-outline">
                  <Archive size={32} strokeWidth={1.5} />
                  <p className="text-xs font-bold uppercase tracking-widest">Sélectionnez une session</p>
                </div>
              ) : (
                <RapportPanel rapport={sessionRapport} onPrint={() => usePrintStore.getState().trigger({ type: "rapport", rapport: sessionRapport })} />
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

// ── PaymentBadge ──────────────────────────────────────────────

function PaymentBadge({ transactionId, detail }: { transactionId: string; detail: TransactionFull | null }) {
  if (!detail || detail.transaction.id !== transactionId) return <span className="text-xs text-outline">—</span>;
  const method = detail.payments[0]?.method ?? "AUTRE";
  const meta   = PAYMENT_META[method] ?? PAYMENT_META.AUTRE;
  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-bold uppercase", meta.className)}>
      {meta.icon}{meta.label}
    </div>
  );
}

// ── DetailPanel ───────────────────────────────────────────────

function DetailPanel({ detail, onPrint }: { detail: TransactionFull; onPrint: () => void }) {
  const { transaction: tx, lines, payments } = detail;
  const { day, time } = formatDate(tx.created_at);
  const isAvoir = tx.type === "AVOIR";
  const method  = payments[0]?.method ?? "AUTRE";
  const meta    = PAYMENT_META[method] ?? PAYMENT_META.AUTRE;

  const tvaGroups = lines.reduce<Record<number, { tva: number; ht: number }>>((acc, l) => {
    if (!acc[l.tva_rate_pct]) acc[l.tva_rate_pct] = { tva: 0, ht: 0 };
    acc[l.tva_rate_pct].tva += l.line_total_tva;
    acc[l.tva_rate_pct].ht  += l.line_total_ht;
    return acc;
  }, {});

  return (
    <>
      <div className="p-5 bg-surface-container-high border-b border-outline-variant/10 shrink-0">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-[10px] font-black uppercase text-outline tracking-widest mb-0.5">Ticket de Caisse</p>
            <h3 className="text-xl font-black text-on-surface tracking-tight">#{tx.sequence_no.toString().padStart(5, "0")}</h3>
          </div>
          <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase", isAvoir ? "bg-error/10 text-error" : "bg-secondary/10 text-secondary")}>
            {isAvoir ? "Avoir" : "Validée"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-outline font-bold uppercase mb-0.5">Date</p>
            <p className="text-on-surface">{day}, {time}</p>
          </div>
          <div>
            <p className="text-outline font-bold uppercase mb-0.5">Séquence NF525</p>
            <p className="font-mono text-on-surface">#{tx.sequence_no}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-surface-container-lowest mx-3 my-3 rounded-xl">
        <div className="space-y-3 mb-4">
          {lines.map((line) => (
            <div key={line.id} className="flex justify-between items-start gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-surface-container-high rounded-lg flex items-center justify-center font-black text-xs text-primary shrink-0">{line.quantity}×</div>
                <div>
                  <p className="text-sm font-bold text-on-surface uppercase leading-tight">{line.product_name}</p>
                  {line.product_sku && <p className="text-[10px] text-outline mt-0.5">SKU: {line.product_sku}</p>}
                </div>
              </div>
              <p className="font-mono text-sm font-bold text-on-surface shrink-0">{formatCents(line.line_total_ttc)}</p>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-dashed border-outline-variant/20 my-3" />

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-outline font-bold uppercase">
            <span>Sous-total HT</span><span className="font-mono">{formatCents(tx.total_ht)}</span>
          </div>
          {Object.entries(tvaGroups).map(([rate, { tva }]) => (
            <div key={rate} className="flex justify-between text-xs text-outline font-bold uppercase">
              <span>TVA {(Number(rate) / 100).toFixed(1).replace(".", ",")}%</span>
              <span className="font-mono">{formatCents(tva)}</span>
            </div>
          ))}
          {tx.discount_ttc > 0 && (
            <div className="flex justify-between text-xs text-error font-bold uppercase">
              <span>Remise</span><span className="font-mono">−{formatCents(tx.discount_ttc)}</span>
            </div>
          )}
          <div className="flex justify-between items-end pt-2">
            <span className="text-base font-black uppercase tracking-tighter text-on-surface">Total</span>
            <span className={cn("text-2xl font-black font-mono tracking-tight", isAvoir ? "text-error" : "text-secondary")}>
              {isAvoir ? "−" : ""}{formatCents(tx.total_ttc)}
            </span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-surface-container-low rounded-xl border border-outline-variant/10">
          <p className="text-[10px] font-black uppercase text-outline mb-1.5">Moyen de paiement</p>
          <div className="flex items-center gap-2">
            <span className={cn("shrink-0", meta.className)}>{meta.icon}</span>
            <span className={cn("text-sm font-bold uppercase", meta.className)}>{meta.label}</span>
            {payments[0]?.cash_change != null && payments[0].cash_change > 0 && (
              <span className="ml-auto text-xs text-outline font-mono">Rendu : {formatCents(payments[0].cash_change)}</span>
            )}
          </div>
        </div>

        <div className="mt-3 px-2">
          <p className="text-[9px] font-mono text-outline/40 break-all leading-relaxed">{tx.hash.slice(0, 32)}…</p>
        </div>
      </div>

      <div className="p-4 bg-surface-container-high border-t border-outline-variant/10 flex flex-col gap-2 shrink-0">
        <button onClick={onPrint} className="flex items-center justify-center gap-2 w-full py-3 bg-secondary-container text-on-secondary-container rounded-xl font-black uppercase tracking-widest text-xs hover:opacity-90 active:scale-[0.98] transition-all">
          <Printer size={16} /> Imprimer Duplicata
        </button>
        <button className="flex items-center justify-center gap-2 w-full py-3 bg-surface-container-highest text-on-surface rounded-xl font-black uppercase tracking-widest text-xs hover:bg-surface-bright active:scale-[0.98] transition-all border border-outline-variant/20">
          <Undo2 size={16} /> Retour / Avoir
        </button>
        <button className="flex items-center justify-center gap-2 w-full py-2 text-error font-bold uppercase text-xs hover:bg-error/10 transition-colors rounded-lg">
          <Trash2 size={14} /> Annuler la transaction
        </button>
      </div>
    </>
  );
}

// ── RapportPanel ──────────────────────────────────────────────

function RapportPanel({ rapport, onPrint }: { rapport: RapportX; onPrint: () => void }) {
  const isClosed = rapport.session.status === "CLOSED";
  const sessionLabel = `Z-${rapport.session.opened_at.slice(0, 4)}-${rapport.session.id.slice(0, 6).toUpperCase()}`;
  const sessionDate = new Date(rapport.session.opened_at).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const tvaRows = [
    { label: "Taux Réduit",        rate: "5,5%", tva: rapport.tva_550,  ht: rapport.ht_550  },
    { label: "Taux Intermédiaire", rate: "10%",  tva: rapport.tva_1000, ht: rapport.ht_1000 },
    { label: "Taux Normal",        rate: "20%",  tva: rapport.tva_2000, ht: rapport.ht_2000 },
  ].filter((r) => r.tva > 0 || r.ht > 0);

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isClosed
              ? <CheckCircle2 size={18} className="text-secondary" />
              : <Clock size={18} className="text-primary" />}
            <span className={cn("text-xs font-black uppercase tracking-widest", isClosed ? "text-secondary" : "text-primary")}>
              {isClosed ? "Clôture Z" : "Rapport X — Session en cours"}
            </span>
          </div>
          <p className="text-sm text-outline capitalize">{sessionDate}</p>
          <p className="text-xs font-mono text-on-surface-variant mt-0.5">{sessionLabel}</p>
        </div>
        <button
          onClick={onPrint}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-bright transition-colors"
        >
          <Printer size={14} /> Imprimer
        </button>
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "CA TTC",         value: formatCents(rapport.net_ttc),       sub: `${rapport.nb_transactions} transactions` },
          { label: "TVA collectée",  value: formatCents(rapport.tva_550 + rapport.tva_1000 + rapport.tva_2000 + rapport.tva_210), sub: "toutes taxes" },
          { label: "Espèces",        value: formatCents(rapport.pay_especes),    sub: "encaissées" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-surface-container rounded-xl p-3">
            <p className="text-[10px] text-outline uppercase tracking-widest mb-1">{label}</p>
            <p className="text-lg font-black text-on-surface">{value}</p>
            <p className="text-xs text-outline mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Payments */}
      <div className="bg-surface-container rounded-xl p-4">
        <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-3">Ventilation paiements</p>
        <div className="space-y-2">
          {[
            { label: "Carte bancaire", value: rapport.pay_cb },
            { label: "Espèces",        value: rapport.pay_especes },
            { label: "Chèques",        value: rapport.pay_cheque },
            { label: "Autre",          value: rapport.pay_autre },
          ].filter((r) => r.value > 0).map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-1 border-b border-outline-variant/10 last:border-0">
              <span className="text-sm text-on-surface-variant">{label}</span>
              <span className="font-bold text-sm font-mono">{formatCents(value)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 mt-1">
            <span className="text-xs font-black text-outline uppercase tracking-wide">Total encaissé</span>
            <span className="font-black text-sm font-mono">{formatCents(rapport.pay_cb + rapport.pay_especes + rapport.pay_cheque + rapport.pay_autre)}</span>
          </div>
        </div>
      </div>

      {/* TVA */}
      {tvaRows.length > 0 && (
        <div className="bg-surface-container rounded-xl p-4">
          <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-3">Ventilation TVA</p>
          <div className="space-y-2">
            {tvaRows.map(({ rate, label, tva, ht }) => (
              <div key={rate} className="flex justify-between items-center py-1 border-b border-outline-variant/10 last:border-0">
                <span className="text-sm text-on-surface-variant">{label} ({rate})</span>
                <div className="text-right">
                  <span className="font-bold text-sm text-error font-mono">{formatCents(tva)}</span>
                  <span className="text-xs text-outline ml-2">HT {formatCents(ht)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
