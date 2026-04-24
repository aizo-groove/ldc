import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";

const STORAGE_KEY_DATE  = "ldc_donation_last_prompt";
const STORAGE_KEY_NEVER = "ldc_donation_never";
const KOFI_URL          = "https://ko-fi.com/aizogroove";
const DELAY_MS          = 45_000; // 45 s après le démarrage

function shouldShow(): boolean {
  if (localStorage.getItem(STORAGE_KEY_NEVER) === "true") return false;
  const last  = localStorage.getItem(STORAGE_KEY_DATE);
  const today = new Date().toISOString().slice(0, 10);
  return last !== today;
}

export function DonationModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shouldShow()) return;
    const id = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  const markToday = () => {
    localStorage.setItem(STORAGE_KEY_DATE, new Date().toISOString().slice(0, 10));
    setVisible(false);
  };

  const neverAgain = () => {
    localStorage.setItem(STORAGE_KEY_NEVER, "true");
    setVisible(false);
  };

  const openKofi = () => {
    openUrl(KOFI_URL).catch(() => {});
    markToday();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto w-80 bg-surface-container-low border border-outline-variant/20 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start gap-3">
          <span className="text-3xl leading-none select-none">🐱</span>
          <div>
            <p className="font-black text-sm text-on-surface">Un petit coup de pouce ?</p>
            <p className="text-[11px] text-outline mt-0.5">Mimi le chat réclame ses croquettes.</p>
          </div>
        </div>

        {/* Body */}
        <p className="px-5 pb-4 text-xs text-on-surface-variant leading-relaxed">
          LDC est développé et maintenu par une seule personne — qui a, entre autres
          responsabilités, un chat exigeant et des outils de dev à payer.
          Si le logiciel vous aide au quotidien, un café sur Ko-fi fait vraiment la différence. ☕
        </p>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={openKofi}
            className="w-full py-2.5 rounded-xl bg-[#FF5E5B] text-white text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
          >
            Offrir un café sur Ko-fi ☕
          </button>
          <div className="flex items-center justify-between px-1">
            <button
              onClick={neverAgain}
              className="text-[10px] text-outline hover:text-on-surface-variant transition-colors"
            >
              J'ai déjà soutenu ❤️
            </button>
            <button
              onClick={markToday}
              className="text-[10px] text-outline hover:text-on-surface-variant transition-colors"
            >
              Peut-être plus tard
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
