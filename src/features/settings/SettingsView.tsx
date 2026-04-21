import { useEffect, useState } from "react";
import { UtensilsCrossed, Coffee, ShoppingBasket, Check, Wifi, WifiOff, Loader2, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "./store";
import type { BusinessProfile } from "@/types/settings";
import { getSetting, updateSetting, testPrinter } from "@/lib/tauri";
import type { PrinterStatus } from "@/features/print/types";
import { useFeedbackStore } from "@/features/feedback/store";

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

function PrinterSection() {
  const [ip,    setIp]    = useState("");
  const [port,  setPort]  = useState("9100");
  const [width, setWidth] = useState("80");
  const [saved,  setSaved]  = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<PrinterStatus | null>(null);

  useEffect(() => {
    Promise.all([
      getSetting("printer_ip"),
      getSetting("printer_port"),
      getSetting("printer_paper_mm"),
    ]).then(([i, p, w]) => {
      if (i) setIp(i);
      if (p) setPort(p);
      if (w) setWidth(w);
    });
  }, []);

  const save = async () => {
    await Promise.all([
      updateSetting("printer_ip",       ip),
      updateSetting("printer_port",     port),
      updateSetting("printer_paper_mm", width),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const test = async () => {
    setTesting(true);
    setStatus(null);
    try {
      const s = await testPrinter();
      setStatus(s);
    } catch (e) {
      setStatus({ connected: false, ip, port: Number(port) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section>
      <h2 className="text-[11px] font-black text-outline uppercase tracking-widest mb-4">Imprimante thermique</h2>
      <div className="bg-surface-container-low rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Adresse IP</label>
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.1.100"
              className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Port</label>
            <input
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="9100"
              className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Largeur du papier</label>
          <div className="flex gap-3">
            {(["58", "80"] as const).map((w) => (
              <button
                key={w}
                onClick={() => setWidth(w)}
                className={cn(
                  "flex-1 h-10 rounded-xl text-sm font-bold border-2 transition-all",
                  width === w
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-outline-variant/20 text-outline hover:border-outline-variant/50"
                )}
              >
                {w} mm
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={test}
            disabled={testing || !ip}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-bright transition-colors disabled:opacity-40"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : null}
            Tester la connexion
          </button>
          <button
            onClick={save}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              saved
                ? "bg-secondary/20 text-secondary"
                : "bg-primary text-on-primary hover:opacity-90 active:scale-95"
            )}
          >
            {saved ? <Check size={14} /> : null}
            {saved ? "Sauvegardé" : "Sauvegarder"}
          </button>
          {status && (
            <div className={cn("flex items-center gap-1.5 text-xs font-bold ml-auto", status.connected ? "text-secondary" : "text-error")}>
              {status.connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {status.connected ? "Imprimante joignable" : "Imprimante introuvable"}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function SettingsView() {
  const { profile, setProfile } = useSettingsStore();
  const showFeedback = useFeedbackStore((s) => s.show);

  return (
    <main className="mt-16 p-8 h-[calc(100vh-64px)] bg-surface overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-12">

        <div>
          <h1 className="text-3xl font-black tracking-tight text-on-surface mb-1">Paramètres</h1>
          <p className="text-outline text-sm">Configurez le logiciel selon votre type d'établissement.</p>
        </div>

        {/* ── Profil commercial ────────────────────────────── */}
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

        {/* ── Imprimante ───────────────────────────────────── */}
        <PrinterSection />

        {/* ── Caissiers ────────────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-black text-outline uppercase tracking-widest mb-2">Caissiers</h2>
          <p className="text-sm text-outline">
            La gestion des caissiers est accessible depuis l'écran de connexion via le bouton
            <span className="font-bold text-on-surface"> « Gérer les caissiers »</span> (PIN responsable requis).
          </p>
        </section>

        {/* ── Feedback ─────────────────────────────────────── */}
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

      </div>
    </main>
  );
}
