import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { SideNav, type NavRoute } from "@/components/layout/SideNav";
import { useNavStore } from "@/components/layout/navStore";
import { CaisseView } from "@/features/caisse/CaisseView";
import { PaymentView } from "@/features/paiement/PaymentView";
import { ConfirmationView } from "@/features/confirmation/ConfirmationView";
import { InventaireView } from "@/features/inventaire/InventaireView";
import { ClotureView } from "@/features/cloture/ClotureView";
import { HistoriqueView } from "@/features/historique/HistoriqueView";
import { useCartStore } from "@/features/caisse/store";
import { useSessionStore } from "@/features/session/store";
import { useSettingsStore } from "@/features/settings/store";
import { SettingsView } from "@/features/settings/SettingsView";
import { TableView } from "@/features/tables/TableView";
import { PrintModal } from "@/features/print/PrintModal";
import { PrintArea } from "@/features/print/PrintArea";
import { FeedbackModal } from "@/features/feedback/FeedbackModal";
import { UpdateBanner } from "@/features/updater/UpdateBanner";
import { DevToolbar } from "@/features/dev/DevToolbar";
import { DonationModal } from "@/features/donation/DonationModal";
import { CashierSelectView } from "@/features/cashiers/CashierSelectView";
import { createTransaction, deleteTableOrder, updateTableStatus, getSetting, listCashiers } from "@/lib/tauri";
import { useTablesStore } from "@/features/tables/store";
import { OnboardingView } from "@/features/onboarding/OnboardingView";
import type { PaymentInput, TransactionFull, PersonGroup } from "@/types/transaction";
import type { Cashier } from "@/types/cashier";
import {
  openCustomerDisplayWindow,
  emitDisplay,
  type DisplayPayload,
} from "@/features/customer-display/window";
import { useTutorialStore } from "@/features/tutorial/store";
import { startTour } from "@/features/tutorial/tour";
import { WhatsNewModal } from "@/features/whats-new/WhatsNewModal";
import { getVersion } from "@tauri-apps/api/app";

// ── Types d'état de l'application ──────────────────────────
type AppScreen =
  | { type: "caisse" }
  | { type: "paiement"; orderNumber: number; totalTtc: number }
  | { type: "confirmation"; orderNumber: number; totalTtc: number; transaction: TransactionFull; personGroups: PersonGroup[] };

let orderCounter = 8490;

// ── Sync écran client ───────────────────────────────────────
function CustomerDisplaySync({ screen }: { screen: AppScreen }) {
  const items    = useCartStore((s) => s.items);
  const totalTtc = useCartStore((s) => s.totalTtc)();
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    getSetting("store_name").then((n) => setStoreName(n ?? ""));
  }, []);

  useEffect(() => {
    let payload: DisplayPayload;

    if (screen.type === "confirmation") {
      payload = { type: "thankyou", storeName, total: screen.totalTtc };
    } else if (items.length > 0) {
      payload = {
        type: "cart",
        storeName,
        total: totalTtc,
        items: items.map((i) => ({
          name:  i.product_name,
          qty:   i.quantity,
          total: i.unit_price_ttc * i.quantity - i.discount_ttc,
        })),
      };
    } else {
      payload = { type: "idle", storeName };
    }

    emitDisplay(payload).catch(() => {});
  }, [items, totalTtc, screen.type, storeName]);

  return null;
}

export default function App() {
  const [route, setRoute] = useState<NavRoute>("caisse");
  const [screen, setScreen] = useState<AppScreen>({ type: "caisse" });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [tableContext, setTableContext] = useState<{ tableId: string } | null>(null);
  const [onboarding, setOnboarding] = useState<"checking" | "needed" | "done">("checking");
  const [whatsNew, setWhatsNew] = useState<string | null>(null);

  const totalTtc = useCartStore((s) => s.totalTtc)();
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);

  const { session, cashier, error: sessionError, init: initSession, openForCashier, switchCashier, clearCashier } = useSessionStore();
  const initSettings = useSettingsStore((s) => s.init);
  const hasTables = useSettingsStore((s) => s.flags.hasTableManagement);
  const collapsed = useNavStore((s) => s.collapsed);

  const tutorialPending = useTutorialStore((s) => s.pending);
  const setTutorialPending = useTutorialStore((s) => s.setPending);

  useEffect(() => {
    if (cashier && tutorialPending) {
      setTutorialPending(false);
      setRoute("caisse");
      setScreen({ type: "caisse" });
      setTimeout(() => startTour(hasTables), 600);
    }
  }, [cashier?.id, tutorialPending]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initSession();
    initSettings();
    getSetting("customer_display_enabled").then((v) => {
      if (v === "true") openCustomerDisplayWindow().catch(() => {});
    });
    Promise.all([getSetting("store_name"), listCashiers(), getSetting("last_seen_version"), getVersion()]).then(([name, cashiers, lastSeen, current]) => {
      setOnboarding(!name && cashiers.length === 0 ? "needed" : "done");
      if (lastSeen !== current) setWhatsNew(current);
    }).catch(() => setOnboarding("done"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCashierSelected = (selected: Cashier, openingFloat = 0) => {
    if (session) {
      switchCashier(selected);
    } else {
      openForCashier(selected, openingFloat);
    }
  };

  if (onboarding === "checking") return null;

  if (onboarding === "needed") {
    return <OnboardingView onDone={() => setOnboarding("done")} />;
  }

  // Show cashier select until a cashier is identified
  if (!cashier) {
    return <CashierSelectView onSelect={handleCashierSelected} />;
  }

  const cashierName = cashier.name;

  // ── Transitions ─────────────────────────────────────────

  const openPayment = () => {
    setScreen({ type: "paiement", orderNumber: ++orderCounter, totalTtc });
  };

  const openPaymentFromTable = (tableId: string) => {
    setTableContext({ tableId });
    setScreen({ type: "paiement", orderNumber: ++orderCounter, totalTtc });
  };

  const validatePayment = async (payments: PaymentInput[], groups: PersonGroup[]): Promise<void> => {
    const current = screen;
    if (current.type !== "paiement") return;

    if (!session) {
      setPaymentError("Session de caisse non initialisée. Redémarrez l'application.");
      return;
    }

    setPaymentError(null);

    try {
      const result = await createTransaction({
        sessionId: session.id,
        transactionType: "VENTE",
        lines: cartItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          quantity: item.quantity,
          unit_price_ttc: item.unit_price_ttc,
          unit_price_ht: item.unit_price_ht,
          tva_rate_pct: item.tva_rate_pct,
          discount_ttc: item.discount_ttc,
        })),
        payments,
        discountTtc: 0,
      });

      clearCart();

      if (tableContext) {
        await deleteTableOrder(tableContext.tableId);
        await updateTableStatus(tableContext.tableId, "libre");
        useTablesStore.getState().load();
        setTableContext(null);
      }

      setScreen({
        type: "confirmation",
        orderNumber: current.orderNumber,
        totalTtc: current.totalTtc,
        transaction: result,
        personGroups: groups,
      });
    } catch (e) {
      setPaymentError(`Erreur lors de l'enregistrement : ${e}`);
    }
  };

  const returnToCaisse = () => {
    setTableContext(null);
    setScreen({ type: "caisse" });
  };

  // ── Rendu de la vue principale ──────────────────────────

  const renderMainView = () => {
    switch (screen.type) {
      case "caisse":
        switch (route) {
          case "caisse":     return <CaisseView onPay={openPayment} />;
          case "historique": return <HistoriqueView key={route} />;
          case "inventaire": return <InventaireView />;
          case "cloture":    return <ClotureView onDone={returnToCaisse} />;
          case "tables":     return <TableView onTablePay={openPaymentFromTable} />;
          case "parametres": return <SettingsView />;
        }

      case "confirmation":
        return (
          <ConfirmationView
            orderNumber={screen.orderNumber}
            transaction={screen.transaction}
            personGroups={screen.personGroups}
            onNewSale={returnToCaisse}
          />
        );
    }
  };

  const activeRoute: NavRoute | null =
    screen.type === "confirmation" ? null : route;

  return (
    <div className="h-full overflow-hidden bg-background text-on-surface">
      {screen.type !== "paiement" && (
        <>
          <TopBar
            cashierName={cashierName}
            onSwitchCashier={clearCashier}
            onPrinterSettings={() => { setRoute("parametres"); setScreen({ type: "caisse" }); }}
          />
          <SideNav
            activeRoute={activeRoute}
            onNavigate={(r) => {
              setRoute(r);
              setScreen({ type: "caisse" });
            }}
          />
        </>
      )}

      {sessionError && (
        <div className="fixed bottom-4 left-72 right-4 z-40 bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm font-medium flex items-center gap-3">
          <span className="shrink-0 font-black">Session</span>
          <span className="flex-1">{sessionError}</span>
          <button
            onClick={() => initSession()}
            className="shrink-0 px-3 py-1 rounded-lg bg-error text-on-error text-xs font-bold hover:opacity-90 active:scale-95 transition-all"
          >
            Réessayer
          </button>
        </div>
      )}

      <div className={collapsed ? "ml-16" : "ml-64"}>
        {renderMainView()}
      </div>

      {screen.type === "paiement" && (
        <PaymentView
          totalTtc={screen.totalTtc}
          orderNumber={screen.orderNumber}
          onBack={() => { setPaymentError(null); setScreen({ type: "caisse" }); }}
          onValidate={validatePayment}
          error={paymentError}
        />
      )}

      <CustomerDisplaySync screen={screen} />
      <PrintModal />
      <PrintArea />
      <FeedbackModal />
      <DonationModal />
      <UpdateBanner />
      {whatsNew && onboarding === "done" && (
        <WhatsNewModal version={whatsNew} onClose={() => setWhatsNew(null)} />
      )}
      {import.meta.env.DEV && (
        <DevToolbar onReset={() => {
          clearCashier();
          setOnboarding("needed");
        }} />
      )}
    </div>
  );
}
