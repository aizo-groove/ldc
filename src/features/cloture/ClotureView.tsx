import { useEffect, useState } from "react";
import { AlertTriangle, Archive, CreditCard, Banknote, FileCheck, ReceiptText, CheckCircle2, LogOut, Printer } from "lucide-react";
import { cn, formatCents } from "@/lib/utils";
import { useSessionStore } from "@/features/session/store";
import { getRapportX } from "@/lib/tauri";
import type { RapportX } from "@/types/session";
import { usePrintStore } from "@/features/print/store";

interface ClotureViewProps {
  onDone: () => void;
}

// ── Composants internes ────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-black text-outline uppercase tracking-widest mb-4 select-none">
      {children}
    </h2>
  );
}

interface TvaRowProps {
  label: string;
  rate: string;
  tva_cents: number;
  ht_cents: number;
}

function TvaRow({ label, rate, tva_cents, ht_cents }: TvaRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-outline-variant/10 last:border-0">
      <div className="flex items-center gap-3">
        <span className="px-2 py-0.5 bg-surface-container text-outline text-[10px] font-black uppercase rounded w-12 text-center">
          {rate}
        </span>
        <span className="text-sm text-on-surface">{label}</span>
      </div>
      <div className="flex items-center gap-8 text-right">
        <div>
          <p className="text-[10px] text-outline uppercase tracking-tight">TVA</p>
          <p className="text-sm font-bold text-error">{formatCents(tva_cents)}</p>
        </div>
        <div>
          <p className="text-[10px] text-outline uppercase tracking-tight">Base HT</p>
          <p className="text-sm font-bold text-on-surface">{formatCents(ht_cents)}</p>
        </div>
      </div>
    </div>
  );
}

interface PaymentCardProps {
  label: string;
  cents: number;
  count: number;
  borderClass: string;
  iconClass: string;
  icon: React.ReactNode;
}

function PaymentCard({ label, cents, count, borderClass, iconClass, icon }: PaymentCardProps) {
  return (
    <div className={cn("flex-1 bg-surface-container p-4 rounded-xl border-l-4", borderClass)}>
      <div className={cn("mb-3", iconClass)}>{icon}</div>
      <p className="text-[10px] text-outline uppercase tracking-widest mb-1 select-none">{label}</p>
      <p className="text-xl font-black text-on-surface">{formatCents(cents)}</p>
      <p className="text-xs text-outline mt-1">{count} transaction{count > 1 ? "s" : ""}</p>
    </div>
  );
}

// ── Skeletons de chargement ────────────────────────────────────

function LoadingSkeleton() {
  return (
    <main className="mt-16 p-8 h-[calc(100vh-64px)] bg-surface flex items-center justify-center">
      <p className="text-outline text-sm uppercase tracking-widest animate-pulse">
        Chargement du rapport…
      </p>
    </main>
  );
}

// ── Vue principale ─────────────────────────────────────────────

export function ClotureView({ onDone }: ClotureViewProps) {
  const { session, close: closeSession } = useSessionStore();
  const [rapport, setRapport] = useState<RapportX | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [closed, setClosed] = useState(false);

  // Fonds de caisse d'ouverture (stocké sur la session)
  const openingFloat = session?.opening_float ?? 0;

  // Recomptage espèces
  const theoreticalEspeces = openingFloat + (rapport?.pay_especes ?? 0);
  const [countedStr, setCountedStr] = useState("");

  useEffect(() => {
    if (!session) return;
    getRapportX(session.id)
      .then((r) => {
        setRapport(r);
        // Pré-remplit le champ avec le montant théorique
        setCountedStr(
          ((openingFloat + r.pay_especes) / 100).toFixed(2).replace(".", ",")
        );
      })
      .catch((e) => console.error("get_rapport_x failed:", e));
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const countedCents = Math.round(
    parseFloat(countedStr.replace(",", ".").replace(/[^0-9.]/g, "") || "0") * 100
  );
  const ecartCents = countedCents - theoreticalEspeces;
  const ecartPositive = ecartCents > 0;
  const ecartZero = ecartCents === 0;

  const handleValidate = async () => {
    setIsClosing(true);
    try {
      await closeSession();
      setClosed(true);
    } catch (e) {
      console.error("close_session failed:", e);
      setIsClosing(false);
    }
  };

  if (!rapport) return <LoadingSkeleton />;

  const tvaRows: TvaRowProps[] = [
    { label: "Taux Réduit",        rate: "5,5%", tva_cents: rapport.tva_550,  ht_cents: rapport.ht_550  },
    { label: "Taux Intermédiaire", rate: "10%",  tva_cents: rapport.tva_1000, ht_cents: rapport.ht_1000 },
    { label: "Taux Normal",        rate: "20%",  tva_cents: rapport.tva_2000, ht_cents: rapport.ht_2000 },
  ].filter((r) => r.tva_cents > 0 || r.ht_cents > 0);

  const totalTvaCollectee = tvaRows.reduce((s, r) => s + r.tva_cents, 0);

  const sessionLabel = `Z-${rapport.session.opened_at.slice(0, 4)}-${rapport.session.id.slice(0, 6).toUpperCase()}`;
  const sessionDate = new Date(rapport.session.opened_at).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  if (closed) {
    return (
      <main className="mt-16 p-8 h-[calc(100vh-64px)] bg-surface overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Success banner */}
          <div className="flex items-center gap-4 bg-secondary/10 border border-secondary/30 rounded-2xl px-6 py-5">
            <CheckCircle2 size={32} className="text-secondary shrink-0" />
            <div className="flex-1">
              <p className="font-black text-secondary uppercase tracking-widest text-sm">Clôture enregistrée</p>
              <p className="text-xs text-outline mt-0.5">
                Session <span className="font-mono text-on-surface-variant">{sessionLabel}</span> — {sessionDate}
              </p>
            </div>
            <button
              onClick={() => usePrintStore.getState().trigger({ type: "rapport", rapport })}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-bright transition-colors"
            >
              <Printer size={14} /> Imprimer
            </button>
          </div>

          {/* Key figures */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "CA TTC",        value: formatCents(rapport.net_ttc),       sub: `${rapport.nb_transactions} transactions` },
              { label: "TVA collectée", value: formatCents(rapport.tva_550 + rapport.tva_1000 + rapport.tva_2000 + rapport.tva_210), sub: "total toutes taxes" },
              { label: "Espèces",       value: formatCents(rapport.pay_especes),   sub: "encaissées" },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-surface-container-low rounded-xl p-4">
                <p className="text-[10px] text-outline uppercase tracking-widest mb-1">{label}</p>
                <p className="text-xl font-black text-on-surface">{value}</p>
                <p className="text-xs text-outline mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Payment breakdown */}
          <div className="bg-surface-container-low rounded-xl p-5 space-y-2">
            <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-3">Ventilation paiements</p>
            {[
              { label: "Carte bancaire", value: rapport.pay_cb },
              { label: "Espèces",        value: rapport.pay_especes },
              { label: "Chèques",        value: rapport.pay_cheque },
              { label: "Autre",          value: rapport.pay_autre },
            ].filter((r) => r.value > 0).map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-outline-variant/10 last:border-0">
                <span className="text-sm text-on-surface-variant">{label}</span>
                <span className="font-bold text-sm">{formatCents(value)}</span>
              </div>
            ))}
          </div>

          {/* TVA breakdown */}
          {tvaRows.length > 0 && (
            <div className="bg-surface-container-low rounded-xl p-5 space-y-2">
              <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-3">Ventilation TVA</p>
              {tvaRows.map(({ rate, label, tva_cents, ht_cents }) => (
                <div key={rate} className="flex justify-between items-center py-1.5 border-b border-outline-variant/10 last:border-0">
                  <span className="text-sm text-on-surface-variant">{label} ({rate})</span>
                  <div className="text-right">
                    <span className="font-bold text-sm text-error">{formatCents(tva_cents)}</span>
                    <span className="text-xs text-outline ml-2">HT {formatCents(ht_cents)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onDone}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-surface-container-high text-on-surface font-black text-sm uppercase tracking-widest hover:bg-surface-bright active:scale-[0.98] transition-all"
          >
            <LogOut size={18} />
            Fermer et changer de caissier
          </button>

        </div>
      </main>
    );
  }

  return (
    <main className="mt-16 p-8 h-[calc(100vh-64px)] bg-surface overflow-y-auto">
      {/* Blobs décoratifs */}
      <div className="fixed bottom-[-10%] right-[-5%] w-100 h-100 bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-[-10%] left-[14%] w-75 h-75 bg-error/5 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* ── En-tête ────────────────────────────────────────── */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <ReceiptText size={22} className="text-outline" />
              <h1 className="text-3xl font-black tracking-tight text-on-surface">
                Clôture Z
              </h1>
            </div>
            <p className="text-outline text-sm capitalize">
              {sessionDate} &mdash; Session{" "}
              <span className="font-mono text-on-surface-variant">{sessionLabel}</span>
              {" "}&mdash; {rapport.nb_transactions} transaction{rapport.nb_transactions > 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-outline uppercase tracking-widest mb-1 select-none">
              Chiffre d'affaires TTC
            </p>
            <p className="text-4xl font-black text-secondary">
              {formatCents(rapport.net_ttc)}
            </p>
          </div>
        </div>

        {/* ── Corps : 2 colonnes ─────────────────────────────── */}
        <div className="grid grid-cols-12 gap-6">

          {/* ── Colonne gauche (7/12) ──────────────────────── */}
          <div className="col-span-7 flex flex-col gap-6">

            {/* Ventilation TVA */}
            <div className="bg-surface-container-low rounded-2xl p-6 shadow-xl">
              <SectionTitle>Ventilation TVA</SectionTitle>
              {tvaRows.length > 0 ? (
                <>
                  {tvaRows.map((row) => (
                    <TvaRow key={row.rate} {...row} />
                  ))}
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-outline-variant/20">
                    <span className="text-xs font-black text-outline uppercase tracking-widest">
                      Total TVA collectée
                    </span>
                    <span className="text-lg font-black text-error">
                      {formatCents(totalTvaCollectee)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-outline py-4 text-center">Aucune TVA collectée</p>
              )}
            </div>

            {/* Ventilation paiements */}
            <div className="bg-surface-container-low rounded-2xl p-6 shadow-xl">
              <SectionTitle>Réconciliation des Paiements</SectionTitle>
              <div className="flex gap-4">
                <PaymentCard
                  label="Carte Bancaire"
                  cents={rapport.pay_cb}
                  count={0}
                  borderClass="border-primary"
                  iconClass="text-primary"
                  icon={<CreditCard size={18} />}
                />
                <PaymentCard
                  label="Espèces"
                  cents={rapport.pay_especes}
                  count={0}
                  borderClass="border-secondary"
                  iconClass="text-secondary"
                  icon={<Banknote size={18} />}
                />
                <PaymentCard
                  label="Chèques"
                  cents={rapport.pay_cheque}
                  count={0}
                  borderClass="border-outline"
                  iconClass="text-outline"
                  icon={<FileCheck size={18} />}
                />
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-outline-variant/20">
                <span className="text-xs font-black text-outline uppercase tracking-widest">
                  Total encaissé
                </span>
                <span className="text-lg font-black text-on-surface">
                  {formatCents(rapport.pay_cb + rapport.pay_especes + rapport.pay_cheque + rapport.pay_autre)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Colonne droite (5/12) ──────────────────────── */}
          <div className="col-span-5 flex flex-col gap-6">

            {/* Recomptage caisse */}
            <div className="bg-surface-container-low rounded-2xl p-6 shadow-xl">
              <SectionTitle>Recomptage Caisse Espèces</SectionTitle>

              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-outline">Montant théorique</span>
                <span className="font-mono text-sm font-bold text-on-surface">
                  {formatCents(theoreticalEspeces)}
                </span>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-outline mb-2">
                  Montant compté (€)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={countedStr}
                    onChange={(e) => setCountedStr(e.target.value)}
                    className="w-full bg-surface-container text-on-surface text-right font-mono text-lg font-black px-4 py-3 rounded-xl outline-none border border-outline-variant/20 focus:border-primary/50 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
                    €
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  "flex justify-between items-center p-3 rounded-xl",
                  ecartZero
                    ? "bg-secondary/10"
                    : ecartPositive
                    ? "bg-primary/10"
                    : "bg-error/10"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-bold uppercase tracking-wide",
                    ecartZero ? "text-secondary" : ecartPositive ? "text-primary" : "text-error"
                  )}
                >
                  Écart de caisse
                </span>
                <span
                  className={cn(
                    "font-mono font-black text-sm",
                    ecartZero ? "text-secondary" : ecartPositive ? "text-primary" : "text-error"
                  )}
                >
                  {ecartPositive ? "+" : ""}
                  {formatCents(ecartCents)}
                </span>
              </div>
            </div>

            {/* Avertissement NF525 */}
            <div className="bg-error-container/20 border border-error/30 rounded-2xl p-5 flex gap-4">
              <AlertTriangle size={20} className="text-error shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-error uppercase tracking-widest mb-1">
                  Action irréversible — NF525
                </p>
                <p className="text-xs text-on-surface leading-relaxed">
                  La clôture Z verrouille définitivement la session et génère un
                  enregistrement certifié. Cette opération ne peut pas être annulée.
                </p>
              </div>
            </div>

            {/* Bouton de validation */}
            <button
              onClick={handleValidate}
              disabled={isClosing}
              className="w-full flex flex-col items-center justify-center gap-1 bg-primary text-on-primary py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                <Archive size={18} />
                <span>{isClosing ? "Archivage en cours…" : "Valider la Clôture et Archiver"}</span>
              </div>
              <span className="text-[10px] font-bold opacity-70 tracking-widest normal-case">
                Session {sessionLabel}
              </span>
            </button>

          </div>
        </div>
      </div>
    </main>
  );
}
