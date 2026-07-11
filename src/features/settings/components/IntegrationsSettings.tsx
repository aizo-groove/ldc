import { useState } from "react";
import { CheckCircle2, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoyaltyStore } from "@/features/loyalty/store";
import { FidoDetail } from "./FideliteSettings";

// ── Integration card ──────────────────────────────────────────

type IntegrationStatus = "connected" | "available" | "soon";

function IntegrationCard({
  emoji,
  name,
  description,
  status,
  selected,
  onClick,
}: {
  emoji: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  selected?: boolean;
  onClick?: () => void;
}) {
  const statusLabel: Record<IntegrationStatus, string> = {
    connected:  "Connecté",
    available:  "Disponible",
    soon:       "Bientôt",
  };
  const statusColor: Record<IntegrationStatus, string> = {
    connected:  "text-secondary bg-secondary/10",
    available:  "text-primary bg-primary/10",
    soon:       "text-outline bg-surface-container-high",
  };

  return (
    <button
      onClick={status !== "soon" ? onClick : undefined}
      disabled={status === "soon"}
      className={cn(
        "relative text-left p-4 rounded-2xl border-2 transition-all flex flex-col gap-3",
        status === "soon"
          ? "border-outline-variant/10 opacity-50 cursor-default"
          : selected
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-outline-variant/20 hover:border-outline-variant/40 hover:bg-surface-container-high/50",
      )}
    >
      {/* Status badge */}
      <span className={cn("absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1", statusColor[status])}>
        {status === "connected" && <CheckCircle2 size={9} />}
        {status === "soon" && <Lock size={9} />}
        {statusLabel[status]}
      </span>

      {/* Icon */}
      <div className={cn(
        "w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0",
        selected ? "bg-primary/10" : "bg-surface-container-high",
      )}>
        {emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-16">
        <p className="font-black text-sm text-on-surface">{name}</p>
        <p className="text-[10px] text-outline leading-snug mt-0.5">{description}</p>
      </div>

      {status !== "soon" && (
        <div className={cn("flex items-center gap-1 text-[10px] font-bold transition-colors", selected ? "text-primary" : "text-outline")}>
          {selected ? "Configuré" : "Configurer"}
          <ChevronRight size={11} className={cn("transition-transform", selected && "rotate-90")} />
        </div>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────

const INTEGRATIONS = [
  {
    id: "fido",
    emoji: "🎁",
    name: "Fidélité Fido",
    description: "Programme de fidélité pour vos clients — points, tampons, cashback, niveaux, visites.",
    status: "available" as IntegrationStatus,
  },
  {
    id: "accounting",
    emoji: "📊",
    name: "Comptabilité",
    description: "Export automatique vers votre logiciel comptable.",
    status: "soon" as IntegrationStatus,
  },
  {
    id: "tpe",
    emoji: "💳",
    name: "TPE bancaire",
    description: "Intégration paiement CB sans ressaisie du montant.",
    status: "soon" as IntegrationStatus,
  },
  {
    id: "online",
    emoji: "🌐",
    name: "Commande en ligne",
    description: "Synchronisez vos commandes web directement dans LDC.",
    status: "soon" as IntegrationStatus,
  },
];

export function IntegrationsSettings() {
  const [selected, setSelected] = useState<string | null>("fido");
  const connectionStatus = useLoyaltyStore((s) => s.connectionStatus);
  const fidoConfig = useLoyaltyStore((s) => s.config);

  const fidoStatus: IntegrationStatus =
    connectionStatus === "ok" ? "connected" : "available";

  const integrations = INTEGRATIONS.map((i) =>
    i.id === "fido" ? { ...i, status: fidoStatus } : i,
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-8">

      {/* Marketplace grid */}
      <section>
        <h2 className="text-[11px] font-black text-outline uppercase tracking-widest mb-4">
          Intégrations disponibles
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {integrations.map((i) => (
            <IntegrationCard
              key={i.id}
              {...i}
              selected={selected === i.id}
              onClick={() => toggle(i.id)}
            />
          ))}
        </div>
      </section>

      {/* Detail panel */}
      {selected === "fido" && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🎁</span>
            <div>
              <h2 className="font-black text-sm text-on-surface">Fidélité Fido</h2>
              <p className="text-[10px] text-outline">
                {fidoStatus === "connected"
                  ? `Connecté · ${fidoConfig?.fido_mid?.slice(0, 8)}…`
                  : "Configuration requise"}
              </p>
            </div>
            <a
              href="https://fido.app"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-[10px] text-outline hover:text-on-surface transition-colors"
            >
              fido.app ↗
            </a>
          </div>
          <FidoDetail />
        </section>
      )}
    </div>
  );
}
