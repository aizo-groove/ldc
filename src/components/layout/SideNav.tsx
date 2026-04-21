import { ShoppingCart, History, Package, Lock, Settings, LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/features/settings/store";
import { useNavStore } from "./navStore";

export type NavRoute = "caisse" | "historique" | "inventaire" | "cloture" | "tables" | "parametres";

interface NavItem {
  route: NavRoute;
  label: string;
  icon: React.ReactNode;
}

const BASE_NAV_ITEMS: NavItem[] = [
  { route: "caisse",     label: "Vente",         icon: <ShoppingCart size={22} /> },
  { route: "historique", label: "Historique",    icon: <History size={22} /> },
  { route: "inventaire", label: "Inventaire",    icon: <Package size={22} /> },
  { route: "tables",     label: "Plan de salle", icon: <LayoutGrid size={22} /> },
  { route: "cloture",    label: "Clôture",       icon: <Lock size={22} /> },
];

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { route: "parametres", label: "Paramètres", icon: <Settings size={22} /> },
];

interface SideNavProps {
  activeRoute: NavRoute | null;
  onNavigate: (route: NavRoute) => void;
}

export function SideNav({ activeRoute, onNavigate }: SideNavProps) {
  const hasTables  = useSettingsStore((s) => s.flags.hasTableManagement);
  const { collapsed, toggle } = useNavStore();

  const navItems = BASE_NAV_ITEMS.filter(
    (item) => item.route !== "tables" || hasTables
  );

  return (
    <nav
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-64px)] flex flex-col py-4 z-40 bg-surface-container-low transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >

      {/* ── Navigation items ────────────���───────────────── */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map(({ route, label, icon }) => {
          const isActive = route === activeRoute;
          return (
            <button
              key={route}
              onClick={() => onNavigate(route)}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center py-4 text-sm font-bold uppercase tracking-widest transition-all text-left",
                collapsed ? "justify-center px-0" : "gap-4 px-4",
                isActive
                  ? "bg-surface-container-high text-primary rounded-r-xl border-l-4 border-primary"
                  : "text-on-surface hover:bg-surface-container-high"
              )}
            >
              {icon}
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* ── Navigation bas ──────────────────────────────── */}
      <div className="border-t border-outline-variant/10 pt-2">
        {BOTTOM_NAV_ITEMS.map(({ route, label, icon }) => {
          const isActive = route === activeRoute;
          return (
            <button
              key={route}
              onClick={() => onNavigate(route)}
              title={collapsed ? label : undefined}
              className={cn(
                "w-full flex items-center py-4 text-sm font-bold uppercase tracking-widest transition-all text-left",
                collapsed ? "justify-center px-0" : "gap-4 px-4",
                isActive
                  ? "bg-surface-container-high text-primary rounded-r-xl border-l-4 border-primary"
                  : "text-on-surface hover:bg-surface-container-high"
              )}
            >
              {icon}
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}

        {/* ── Toggle collapse ──────���──────────────────── */}
        <button
          onClick={toggle}
          title={collapsed ? "Agrandir" : "Réduire"}
          className={cn(
            "w-full flex items-center py-3 text-outline hover:text-on-surface hover:bg-surface-container-high transition-all",
            collapsed ? "justify-center px-0" : "gap-4 px-4"
          )}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="text-[10px] uppercase tracking-widest font-bold">Réduire</span>}
        </button>
      </div>

    </nav>
  );
}
