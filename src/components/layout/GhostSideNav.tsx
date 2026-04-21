/**
 * Ghost SideNav — version réduite (w-20) utilisée sur l'écran de paiement.
 * Semi-transparente, présence contextuelle sans prendre de place dans le layout.
 */
import { ShoppingCart, History, Package, Lock, RefreshCw, User } from "lucide-react";

interface GhostSideNavProps {
  cashierName?: string;
}

const GHOST_ICONS = [
  { icon: <ShoppingCart size={20} />, label: "Vente" },
  { icon: <History size={20} />,      label: "Historique" },
  { icon: <Package size={20} />,      label: "Inventaire" },
  { icon: <Lock size={20} />,         label: "Clôture" },
];

export function GhostSideNav({ cashierName = "Jean D." }: GhostSideNavProps) {
  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-64px)] w-20 flex flex-col py-4 bg-surface-container-low items-center gap-8 z-40">
      {/* Profil caissier */}
      <div className="flex flex-col items-center gap-1 opacity-40">
        <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center">
          <User size={16} />
        </div>
        <span className="text-[8px] uppercase font-black tracking-tighter select-none">
          {cashierName.split(" ")[0]}
        </span>
      </div>

      {/* Icônes nav */}
      <div className="flex flex-col gap-6 items-center">
        {GHOST_ICONS.map(({ icon, label }) => (
          <div key={label} className="text-on-surface opacity-30" title={label}>
            {icon}
          </div>
        ))}
      </div>

      {/* Sync */}
      <div className="mt-auto p-2">
        <button
          className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary-fixed-dim hover:bg-surface-container-highest transition-colors"
          title="Synchronisation"
        >
          <RefreshCw size={20} />
        </button>
      </div>
    </div>
  );
}
