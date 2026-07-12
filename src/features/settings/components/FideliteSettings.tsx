import { useEffect, useState } from "react";
import {
  Link2, Eye, EyeOff, Loader2, CheckCircle2,
  AlertTriangle, RotateCcw, Save, ExternalLink, ClipboardPaste,
  Lock, Trash2, X,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { cn } from "@/lib/utils";
import { useLoyaltyStore } from "@/features/loyalty/store";
import { getSetting } from "@/lib/tauri";
import type { LoyaltyProgramType, ProgramConfig } from "@/types/loyalty";
import { PROGRAM_TYPE_META, DEFAULT_CONFIG } from "@/types/loyalty";

const FIDOWEB_BASE = "http://localhost:3000";

// ── Shared primitives ─────────────────────────────────────────

function ConfigField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function NumberInput({
  value, onChange, min, max, step, suffix,
}: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        min={min} max={max} step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-outline pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

// ── Step 1 — Credentials ──────────────────────────────────────

function CredentialsStep() {
  const { config, connectionStatus, connectionError, saving, updateConfig, persistConfig, testConnection } =
    useLoyaltyStore();
  const [showSecret,    setShowSecret]    = useState(false);
  const [showPartnerId, setShowPartnerId] = useState(false);
  const [showPrivKey,   setShowPrivKey]   = useState(false);
  const [redirecting,   setRedirecting]   = useState(false);

  if (!config) return null;

  const isOk      = connectionStatus === "ok";
  const isTesting = connectionStatus === "testing";
  const isError   = connectionStatus === "error";

  const hasCredentials =
    !!config.fido_mid?.trim() &&
    !!config.fido_partner_id?.trim() &&
    !!config.fido_partner_secret?.trim() &&
    !!config.fido_private_key?.trim();

  const handleSubscribe = async () => {
    setRedirecting(true);
    try {
      const [name, siret] = await Promise.all([
        getSetting("store_name").catch(() => ""),
        getSetting("store_siret").catch(() => ""),
      ]);
      const params = new URLSearchParams();
      if (name)  params.set("name",  name);
      if (siret) params.set("siret", siret.replace(/\s/g, ""));
      await openUrl(`${FIDOWEB_BASE}/shops/new?${params.toString()}`);
    } finally {
      setRedirecting(false);
    }
  };

  const handleTest = async () => {
    await persistConfig();
    await testConnection();
  };

  return (
    <div className="space-y-5">

      {/* Step A — Subscribe */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-outline">
          Étape 1 — Créer votre compte Fido
        </p>
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-high border border-outline-variant/10">
          <p className="text-xs text-on-surface-variant leading-snug">
            Vos informations établissement sont pré-remplies automatiquement.
          </p>
          <button
            onClick={handleSubscribe}
            disabled={redirecting}
            className="flex items-center gap-1.5 ml-3 shrink-0 px-3 py-2 rounded-xl bg-primary text-on-primary text-[10px] font-black uppercase tracking-wide hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {redirecting
              ? <Loader2 size={11} className="animate-spin" />
              : <ExternalLink size={11} />}
            S'abonner sur FidoWeb
          </button>
        </div>
      </div>

      {/* Step B — Paste credentials */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-outline">
            Étape 2 — Coller vos identifiants
          </p>
          <ClipboardPaste size={11} className="text-outline" />
        </div>
        <p className="text-[10px] text-outline leading-snug -mt-1">
          Après paiement, cliquez "Révéler (une seule fois)" sur votre page FidoWeb et copiez les quatre valeurs ci-dessous.
        </p>

        <ConfigField label="Merchant ID">
          <input
            value={config.fido_mid ?? ""}
            onChange={(e) => updateConfig({ fido_mid: e.target.value || null })}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
          />
          <p className="text-[10px] text-outline mt-1">UUID de votre marchand Fido (merchants.id).</p>
        </ConfigField>

        <ConfigField label="Partner ID">
          <div className="relative">
            <input
              type={showPartnerId ? "text" : "password"}
              value={config.fido_partner_id ?? ""}
              onChange={(e) => updateConfig({ fido_partner_id: e.target.value || null })}
              placeholder="32 caractères hex"
              className="w-full h-10 bg-surface-container-high rounded-xl px-3 pr-9 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
            />
            <button onClick={() => setShowPartnerId(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors">
              {showPartnerId ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-outline mt-1">Credential de provisioning — 32 hex chars (16 bytes). En-tête du QR Fido.</p>
        </ConfigField>

        <ConfigField label="Partner Secret">
          <div className="relative">
            <input
              type={showSecret ? "text" : "password"}
              value={config.fido_partner_secret ?? ""}
              onChange={(e) => updateConfig({ fido_partner_secret: e.target.value || null })}
              placeholder="Votre partner_secret"
              className="w-full h-10 bg-surface-container-high rounded-xl px-3 pr-9 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
            />
            <button onClick={() => setShowSecret(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors">
              {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </ConfigField>

        <ConfigField label="Clé privée (private_key)">
          <div className="relative">
            <textarea
              rows={showPrivKey ? 5 : 1}
              value={config.fido_private_key ?? ""}
              onChange={(e) => updateConfig({ fido_private_key: e.target.value || null })}
              placeholder="-----BEGIN PRIVATE KEY-----"
              className="w-full bg-surface-container-high rounded-xl px-3 py-2.5 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono resize-none pr-9"
            />
            <button onClick={() => setShowPrivKey(v => !v)} className="absolute right-2.5 top-2.5 text-outline hover:text-on-surface transition-colors">
              {showPrivKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-outline mt-1">Ed25519 PKCS#8 PEM — affiché une seule fois sur FidoWeb.</p>
        </ConfigField>
      </div>

      {/* Advanced */}
      <details className="group">
        <summary className="cursor-pointer text-[10px] text-outline hover:text-on-surface transition-colors select-none list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
          Paramètres avancés
        </summary>
        <div className="mt-2 space-y-2">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5">URL API personnalisée</label>
            <input
              value={config.fido_api_url ?? ""}
              onChange={(e) => updateConfig({ fido_api_url: e.target.value || null })}
              placeholder="https://[project].supabase.co/functions/v1"
              className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
            />
            <p className="text-[10px] text-outline mt-1">Laisser vide pour le serveur officiel.</p>
          </div>
        </div>
      </details>

      {/* Status */}
      {isOk && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/10 text-secondary text-xs font-bold">
          <CheckCircle2 size={14} /> Connexion établie
        </div>
      )}
      {isError && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-error/10 border border-error/20 text-error text-xs">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span className="leading-snug">{connectionError}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleTest}
          disabled={!hasCredentials || isTesting || saving}
          className={cn(
            "flex-1 h-10 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
            "bg-primary text-on-primary hover:brightness-110 disabled:opacity-40",
          )}
        >
          {isTesting || saving
            ? <><Loader2 size={14} className="animate-spin" /> Vérification…</>
            : <><Link2 size={14} /> Vérifier la connexion</>}
        </button>
        {(config.fido_mid || config.fido_partner_id || config.fido_partner_secret || config.fido_private_key) && (
          <button
            onClick={() => updateConfig({ fido_mid: null, fido_partner_id: null, fido_partner_secret: null, fido_private_key: null })}
            title="Effacer les identifiants"
            className="h-10 px-3 rounded-xl border border-outline-variant/20 text-outline hover:text-error hover:border-error/30 transition-all"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 2 — Program config ───────────────────────────────────

function TypePicker({ value, onChange, disabled }: {
  value: LoyaltyProgramType;
  onChange: (t: LoyaltyProgramType) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("grid grid-cols-5 gap-2", disabled && "pointer-events-none")}>
      {(Object.entries(PROGRAM_TYPE_META) as [LoyaltyProgramType, (typeof PROGRAM_TYPE_META)[LoyaltyProgramType]][]).map(
        ([type, meta]) => (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all",
              value === type
                ? "border-primary bg-primary/5"
                : "border-outline-variant/20 hover:border-outline-variant/40",
              disabled && value !== type && "opacity-30",
            )}
          >
            <span className="text-xl">{meta.emoji}</span>
            <p className={cn("font-black text-[11px]", value === type ? "text-primary" : "text-on-surface")}>
              {meta.label}
            </p>
            <p className="text-[9px] text-outline leading-snug">{meta.sub}</p>
          </button>
        ),
      )}
    </div>
  );
}

function ProgramConfigForm({ type, config, onChange }: {
  type: LoyaltyProgramType;
  config: ProgramConfig;
  onChange: (c: ProgramConfig) => void;
}) {
  const set = <K extends keyof ProgramConfig>(k: K, v: ProgramConfig[K]) =>
    onChange({ ...config, [k]: v } as ProgramConfig);

  const minSpendEuros = "minimum_spend_cents" in config
    ? (config.minimum_spend_cents as number) / 100
    : 0;
  const setMinSpend = (euros: number) =>
    onChange({ ...config, minimum_spend_cents: Math.round(euros * 100) } as ProgramConfig);

  const minSpendField = (
    <ConfigField label="Montant minimum d'achat (€)">
      <NumberInput value={minSpendEuros} onChange={setMinSpend} min={0} step={0.5} suffix="€" />
    </ConfigField>
  );

  if (type === "points") {
    const c = config as import("@/types/loyalty").PointsConfig;
    return (
      <div className="space-y-3">
        <ConfigField label="Points gagnés par euro">
          <NumberInput value={c.points_per_euro} onChange={(v) => set("points_per_euro" as keyof ProgramConfig, v as never)} min={1} />
        </ConfigField>
        {minSpendField}
        <p className="text-[10px] text-outline leading-snug">
          Les récompenses (seuils de rachat) sont configurées depuis l'interface Fido.
        </p>
      </div>
    );
  }

  if (type === "stamps") {
    const c = config as import("@/types/loyalty").StampsConfig;
    return (
      <div className="space-y-3">
        <ConfigField label="Tampons requis pour la récompense">
          <NumberInput value={c.stamps_required} onChange={(v) => set("stamps_required" as keyof ProgramConfig, v as never)} min={2} max={50} />
        </ConfigField>
        <ConfigField label="Récompense offerte">
          <input value={c.reward_label} onChange={(e) => set("reward_label" as keyof ProgramConfig, e.target.value as never)}
            placeholder="1 café offert"
            className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
        </ConfigField>
        {minSpendField}
      </div>
    );
  }

  if (type === "cashback") {
    const c = config as import("@/types/loyalty").CashbackConfig;
    return (
      <div className="space-y-3">
        <ConfigField label="Taux de cashback">
          <NumberInput value={c.cashback_rate_pct} onChange={(v) => set("cashback_rate_pct" as keyof ProgramConfig, v as never)} min={1} max={50} suffix="%" />
        </ConfigField>
        {minSpendField}
      </div>
    );
  }

  if (type === "tiers") {
    const c = config as import("@/types/loyalty").TiersConfig;
    return (
      <div className="space-y-3">
        <ConfigField label="XP gagnés par euro">
          <NumberInput value={c.xp_per_euro} onChange={(v) => set("xp_per_euro" as keyof ProgramConfig, v as never)} min={1} />
        </ConfigField>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Paliers</label>
          <div className="space-y-2">
            {c.tiers.map((tier, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <input value={tier.name} onChange={(e) => { const t = [...c.tiers]; t[i] = { ...tier, name: e.target.value }; set("tiers" as keyof ProgramConfig, t as never); }}
                  className="h-9 bg-surface-container-high rounded-xl px-3 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="relative">
                  <input type="number" value={tier.xp_min} min={0} onChange={(e) => { const t = [...c.tiers]; t[i] = { ...tier, xp_min: Number(e.target.value) }; set("tiers" as keyof ProgramConfig, t as never); }}
                    className="w-full h-9 bg-surface-container-high rounded-xl px-3 pr-8 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary/30" />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-outline pointer-events-none">XP</span>
                </div>
                <input value={tier.reward} onChange={(e) => { const t = [...c.tiers]; t[i] = { ...tier, reward: e.target.value }; set("tiers" as keyof ProgramConfig, t as never); }}
                  placeholder="Avantage"
                  className="h-9 bg-surface-container-high rounded-xl px-3 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === "visits") {
    const c = config as import("@/types/loyalty").VisitsConfig;
    return (
      <div className="space-y-3">
        <ConfigField label="Visites requises pour la récompense">
          <NumberInput value={c.visits_required} onChange={(v) => set("visits_required" as keyof ProgramConfig, v as never)} min={2} max={100} />
        </ConfigField>
        <ConfigField label="Récompense offerte">
          <input value={c.reward_label} onChange={(e) => set("reward_label" as keyof ProgramConfig, e.target.value as never)}
            placeholder="1 dessert offert"
            className="w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
        </ConfigField>
        {minSpendField}
      </div>
    );
  }

  return null;
}

function ProgramStep() {
  const { program, saving, saveError, persistProgram, clearProgram } = useLoyaltyStore();

  const isExisting = !!program;

  const [name,         setName]         = useState(program?.name ?? "Mon programme de fidélité");
  const [type,         setType]         = useState<LoyaltyProgramType>(program?.type ?? "stamps");
  const [config,       setConfig]       = useState<ProgramConfig>((program?.config as ProgramConfig) ?? DEFAULT_CONFIG["stamps"]);
  const [saved,        setSaved]        = useState(false);
  const [nameTouched,  setNameTouched]  = useState(false);
  const [confirmWipe,  setConfirmWipe]  = useState(false);

  const handleTypeChange = (t: LoyaltyProgramType) => {
    setType(t);
    setConfig(DEFAULT_CONFIG[t]);
  };

  const save = async () => {
    setNameTouched(true);
    if (!name.trim()) return;
    await persistProgram({ name, type, config });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConfirmRecreate = () => {
    clearProgram();
    setName("Mon programme de fidélité");
    setType("stamps");
    setConfig(DEFAULT_CONFIG["stamps"]);
    setSaved(false);
    setNameTouched(false);
    setConfirmWipe(false);
  };

  const nameError = nameTouched && !name.trim();

  const syncBadge = program?.synced_at
    ? <span className="text-[10px] text-secondary font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Synchronisé · {new Date(program.synced_at).toLocaleDateString("fr-FR")}</span>
    : program
      ? <span className="text-[10px] text-outline flex items-center gap-1"><RotateCcw size={10} /> Non synchronisé</span>
      : null;

  const TYPE_LABELS: Record<LoyaltyProgramType, string> = {
    points: "Points par euro",
    stamps: "Carte à tampons",
    cashback: "Cashback",
    tiers: "Niveaux (Bronze / Silver / Gold)",
    visits: "Visites",
  };

  // ── Vue lecture seule quand un programme est déjà enregistré ──
  if (isExisting) {
    return (
      <div className="space-y-5">
        {confirmWipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-6">
            <div className="w-full max-w-sm bg-surface-container-high rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                  <Trash2 size={18} className="text-error" />
                </div>
                <button onClick={() => setConfirmWipe(false)} className="text-outline hover:text-on-surface transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div>
                <p className="font-black text-sm text-on-surface">Recréer le programme ?</p>
                <p className="text-[11px] text-outline leading-snug mt-1.5">
                  Les clients déjà enrôlés conservent leur solde sur l'ancien programme, mais celui-ci disparaîtra de leur application Fido. Ils ne pourront plus cumuler ni utiliser leurs récompenses sur l'ancien programme. <span className="text-error font-bold">Cette action est irréversible.</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmWipe(false)}
                  className="flex-1 h-9 rounded-xl border border-outline-variant/20 text-xs font-bold text-outline hover:text-on-surface transition-colors">
                  Annuler
                </button>
                <button onClick={handleConfirmRecreate}
                  className="flex-1 h-9 rounded-xl bg-error text-on-error text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all">
                  Recréer
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-outline">Programme de fidélité</p>
          {syncBadge}
        </div>

        {/* Résumé lecture seule */}
        <div className="bg-surface-container rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black text-sm text-on-surface">{program.name}</p>
              <p className="text-[11px] text-outline mt-0.5">{TYPE_LABELS[program.type as LoyaltyProgramType] ?? program.type}</p>
            </div>
            <span className="shrink-0 flex items-center gap-1 text-[10px] text-outline bg-surface-container-high rounded-lg px-2 py-1">
              <Lock size={9} /> Verrouillé
            </span>
          </div>
          <p className="text-[10px] text-outline leading-snug">
            Le programme est actif sur Fido. Pour modifier le type ou reconfigurer, recréez un nouveau programme ci-dessous.
          </p>
        </div>

        <button
          onClick={() => setConfirmWipe(true)}
          className="w-full h-10 rounded-xl border-2 border-error/30 text-error text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-error/5 transition-all active:scale-[0.98]"
        >
          <Trash2 size={14} /> Recréer un programme
        </button>
      </div>
    );
  }

  // ── Formulaire de création (programme absent) ─────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-outline">Programme de fidélité</p>
      </div>

      {/* Name */}
      <ConfigField label="Nom du programme">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setNameTouched(true)}
          placeholder="Mon programme de fidélité"
          className={cn(
            "w-full h-10 bg-surface-container-high rounded-xl px-3 text-sm text-on-surface outline-none focus:ring-2 transition-all",
            nameError ? "ring-2 ring-error/50 focus:ring-error/50" : "focus:ring-primary/30",
          )}
        />
        <div className="h-4 mt-1">
          {nameError && <p className="text-[10px] text-error leading-none">Le nom est requis pour enregistrer.</p>}
        </div>
      </ConfigField>

      {/* Type */}
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Type</label>
        <TypePicker value={type} onChange={handleTypeChange} disabled={false} />
      </div>

      <ProgramConfigForm type={type} config={config} onChange={setConfig} />

      {saveError && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-error/10 border border-error/20 text-error text-xs">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span className="leading-snug">{saveError}</span>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className={cn(
          "w-full h-10 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
          saved ? "bg-secondary text-on-secondary" : "bg-primary text-on-primary hover:brightness-110 disabled:opacity-40",
        )}
      >
        {saving
          ? <><Loader2 size={14} className="animate-spin" /> Enregistrement…</>
          : saved
            ? <><CheckCircle2 size={14} /> Enregistré</>
            : <><Save size={14} /> Enregistrer le programme</>}
      </button>

      <p className="text-[10px] text-outline/60 text-center leading-snug">
        Synchronisé avec Fido dès que la connexion est active.
      </p>
    </div>
  );
}

// ── Fido detail panel (embedded in marketplace) ───────────────

export function FidoDetail() {
  const { config, connectionStatus, load } = useLoyaltyStore();
  const isConnected = connectionStatus === "ok";

  useEffect(() => { load(); }, []);

  const step = isConnected ? "program" : "credentials";

  return (
    <div className="space-y-0">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-6">
        {(["credentials", "program"] as const).map((s, i) => {
          const done  = s === "credentials" && isConnected;
          const active = s === step;
          return (
            <div key={s} className="flex items-center gap-0">
              {i > 0 && (
                <div className={cn("h-px w-8 mx-1 transition-colors", isConnected ? "bg-secondary" : "bg-outline-variant/30")} />
              )}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all",
                done  ? "bg-secondary/15 text-secondary" :
                active ? "bg-primary/10 text-primary" :
                         "text-outline",
              )}>
                {done ? <CheckCircle2 size={11} /> : <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] border-current">{i + 1}</span>}
                {s === "credentials" ? "Connexion" : "Programme"}
              </div>
            </div>
          );
        })}
      </div>

      {step === "credentials" && (
        <div className="rounded-2xl bg-surface-container p-5">
          <CredentialsStep />
        </div>
      )}

      {step === "program" && (
        <>
          {/* Connected badge */}
          <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-xl bg-secondary/10 text-secondary text-xs font-bold">
            <CheckCircle2 size={14} />
            Connexion active — mid : <span className="font-mono">{config?.fido_mid?.slice(0, 8)}…</span>
            <button
              onClick={async () => {
                useLoyaltyStore.getState().updateConfig({ fido_enabled: false });
                await useLoyaltyStore.getState().persistConfig();
              }}
              className="ml-auto text-[10px] text-outline hover:text-error transition-colors font-normal"
            >
              Déconnecter
            </button>
          </div>
          <div className="rounded-2xl bg-surface-container p-5">
            <ProgramStep />
          </div>
        </>
      )}
    </div>
  );
}

// Legacy export so any existing import still compiles
export { FidoDetail as FideliteSettings };
