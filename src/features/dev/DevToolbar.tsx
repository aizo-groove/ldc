import { useState } from "react";
import { devResetOnboarding } from "@/lib/tauri";

interface DevToolbarProps {
  onReset: () => void;
}

export function DevToolbar({ onReset }: DevToolbarProps) {
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResetOnboarding = async () => {
    setBusy(true);
    setError(null);
    try {
      await devResetOnboarding();
      onReset();
    } catch (e) {
      console.error("[DEV] dev_reset_onboarding failed:", e);
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-[9999] flex flex-col gap-1 items-start">
      <div className="flex items-center gap-2 px-3 py-2 bg-error/10 border border-error/30 rounded-xl text-xs font-bold text-error">
        <span className="uppercase tracking-widest opacity-60">DEV</span>
        <div className="w-px h-4 bg-error/20" />
        <button
          onClick={handleResetOnboarding}
          disabled={busy}
          className="hover:text-on-surface transition-colors disabled:opacity-50"
        >
          {busy ? "…" : "Reset complet"}
        </button>
      </div>
      {error && (
        <p className="text-[10px] text-error bg-error/10 rounded-lg px-2 py-1 max-w-xs break-all">
          {error}
        </p>
      )}
    </div>
  );
}
