import { useEffect, useState } from "react";
import { UtensilsCrossed, Coffee, ShoppingBasket, Check, Wifi, WifiOff, Loader2, MessageSquarePlus, Heart, ShieldCheck, Download, Database, FolderOpen, Printer, Wallet, Barcode, CreditCard, MonitorSmartphone, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "./store";
import type { BusinessProfile } from "@/types/settings";
import { getSetting, updateSetting, testPrinter, openCashDrawer, verifyChain, exportArchive, getDbPath } from "@/lib/tauri";
import { openCustomerDisplayWindow, closeCustomerDisplayWindow } from "@/features/customer-display/window";
import type { PrinterStatus } from "@/features/print/types";
import { useFeedbackStore } from "@/features/feedback/store";
import { openPath } from "@tauri-apps/plugin-opener";

interface ProfileOption {
  id: BusinessProfile;
  label: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  missing: string[];
}

const PROFILES: ProfileOption[] = [
  {
    id: "restaurant",
    label: "Restaurant",
    description: "Tables, service en salle, addition partagée.",
    icon: <UtensilsCrossed size={28} />,
    features: ["Partage de l'addition", "Gestion des tables", "Reçus par personne"],
    missing: ["Alertes de rupture de stock"],
  },
  {
    id: "cafe",
    label: "Café / Bar",
    description: "Service rapide au comptoir, additions séparées.",
    icon: <Coffee size={28} />,
    features: ["Partage de l'addition", "Reçus par personne"],
    missing: ["Gestion des tables", "Alertes de rupture de stock"],
  },
  {
    id: "commerce",
    label: "Commerce / Épicerie",
    description: "Caisse rapide, gestion du stock, scan de codes-barres.",
    icon: <ShoppingBasket size={28} />,
    features: ["Alertes de rupture de stock", "Scan code-barres (bientôt)"],
    missing: ["Partage de l'addition"],
  },
];

type DeviceId = "printer" | "cash_drawer" | "barcode_scanner" | "payment_terminal" | "customer_display";

const DEVICES: { id: DeviceId; label: string; description: string; icon: React.ReactNode }[] = [
  { id: "printer",          label: "Imprimante",     description: "Tickets et rapports Z.",          icon: <Printer size={22} /> },
  { id: "cash_drawer",      label: "Tiroir-caisse",  description: "Ouverture via l'imprimante.",     icon: <Wallet size={22} /> },
  { id: "barcode_scanner",  label: "Scanner",        description: "Lecture codes-barres USB.",       icon: <Barcode size={22} /> },
  { id: "payment_terminal", label: "Terminal CB",    description: "Référence du terminal bancaire.", icon: <CreditCard size={22} /> },
  { id: "customer_display", label: "Écran client",   description: "Affichage prix sur 2e moniteur.", icon: <MonitorSmartphone size={22} /> },
];

function DevicesSection() {
  const [selected, setSelected] = useState<DeviceId>("printer");

  // Printer state
  const [printerIp,    setPrinterIp]    = useState("");
  const [printerPort,  setPrinterPort]  = useState("9100");
  const [printerPaper, setPrinterPaper] = useState("80");
  const [printerSaved,   setPrinterSaved]   = useState(false);
  const [printerTesting, setPrinterTesting] = useState(false);
  const [printerStatus,  setPrinterStatus]  = useState<PrinterStatus | null>(null);

  // Cash drawer state
  const [drawerEnabled,  setDrawerEnabled]  = useState(false);
  const [drawerPin,      setDrawerPin]      = useState("0");
  const [drawerAutoOpen, setDrawerAutoOpen] = useState(true);
  const [drawerSaved,    setDrawerSaved]    = useState(false);
  const [drawerOpening,  setDrawerOpening]  = useState(false);

  // Terminal state
  const [terminalModel, setTerminalModel] = useState("");
  const [terminalRef,   setTerminalRef]   = useState("");
  const [terminalSaved, setTerminalSaved] = useState(false);

  // Customer display state
  const [displayEnabled, setDisplayEnabled] = useState(false);
  const [displaySaved,   setDisplaySaved]   = useState(false);
  const [displayOpen,    setDisplayOpen]    = useState(false);

  useEffect(() => {
    Promise.all([
      getSetting("printer_ip"),
      getSetting("printer_port"),
      getSetting("printer_paper_mm"),
      getSetting("cash_drawer_enabled"),
      getSetting("cash_drawer_pin"),
      getSetting("cash_drawer_auto_open"),
      getSetting("payment_terminal_model"),
      getSetting("payment_terminal_ref"),
      getSetting("customer_display_enabled"),
    ]).then(([ip, port, paper, cdEn, cdPin, cdAuto, tmModel, tmRef, dispEn]) => {
      if (ip)    setPrinterIp(ip);
      if (port)  setPrinterPort(port);
      if (paper) setPrinterPaper(paper);
      setDrawerEnabled(cdEn === "true");
      if (cdPin) setDrawerPin(cdPin);
      setDrawerAutoOpen(cdAuto !== "false");
      if (tmModel) setTerminalModel(tmModel);
      if (tmRef)   setTerminalRef(tmRef);
      setDisplayEnabled(dispEn === "true");
    });
  }, []);

  const savePrinter = async () => {
    await Promise.all([
      updateSetting("printer_ip",       printerIp),
      updateSetting("printer_port",     printerPort),
      updateSetting("printer_paper_mm", printerPaper),
    ]);
    setPrinterSaved(true);
    setTimeout(() => setPrinterSaved(false), 2000);
  };

  const testPrinterConn = async () => {
    setPrinterTesting(true);
    setPrinterStatus(null);
    try {
      setPrinterStatus(await testPrinter());
    } catch {
      setPrinterStatus({ connected: false, ip: printerIp, port: Number(printerPort) });
    } finally {
      setPrinterTesting(false);
    }
  };

  const saveDrawer = async () => {
    await Promise.all([
      updateSetting("cash_drawer_enabled",   drawerEnabled ? "true" : "false"),
      updateSetting("cash_drawer_pin",       drawerPin),
      updateSetting("cash_drawer_auto_open", drawerAutoOpen ? "true" : "false"),
    ]);
    setDrawerSaved(true);
    setTimeout(() => setDrawerSaved(false), 2000);
  };

  const testDrawer = async () => {
    setDrawerOpening(true);
    try {
      await openCashDrawer(Number(drawerPin));
    } finally {
      setDrawerOpening(false);
    }
  };

  const saveTerminal = async () => {
    await Promise.all([
      updateSetting("payment_terminal_model", terminalModel),
      updateSetting("payment_terminal_ref",   terminalRef),
    ]);
    setTerminalSaved(true);
    setTimeout(() => setTerminalSaved(false), 2000);
  };

  const saveDisplay = async (enabled: boolean) => {
    await updateSetting("customer_display_enabled", enabled ? "true" : "false");
    setDisplaySaved(true);
    setTimeout(() => setDisplaySaved(false), 2000);
  };

  const toggleDisplay = async (enabled: boolean) => {
    setDisplayEnabled(enabled);
    await saveDisplay(enabled);
    if (enabled) {
      setDisplayOpen(true);
      openCustomerDisplayWindow().catch(() => {});
    } else {
      setDisplayOpen(false);
      closeCustomerDisplayWindow().catch(() => {});
    }
  };

  const openDisplay = async () => {
    setDisplayOpen(true);
    openCustomerDisplayWindow().catch(() => {});
  };

  const closeDisplay = async () => {
    setDisplayOpen(false);
    closeCustomerDisplayWindow().catch(() => {});
  };

  const deviceStatus = (id: DeviceId): "configured" | "active" | "info" | "none" => {
    if (id === "printer")          return printerIp ? "configured" : "none";
    if (id === "cash_drawer")      return drawerEnabled ? "active" : "none";
    if (id === "barcode_scanner")  return "info";
    if (id === "payment_terminal") return terminalRef ? "configured" : "none";
    if (id === "customer_display") return displayEnabled ? "active" : "none";
    return "none";
  };

  const statusLabel = (id: DeviceId) => {
    const s = deviceStatus(id);
    if (s === "configured") return <span className="text-[10px] font-bold text-secondary">Configuré</span>;
    if (s === "active")     return <span className="text-[10px] font-bold text-secondary">Activé</span>;
    if (s === "info")       return <span className="text-[10px] font-bold text-primary">Plug &amp; play</span>;
    return <span className="text-[10px] text-outline">Non configuré</span>;
  };

  return (
    <section>
      <h2 className="text-[11px] font-black text-outline uppercase tracking-widest mb-4">Appareils</h2>

      {/* Device selector cards */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {DEVICES.map((d) => {
          const active = selected === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setSelected(d.id)}
              className={cn(
                "text-left p-4 rounded-2xl border-2 flex flex-col gap-3 transition-all",
                active
                  ? "border-primary bg-primary/5"
                  : "border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/40 hover:bg-surface-container"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", active ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant")}>
                {d.icon}
              </div>
              <div>
                <p className={cn("font-black text-sm", active ? "text-primary" : "text-on-surface")}>{d.label}</p>
                <p className="text-[10px] text-outline mt-0.5 leading-snug">{d.description}</p>
              </div>
              {statusLabel(d.id)}
            </button>
          );
        })}
      </div>

      {/* Config panel */}
      <div className="bg-surface-container-low rounded-2xl p-5">

        {/* ── Imprimante ─────────────────────────────────── */}
        {selected === "printer" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Adresse IP</label>
                <input value={printerIp} onChange={(e) => setPrinterIp(e.target.value)} placeholder="192.168.1.100"
                  className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Port</label>
                <input value={printerPort} onChange={(e) => setPrinterPort(e.target.value)} placeholder="9100"
                  className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Largeur du papier</label>
              <div className="flex gap-3">
                {(["58", "80"] as const).map((w) => (
                  <button key={w} onClick={() => setPrinterPaper(w)}
                    className={cn("flex-1 h-10 rounded-xl text-sm font-bold border-2 transition-all",
                      printerPaper === w ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/20 text-outline hover:border-outline-variant/50")}>
                    {w} mm
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={testPrinterConn} disabled={printerTesting || !printerIp}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-bright transition-colors disabled:opacity-40">
                {printerTesting ? <Loader2 size={14} className="animate-spin" /> : null}
                Tester la connexion
              </button>
              <button onClick={savePrinter}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  printerSaved ? "bg-secondary/20 text-secondary" : "bg-primary text-on-primary hover:opacity-90 active:scale-95")}>
                {printerSaved && <Check size={14} />}
                {printerSaved ? "Sauvegardé" : "Sauvegarder"}
              </button>
              {printerStatus && (
                <div className={cn("flex items-center gap-1.5 text-xs font-bold ml-auto", printerStatus.connected ? "text-secondary" : "text-error")}>
                  {printerStatus.connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                  {printerStatus.connected ? "Joignable" : "Introuvable"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tiroir-caisse ──────────────────────────────── */}
        {selected === "cash_drawer" && (
          <div className="space-y-5">
            <p className="text-[11px] text-outline">
              Le tiroir-caisse est connecté à l'imprimante thermique via le connecteur RJ-11.
              L'ouverture se fait par une impulsion ESC/POS envoyée au même port TCP que l'imprimante.
            </p>

            {/* Activer */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">Activer le tiroir-caisse</p>
                <p className="text-[11px] text-outline">Active les commandes d'ouverture dans l'application.</p>
              </div>
              <button onClick={() => setDrawerEnabled((v) => !v)}
                className={cn("w-12 h-6 rounded-full transition-colors relative shrink-0",
                  drawerEnabled ? "bg-primary" : "bg-outline-variant/40")}>
                <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all",
                  drawerEnabled ? "left-6" : "left-0.5")} />
              </button>
            </div>

            {drawerEnabled && (
              <>
                {/* Connecteur */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Connecteur</label>
                  <div className="flex gap-3">
                    {([{ v: "0", label: "Pin 2 (DK1)" }, { v: "1", label: "Pin 5 (DK2)" }]).map(({ v, label }) => (
                      <button key={v} onClick={() => setDrawerPin(v)}
                        className={cn("flex-1 h-10 rounded-xl text-xs font-bold border-2 transition-all",
                          drawerPin === v ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/20 text-outline hover:border-outline-variant/50")}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-outline mt-1">Vérifiez la documentation de votre tiroir. Pin 2 est le plus courant.</p>
                </div>

                {/* Ouverture automatique */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-on-surface">Ouverture automatique</p>
                    <p className="text-[11px] text-outline">Ouvre le tiroir à chaque validation de vente en espèces.</p>
                  </div>
                  <button onClick={() => setDrawerAutoOpen((v) => !v)}
                    className={cn("w-12 h-6 rounded-full transition-colors relative shrink-0",
                      drawerAutoOpen ? "bg-primary" : "bg-outline-variant/40")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all",
                      drawerAutoOpen ? "left-6" : "left-0.5")} />
                  </button>
                </div>
              </>
            )}

            <div className="flex items-center gap-3 pt-1">
              {drawerEnabled && (
                <button onClick={testDrawer} disabled={drawerOpening}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-bright transition-colors disabled:opacity-40">
                  {drawerOpening ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                  Tester l'ouverture
                </button>
              )}
              <button onClick={saveDrawer}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  drawerSaved ? "bg-secondary/20 text-secondary" : "bg-primary text-on-primary hover:opacity-90 active:scale-95")}>
                {drawerSaved && <Check size={14} />}
                {drawerSaved ? "Sauvegardé" : "Sauvegarder"}
              </button>
            </div>
          </div>
        )}

        {/* ── Scanner codes-barres ───────────────────────── */}
        {selected === "barcode_scanner" && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Barcode size={20} />
              </div>
              <div>
                <p className="font-bold text-sm text-on-surface mb-1">Aucune configuration requise</p>
                <p className="text-[11px] text-outline leading-relaxed">
                  Les scanners USB mode HID (émulation clavier) fonctionnent nativement avec LDC.
                  Branchez le scanner, placez le curseur dans le champ de recherche produit, et scannez.
                </p>
              </div>
            </div>
            <div className="bg-surface-container rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-2">Compatibilité</p>
              {[
                "Scanners USB filaires (mode HID)",
                "Scanners Bluetooth en mode HID",
                "Codes EAN-13, EAN-8, Code 128, QR Code",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />{item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Terminal de paiement ───────────────────────── */}
        {selected === "payment_terminal" && (
          <div className="space-y-4">
            <p className="text-[11px] text-outline">
              L'intégration automatique des terminaux bancaires (SoftPOS, Ingenico, Verifone) est prévue.
              Renseignez ici les informations de référence pour vos archives.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Modèle</label>
                <input value={terminalModel} onChange={(e) => setTerminalModel(e.target.value)} placeholder="ex. Ingenico Move 5000"
                  className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">N° de série / référence</label>
                <input value={terminalRef} onChange={(e) => setTerminalRef(e.target.value)} placeholder="ex. RM0123456"
                  className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface font-mono outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
            </div>
            <div className="flex pt-1">
              <button onClick={saveTerminal}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  terminalSaved ? "bg-secondary/20 text-secondary" : "bg-primary text-on-primary hover:opacity-90 active:scale-95")}>
                {terminalSaved && <Check size={14} />}
                {terminalSaved ? "Sauvegardé" : "Sauvegarder"}
              </button>
            </div>
          </div>
        )}

        {/* ── Écran client ───────────────────────────────── */}
        {selected === "customer_display" && (
          <div className="space-y-5">
            <p className="text-[11px] text-outline">
              Ouvre une seconde fenêtre sur votre moniteur client affichant le panier en cours
              et le total à payer en temps réel. Branchez un second écran, puis activez ci-dessous.
            </p>

            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">Activer l'écran client</p>
                <p className="text-[11px] text-outline">S'ouvre automatiquement au démarrage de LDC.</p>
              </div>
              <button
                onClick={() => toggleDisplay(!displayEnabled)}
                className={cn("w-12 h-6 rounded-full transition-colors relative shrink-0",
                  displayEnabled ? "bg-primary" : "bg-outline-variant/40")}
              >
                <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all",
                  displayEnabled ? "left-6" : "left-0.5")} />
              </button>
            </div>

            {/* What it shows */}
            <div className="bg-surface-container rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-2">Ce qui s'affiche</p>
              {[
                "Nom de l'établissement + heure en temps réel",
                "Liste des articles du panier en cours",
                "Total TTC en grand format",
                "Écran \"Merci\" après chaque vente (4 s)",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />{item}
                </div>
              ))}
            </div>

            {/* Manual open/close */}
            <div className="flex items-center gap-3 pt-1">
              {displaySaved && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-secondary">
                  <Check size={14} /> Sauvegardé
                </span>
              )}
              <div className="ml-auto flex gap-3">
                <button
                  onClick={openDisplay}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-bright transition-colors"
                >
                  <MonitorSmartphone size={14} />
                  Ouvrir l'écran
                </button>
                <button
                  onClick={closeDisplay}
                  disabled={!displayOpen}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-bright transition-colors disabled:opacity-40"
                >
                  Fermer l'écran
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}

const LEGAL_FORMS = ["EI", "EURL", "SARL", "SAS", "SASU", "SNC", "SA", "Autre"];

interface StoreInfo {
  name:        string;
  address:     string;
  postal_code: string;
  city:        string;
  legal_form:  string;
  siret:       string;
  tva_number:  string;
  phone:       string;
  website:     string;
}

const EMPTY_INFO: StoreInfo = {
  name: "", address: "", postal_code: "", city: "",
  legal_form: "", siret: "", tva_number: "", phone: "", website: "",
};

function StoreInfoSection() {
  const [info,  setInfo]  = useState<StoreInfo>(EMPTY_INFO);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      getSetting("store_name"),
      getSetting("store_address"),
      getSetting("store_postal_code"),
      getSetting("store_city"),
      getSetting("store_legal_form"),
      getSetting("store_siret"),
      getSetting("store_tva_number"),
      getSetting("store_phone"),
      getSetting("store_website"),
    ]).then(([name, address, postal_code, city, legal_form, siret, tva_number, phone, website]) => {
      setInfo({
        name:        name        ?? "",
        address:     address     ?? "",
        postal_code: postal_code ?? "",
        city:        city        ?? "",
        legal_form:  legal_form  ?? "",
        siret:       siret       ?? "",
        tva_number:  tva_number  ?? "",
        phone:       phone       ?? "",
        website:     website     ?? "",
      });
    });
  }, []);

  const patch = (key: keyof StoreInfo, value: string) => {
    setInfo((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    await Promise.all([
      updateSetting("store_name",        info.name.trim()),
      updateSetting("store_address",     info.address.trim()),
      updateSetting("store_postal_code", info.postal_code.trim()),
      updateSetting("store_city",        info.city.trim()),
      updateSetting("store_legal_form",  info.legal_form.trim()),
      updateSetting("store_siret",       info.siret.trim()),
      updateSetting("store_tva_number",  info.tva_number.trim()),
      updateSetting("store_phone",       info.phone.trim()),
      updateSetting("store_website",     info.website.trim()),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const field = (
    key: keyof StoreInfo,
    label: string,
    placeholder: string,
    opts?: { hint?: string; monospace?: boolean }
  ) => (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5">
        {label}
      </label>
      <input
        value={info[key]}
        onChange={(e) => patch(key, e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/30 transition-all",
          opts?.monospace && "font-mono tracking-wider"
        )}
      />
      {opts?.hint && <p className="text-[10px] text-outline mt-1">{opts.hint}</p>}
    </div>
  );

  return (
    <section>
      <h2 className="text-[11px] font-black text-outline uppercase tracking-widest mb-4">Informations de l'établissement</h2>
      <div className="bg-surface-container-low rounded-2xl p-5 space-y-4">

        {/* Nom + forme juridique */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            {field("name", "Nom de l'établissement", "Le Petit Bistrot")}
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5">
              Forme juridique
            </label>
            <select
              value={info.legal_form}
              onChange={(e) => patch("legal_form", e.target.value)}
              className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            >
              <option value="">—</option>
              {LEGAL_FORMS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        {/* Adresse */}
        {field("address", "Adresse", "12 rue des Fleurs")}
        <div className="grid grid-cols-3 gap-4">
          <div>
            {field("postal_code", "Code postal", "75001", { monospace: true })}
          </div>
          <div className="col-span-2">
            {field("city", "Ville", "Paris")}
          </div>
        </div>

        {/* SIRET + TVA */}
        <div className="grid grid-cols-2 gap-4">
          {field("siret", "SIRET", "123 456 789 00012", {
            monospace: true,
            hint: "14 chiffres — obligatoire sur les tickets",
          })}
          {field("tva_number", "N° TVA intracommunautaire", "FR 12 123456789", {
            monospace: true,
            hint: "Laisser vide si non assujetti",
          })}
        </div>

        {/* Téléphone + Site web */}
        <div className="grid grid-cols-2 gap-4">
          {field("phone",   "Téléphone",  "01 23 45 67 89")}
          {field("website", "Site web",   "www.monbistrot.fr")}
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={save}
            disabled={!info.name.trim() || !info.siret.trim()}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-40",
              saved
                ? "bg-secondary/20 text-secondary"
                : "bg-primary text-on-primary hover:opacity-90 active:scale-95"
            )}
          >
            {saved && <Check size={14} />}
            {saved ? "Sauvegardé" : "Sauvegarder"}
          </button>
        </div>
      </div>
      <p className="text-[10px] text-outline mt-2">Ces informations apparaissent sur tous les tickets et rapports Z.</p>
    </section>
  );
}

type ChainStatus = "idle" | "checking" | "ok" | "error";

function ComplianceSection() {
  const [chainStatus, setChainStatus] = useState<ChainStatus>("idle");
  const [chainCount,  setChainCount]  = useState<number | null>(null);
  const [chainError,  setChainError]  = useState<string | null>(null);
  const [exporting,   setExporting]   = useState(false);
  const [dbPath,      setDbPath]      = useState<string | null>(null);
  const [copied,      setCopied]      = useState(false);
  const [genAttest,   setGenAttest]   = useState(false);

  useEffect(() => {
    getDbPath().then(setDbPath).catch(() => {});
  }, []);

  const downloadAttestation = async () => {
    setGenAttest(true);
    try {
      const [name, address, postalCode, city, legalForm, siret, tvaNumber, phone, website] =
        await Promise.all([
          getSetting("store_name"),     getSetting("store_address"),
          getSetting("store_postal_code"), getSetting("store_city"),
          getSetting("store_legal_form"),  getSetting("store_siret"),
          getSetting("store_tva_number"),  getSetting("store_phone"),
          getSetting("store_website"),
        ]);

      const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
      const year  = new Date().getFullYear();

      const row = (label: string, value: string) =>
        `<tr><td class="lbl">${label}</td><td>${value || "<em>—</em>"}</td></tr>`;

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Attestation NF525 — ${name ?? "Établissement"}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, "Times New Roman", serif; font-size: 13px; color: #1a1a1a;
         max-width: 800px; margin: 40px auto; padding: 0 24px; line-height: 1.7; }
  h1 { font-size: 20px; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; margin-bottom: 6px; }
  .subtitle { font-size: 11px; color: #666; letter-spacing: 0.08em; text-transform: uppercase;
              margin-bottom: 28px; }
  h2 { font-size: 11px; font-family: Arial, sans-serif; text-transform: uppercase;
       letter-spacing: 0.1em; color: #444; margin: 28px 0 10px; border-bottom: 1px solid #ddd;
       padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  td { padding: 6px 10px; border: 1px solid #ddd; vertical-align: top; }
  td.lbl { background: #f8f8f8; font-weight: bold; width: 38%; font-size: 12px; }
  p { margin: 8px 0; }
  ul { margin: 8px 0 8px 20px; }
  li { margin-bottom: 4px; }
  .tech-table td { font-size: 11px; font-family: monospace; }
  .signature { margin-top: 48px; display: flex; gap: 60px; }
  .sig-block { flex: 1; }
  .sig-line { border-bottom: 1px solid #1a1a1a; height: 56px; margin-bottom: 6px; }
  .sig-label { font-size: 11px; color: #666; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd;
            font-size: 10px; color: #888; font-style: italic; line-height: 1.5; }
  @media print {
    body { margin: 15mm; padding: 0; }
    @page { margin: 15mm; }
  }
</style>
<script>window.addEventListener("load", () => window.print());</script>
</head>
<body>

<h1>Attestation de conformité NF525</h1>
<p class="subtitle">Logiciel de caisse enregistreuse — Article 88 de la loi de finances 2016</p>

<h2>1. Identification du logiciel</h2>
<table>
  ${row("Nom du logiciel", "LDC — Logiciel de Caisse")}
  ${row("Éditeur", "aizogroove")}
  ${row("Dépôt source", "https://github.com/aizo-groove/ldc")}
  ${row("Licence", "Open-source")}
  ${row("Date du document", today)}
</table>

<h2>2. Identification de l'établissement</h2>
<table>
  ${row("Raison sociale", name ?? "")}
  ${row("Forme juridique", legalForm ?? "")}
  ${row("SIRET", siret ?? "")}
  ${row("Adresse", address ?? "")}
  ${row("Code postal / Ville", [postalCode, city].filter(Boolean).join(" "))}
  ${row("N° TVA intracommunautaire", tvaNumber ?? "")}
  ${row("Téléphone", phone ?? "")}
  ${row("Site web", website ?? "")}
</table>

<h2>3. Déclaration de conformité</h2>
<p>Je soussigné(e), ………………………………………………………, agissant en qualité de ………………………………………
de l'établissement identifié ci-dessus, atteste que :</p>
<ul>
  <li>Le logiciel <strong>LDC</strong> est utilisé comme logiciel de caisse enregistreuse dans mon établissement depuis le …………………………………</li>
  <li>L'<strong>intégrité des données</strong> est assurée par une chaîne de hachage <strong>SHA-256</strong> conforme aux exigences de la norme NF525 : chaque transaction est enchaînée à la précédente par son empreinte cryptographique, rendant toute modification rétroactive détectable.</li>
  <li>Les <strong>clôtures journalières (Z)</strong> sont réalisées à chaque fin de service et conservées dans la base de données SQLite locale.</li>
  <li>Les <strong>archives fiscales</strong> au format JSON sont exportées régulièrement et conservées pendant une durée minimale de <strong>6 ans</strong> (art. L. 102 B du LPF).</li>
  <li>La base de données est <strong>sauvegardée régulièrement</strong> sur un support distinct.</li>
  <li>Je m'engage à fournir, sur demande de l'administration fiscale, les archives et journaux d'événements produits par LDC.</li>
</ul>

<h2>4. Mécanismes techniques de conformité</h2>
<table class="tech-table">
  ${row("Algorithme", "SHA-256 (séquence + type + montant TTC + horodatage + hash précédent)")}
  ${row("Valeur initiale", "« GENESIS » pour la première transaction")}
  ${row("Grand Total", "Cumul non réinitialisable par clôture Z")}
  ${row("Journal d'événements", "Table journal_entries — séquence immuable")}
  ${row("Horodatage", "UTC ISO-8601 avec précision milliseconde")}
  ${row("Stockage", "SQLite — {app_data_dir}/ldc.db")}
  ${row("Vérification", "Paramètres → Conformité NF525 → Vérifier la chaîne")}
  ${row("Export", "Paramètres → Conformité NF525 → Exporter les données fiscales")}
</table>

<h2>5. Signature</h2>
<p>Fait à ………………………………………………, le ${today}</p>
<div class="signature">
  <div class="sig-block">
    <div class="sig-line"></div>
    <p class="sig-label">Nom, qualité et cachet de l'établissement</p>
  </div>
  <div class="sig-block" style="opacity:0"><!-- spacer --></div>
</div>

<div class="footer">
  Ce document ne constitue pas une certification officielle par un organisme tiers. La norme NF525 prévoit la possibilité
  d'une auto-déclaration pour les logiciels open-source sous réserve que les mécanismes techniques requis soient en place.
  Consultez votre expert-comptable ou le service des impôts pour toute question relative à votre situation.
  — Document généré par LDC le ${today}. © ${year} aizogroove.
</div>

</body>
</html>`;

      const blob = new Blob([html], { type: "text/html" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `attestation-nf525-${(name ?? "etablissement").toLowerCase().replace(/\s+/g, "-")}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenAttest(false);
    }
  };

  const checkChain = async () => {
    setChainStatus("checking");
    setChainError(null);
    try {
      const count = await verifyChain();
      setChainCount(count);
      setChainStatus("ok");
    } catch (e) {
      setChainError(String(e));
      setChainStatus("error");
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const data = await exportArchive();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const now  = new Date().toISOString().slice(0, 10);
      a.href     = url;
      a.download = `ldc-archive-nf525-${now}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const copyPath = async () => {
    if (!dbPath) return;
    await navigator.clipboard.writeText(dbPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openFolder = async () => {
    if (!dbPath) return;
    const dir = dbPath.substring(0, dbPath.lastIndexOf("/"));
    await openPath(dir);
  };

  return (
    <section>
      <h2 className="text-[11px] font-black text-outline uppercase tracking-widest mb-4">
        Conformité NF525
      </h2>
      <div className="bg-surface-container-low rounded-2xl p-5 space-y-5">

        {/* Intégrité de la chaîne */}
        <div>
          <p className="text-xs font-bold text-on-surface mb-1">Intégrité de la chaîne de hachage</p>
          <p className="text-[11px] text-outline mb-3">
            Vérifie que chaque transaction a été correctement enchaînée (algorithme SHA-256 NF525).
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={checkChain}
              disabled={chainStatus === "checking"}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-bright transition-colors disabled:opacity-40"
            >
              {chainStatus === "checking"
                ? <Loader2 size={14} className="animate-spin" />
                : <ShieldCheck size={14} />
              }
              Vérifier la chaîne
            </button>
            {chainStatus === "ok" && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-secondary">
                <Check size={14} />
                {chainCount} transaction{chainCount !== 1 ? "s" : ""} — chaîne intègre
              </span>
            )}
            {chainStatus === "error" && (
              <span className="text-xs font-bold text-error">{chainError}</span>
            )}
          </div>
        </div>

        <div className="border-t border-outline-variant/10" />

        {/* Export archive */}
        <div>
          <p className="text-xs font-bold text-on-surface mb-1">Export archive fiscale</p>
          <p className="text-[11px] text-outline mb-3">
            Télécharge l'intégralité des sessions, transactions, lignes, paiements et journal
            d'événements au format JSON. À conserver 6 ans (obligation légale NF525).
          </p>
          <button
            onClick={doExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-bright transition-colors disabled:opacity-40"
          >
            {exporting
              ? <Loader2 size={14} className="animate-spin" />
              : <Download size={14} />
            }
            {exporting ? "Export en cours…" : "Exporter les données fiscales"}
          </button>
        </div>

        <div className="border-t border-outline-variant/10" />

        {/* Chemin de la base de données */}
        <div>
          <p className="text-xs font-bold text-on-surface mb-1">Base de données SQLite</p>
          <p className="text-[11px] text-outline mb-3">
            Sauvegardez régulièrement ce fichier (Time Machine, NAS, cloud chiffré).
            En cas de panne matérielle, c'est votre seule source de récupération.
          </p>
          {dbPath && (
            <div className="flex items-center gap-2 bg-surface-container rounded-xl px-3 py-2 mb-3">
              <Database size={13} className="text-outline shrink-0" />
              <span className="font-mono text-[11px] text-on-surface-variant flex-1 truncate">{dbPath}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={copyPath}
              disabled={!dbPath}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-bright transition-colors disabled:opacity-40"
            >
              {copied ? <Check size={14} className="text-secondary" /> : null}
              {copied ? "Copié !" : "Copier le chemin"}
            </button>
            <button
              onClick={openFolder}
              disabled={!dbPath}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-bright transition-colors disabled:opacity-40"
            >
              <FolderOpen size={14} />
              Ouvrir dans le Finder
            </button>
          </div>
        </div>

        <div className="border-t border-outline-variant/10" />

        {/* Attestation */}
        <div>
          <p className="text-xs font-bold text-on-surface mb-1">Attestation de conformité</p>
          <p className="text-[11px] text-outline mb-3">
            Génère une attestation pré-remplie avec les informations de votre établissement.
            Ouvrez le fichier dans votre navigateur pour l'imprimer ou l'enregistrer en PDF.
          </p>
          <button
            onClick={downloadAttestation}
            disabled={genAttest}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-bright transition-colors disabled:opacity-40"
          >
            {genAttest
              ? <Loader2 size={14} className="animate-spin" />
              : <FileText size={14} />
            }
            {genAttest ? "Génération…" : "Télécharger l'attestation"}
          </button>
        </div>

      </div>
    </section>
  );
}

type SettingsTab = "etablissement" | "materiel" | "conformite" | "apropos";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "etablissement", label: "Établissement" },
  { id: "materiel",      label: "Matériel" },
  { id: "conformite",    label: "Conformité NF525" },
  { id: "apropos",       label: "À propos" },
];

export function SettingsView() {
  const [tab, setTab] = useState<SettingsTab>("etablissement");
  const { profile, setProfile } = useSettingsStore();
  const showFeedback = useFeedbackStore((s) => s.show);

  return (
    <main className="mt-16 h-[calc(100vh-64px)] bg-surface flex flex-col overflow-hidden">
      {/* Header + tab bar */}
      <div className="px-8 pt-8 pb-0 shrink-0">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-black tracking-tight text-on-surface mb-1">Paramètres</h1>
          <p className="text-outline text-sm mb-6">Configurez le logiciel selon votre type d'établissement.</p>
          <div className="flex gap-1 bg-surface-container-low rounded-2xl p-1 w-fit">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  tab === t.id
                    ? "bg-surface text-on-surface shadow-sm"
                    : "text-outline hover:text-on-surface-variant"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-12">

          {tab === "etablissement" && (
            <>
              <StoreInfoSection />
              <section>
                <h2 className="text-[11px] font-black text-outline uppercase tracking-widest mb-4">Profil commercial</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PROFILES.map((p) => {
                    const isActive = p.id === profile;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setProfile(p.id)}
                        className={cn(
                          "text-left p-5 rounded-2xl border-2 transition-all flex flex-col gap-4",
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/50 hover:bg-surface-container"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", isActive ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant")}>
                            {p.icon}
                          </div>
                          {isActive && (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <Check size={14} className="text-on-primary" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className={cn("font-black text-base", isActive ? "text-primary" : "text-on-surface")}>{p.label}</p>
                          <p className="text-xs text-outline mt-0.5 leading-relaxed">{p.description}</p>
                        </div>
                        <ul className="space-y-1.5">
                          {p.features.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-xs text-on-surface-variant">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />{f}
                            </li>
                          ))}
                          {p.missing.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-xs text-outline line-through">
                              <span className="w-1.5 h-1.5 rounded-full bg-outline-variant shrink-0" />{f}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {tab === "materiel" && <DevicesSection />}

          {tab === "conformite" && <ComplianceSection />}

          {tab === "apropos" && (
            <>
              <section>
                <h2 className="text-[11px] font-black text-outline uppercase tracking-widest mb-2">Caissiers</h2>
                <p className="text-sm text-outline">
                  La gestion des caissiers est accessible depuis l'écran de connexion via le bouton
                  <span className="font-bold text-on-surface"> « Gérer les caissiers »</span> (PIN responsable requis).
                </p>
              </section>

              <section>
                <h2 className="text-[11px] font-black text-outline uppercase tracking-widest mb-2">Soutenir le projet</h2>
                <p className="text-sm text-outline mb-4">
                  LDC est gratuit et open-source. Si vous l'utilisez au quotidien, un café est toujours apprécié ☕
                </p>
                <a
                  href="https://ko-fi.com/aizogroove"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF5E5B] text-white text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
                >
                  <Heart size={15} />
                  Offrir un café sur Ko-fi
                </a>
              </section>

              <section>
                <h2 className="text-[11px] font-black text-outline uppercase tracking-widest mb-2">Retour développeur</h2>
                <p className="text-sm text-outline mb-4">
                  Un bug, une idée, une suggestion ? Envoyez directement un retour au développeur.
                </p>
                <button
                  onClick={showFeedback}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
                >
                  <MessageSquarePlus size={15} />
                  Envoyer un retour
                </button>
              </section>
            </>
          )}

        </div>
      </div>
    </main>
  );
}
