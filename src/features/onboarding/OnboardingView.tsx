import { useState } from "react";
import { UtensilsCrossed, Coffee, ShoppingBag, ChevronRight, Printer, Check, Loader2, Map } from "lucide-react";
import logo from "@/assets/logo.png";
import { updateSetting } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import type { BusinessProfile } from "@/types/settings";
import { useTutorialStore } from "@/features/tutorial/store";

interface OnboardingViewProps {
  onDone: () => void;
}

type Step = 0 | 1 | 2 | 3 | 4;

const TOTAL_STEPS = 5;

function ProgressDots({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all duration-300",
            i === step
              ? "w-6 h-2 bg-primary"
              : i < step
              ? "w-2 h-2 bg-primary/40"
              : "w-2 h-2 bg-outline/20"
          )}
        />
      ))}
    </div>
  );
}

function luhnCheck(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = parseInt(digits[i]);
    if ((digits.length - 1 - i) % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

function siretError(v: string): string | null {
  if (!v) return null;
  if (v.length < 14) return null; // still typing — wait for 14 digits
  if (!luhnCheck(v)) return "SIRET invalide — vérifiez les chiffres.";
  return null;
}

const PROFILES: { id: BusinessProfile; label: string; description: string; icon: React.ReactNode }[] = [
  { id: "restaurant", label: "Restaurant", description: "Tables, menus, service en salle", icon: <UtensilsCrossed size={28} /> },
  { id: "cafe",       label: "Café / Bar",  description: "Vente rapide au comptoir",       icon: <Coffee size={28} /> },
  { id: "commerce",   label: "Commerce",    description: "Épicerie, boutique, marché",     icon: <ShoppingBag size={28} /> },
];

export function OnboardingView({ onDone }: OnboardingViewProps) {
  const [step, setStep]           = useState<Step>(0);
  const [profile, setProfile]     = useState<BusinessProfile | null>(null);
  const [storeName, setStoreName] = useState("");
  const [siret, setSiret]         = useState("");
  const [printerIp, setPrinterIp] = useState("");
  const [printerPort, setPrinterPort] = useState("9100");
  const [saving, setSaving]       = useState(false);
  const [wantTour, setWantTour]   = useState(true);

  const setPending = useTutorialStore((s) => s.setPending);

  const next = () => setStep((s) => (s + 1) as Step);

  const handleFinish = async () => {
    setSaving(true);
    try {
      const saves: Promise<void>[] = [
        updateSetting("store_name",     storeName.trim()),
        updateSetting("onboarding_done", "true"),
      ];
      if (profile)          saves.push(updateSetting("business_profile", profile));
      if (siret.trim())     saves.push(updateSetting("store_siret",      siret.trim()));
      if (printerIp.trim()) {
        saves.push(updateSetting("printer_ip",   printerIp.trim()));
        saves.push(updateSetting("printer_port", printerPort || "9100"));
      }
      await Promise.all(saves);
      if (wantTour) setPending(true);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  // ── Step 0 — Bienvenue ───────────────────────────────────

  if (step === 0) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-10 px-8">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <img src={logo} alt="LDC" className="w-24 h-24 rounded-3xl" />
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight">Bienvenue sur LDC</h1>
            <p className="text-outline mt-3 leading-relaxed">
              Le logiciel de caisse libre et conforme NF525.<br />
              Configurons ensemble votre espace en 2 minutes.
            </p>
          </div>
        </div>

        <button
          onClick={next}
          className="flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Commencer <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  // ── Step 1 — Profil du commerce ──────────────────────────

  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-10 px-8">
        <ProgressDots step={step} />

        <div className="text-center">
          <h2 className="text-2xl font-black uppercase tracking-tight">Votre type de commerce</h2>
          <p className="text-outline text-sm mt-2">Cela adapte l'interface à vos besoins</p>
        </div>

        <div className="flex gap-4">
          {PROFILES.map((p) => (
            <button
              key={p.id}
              onClick={() => setProfile(p.id)}
              className={cn(
                "flex flex-col items-center gap-4 p-8 w-48 rounded-3xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98]",
                profile === p.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant/20 bg-surface-container-low text-on-surface hover:border-outline-variant/50"
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                profile === p.id ? "bg-primary/20" : "bg-surface-container-high"
              )}>
                {p.icon}
              </div>
              <div className="text-center">
                <p className="font-black text-sm">{p.label}</p>
                <p className={cn("text-xs mt-1 leading-snug", profile === p.id ? "text-primary/70" : "text-outline")}>
                  {p.description}
                </p>
              </div>
              {profile === p.id && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check size={12} className="text-on-primary" />
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={next}
          disabled={!profile}
          className="flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          Continuer <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  // ── Step 2 — Informations établissement ─────────────────

  if (step === 2) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-10 px-8">
        <ProgressDots step={step} />

        <div className="text-center">
          <h2 className="text-2xl font-black uppercase tracking-tight">Votre établissement</h2>
          <p className="text-outline text-sm mt-2">Ces informations apparaissent sur vos tickets</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <div>
            <label className="text-[10px] text-outline uppercase tracking-widest block mb-2">
              Nom du commerce <span className="text-error">*</span>
            </label>
            <input
              autoFocus
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && storeName.trim()) next(); }}
              placeholder="Ex : Boulangerie Dupont"
              className="w-full bg-surface-container-high rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-outline/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-outline uppercase tracking-widest block mb-2">
              Numéro SIRET <span className="text-outline/50 normal-case tracking-normal ml-1">— optionnel</span>
            </label>
            <input
              value={siret}
              onChange={(e) => setSiret(e.target.value.replace(/\D/g, "").slice(0, 14))}
              placeholder="12345678900000"
              className={cn(
                "w-full bg-surface-container-high rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 text-on-surface placeholder:text-outline/50 tracking-widest",
                siretError(siret) ? "ring-2 ring-error/50 focus:ring-error/50" : "focus:ring-primary/40"
              )}
            />
            {siretError(siret) && (
              <p className="text-[11px] text-error mt-1.5">{siretError(siret)}</p>
            )}
          </div>
        </div>

        <button
          onClick={next}
          disabled={!storeName.trim() || !!siretError(siret)}
          className="flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          Continuer <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  // ── Step 3 — Imprimante ──────────────────────────────────

  if (step === 3) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-10 px-8">
        <ProgressDots step={step} />

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center">
            <Printer size={24} className="text-outline" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Imprimante à tickets</h2>
          <p className="text-outline text-sm">Imprimante thermique en réseau (TCP/IP)</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-outline uppercase tracking-widest block mb-2">Adresse IP</label>
              <input
                autoFocus
                value={printerIp}
                onChange={(e) => setPrinterIp(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full bg-surface-container-high rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-outline/50"
              />
            </div>
            <div className="w-24">
              <label className="text-[10px] text-outline uppercase tracking-widest block mb-2">Port</label>
              <input
                value={printerPort}
                onChange={(e) => setPrinterPort(e.target.value)}
                placeholder="9100"
                className="w-full bg-surface-container-high rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
              />
            </div>
          </div>

          <p className="text-xs text-outline">
            Vous pourrez tester la connexion depuis les Paramètres.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={next}
            disabled={!printerIp.trim()}
            className="flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            Continuer <ChevronRight size={16} />
          </button>
          <button
            onClick={next}
            className="text-xs text-outline hover:text-on-surface uppercase tracking-widest font-bold transition-colors py-2"
          >
            Configurer plus tard
          </button>
        </div>
      </div>
    );
  }

  // ── Step 4 — C'est parti ! ───────────────────────────────

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-10 px-8">
      <ProgressDots step={step} />

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center">
          <Check size={36} className="text-secondary" />
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tight">C'est parti !</h2>
        <p className="text-outline text-sm max-w-xs">
          Votre caisse est prête. Créez votre premier caissier et commencez à vendre.
        </p>
      </div>

      {/* Summary */}
      <div className="w-full max-w-sm bg-surface-container-low rounded-2xl p-5 space-y-3">
        <SummaryRow label="Commerce" value={storeName} />
        {siret && <SummaryRow label="SIRET" value={siret} />}
        {profile && (
          <SummaryRow
            label="Profil"
            value={PROFILES.find((p) => p.id === profile)?.label ?? profile}
          />
        )}
        <SummaryRow
          label="Imprimante"
          value={printerIp.trim() ? `${printerIp}:${printerPort}` : "Non configurée"}
          muted={!printerIp.trim()}
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => setWantTour((v) => !v)}
          className={cn(
            "flex items-center gap-3 px-6 py-3 rounded-xl border-2 text-sm font-bold transition-all",
            wantTour
              ? "border-primary bg-primary/10 text-primary"
              : "border-outline-variant/20 text-outline hover:border-outline-variant/40"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
            wantTour ? "border-primary bg-primary" : "border-outline/40"
          )}>
            {wantTour && <Check size={12} className="text-on-primary" strokeWidth={3} />}
          </div>
          <Map size={16} />
          Démarrer la visite guidée
        </button>

        <button
          onClick={handleFinish}
          disabled={saving}
          className="flex items-center gap-2 px-10 py-4 bg-primary text-on-primary rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? "Sauvegarde…" : "Ouvrir LDC"}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-outline text-xs uppercase tracking-widest">{label}</span>
      <span className={cn("font-bold", muted && "text-outline/50")}>{value}</span>
    </div>
  );
}
