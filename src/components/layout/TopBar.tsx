import { useEffect, useState } from "react";
import { Printer, User, RefreshCw, Sun, Moon } from "lucide-react";
import { useSettingsStore } from "@/features/settings/store";

interface TopBarProps {
  cashierName?: string;
  onSwitchCashier?: () => void;
  onPrinterSettings?: () => void;
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tabular-nums text-sm font-bold text-on-surface-variant select-none w-12 text-center">
      {time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

export function TopBar({ cashierName = "—", onSwitchCashier, onPrinterSettings }: TopBarProps) {
  const { theme, setTheme } = useSettingsStore();

  return (
    <header className="fixed top-0 w-full h-16 flex justify-between items-center px-6 z-50 bg-surface-container-low">
      <h1 className="text-xl font-black text-on-surface tracking-tighter select-none">
        LDC POS
      </h1>

      {/* Droite : actions + profil */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrinterSettings}
          aria-label="Paramètres imprimante"
          className="p-2 rounded-xl text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 duration-100"
        >
          <Printer size={22} />
        </button>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Changer le thème"
          className="p-2 rounded-xl text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 duration-100"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <LiveClock />

        <div className="h-8 w-px bg-outline-variant mx-2" />

        <button
          onClick={onSwitchCashier}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-primary hover:bg-surface-container-high transition-colors active:scale-95 duration-100"
          title="Changer de caissier"
        >
          <User size={20} />
          <span className="text-sm font-medium">{cashierName}</span>
          <RefreshCw size={14} className="text-outline" />
        </button>
      </div>
    </header>
  );
}
