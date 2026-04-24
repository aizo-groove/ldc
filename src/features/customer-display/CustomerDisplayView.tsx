import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { formatCents } from "@/lib/utils";
import type { DisplayPayload } from "./window";

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tabular-nums">
      {time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

export function CustomerDisplayView() {
  const [display, setDisplay] = useState<DisplayPayload>({
    type: "idle",
    storeName: "",
  });

  useEffect(() => {
    const unlisten = listen<DisplayPayload>("ldc:display", (e) => {
      setDisplay(e.payload);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Auto-return to idle after "merci" screen
  useEffect(() => {
    if (display.type !== "thankyou") return;
    const id = setTimeout(() => {
      setDisplay({ type: "idle", storeName: display.storeName });
    }, 4000);
    return () => clearTimeout(id);
  }, [display]);

  if (display.type === "idle") {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-8 select-none">
        {display.storeName && (
          <p className="text-xs font-black uppercase tracking-[0.4em] text-outline">
            {display.storeName}
          </p>
        )}
        <h1 className="text-7xl font-black tracking-tighter text-on-surface">
          Bienvenue
        </h1>
        <p className="text-4xl font-bold text-outline">
          <LiveClock />
        </p>
      </div>
    );
  }

  if (display.type === "thankyou") {
    return (
      <div className="h-screen bg-secondary-container flex flex-col items-center justify-center gap-6 select-none">
        {display.storeName && (
          <p className="text-xs font-black uppercase tracking-[0.4em] text-on-secondary-container/50">
            {display.storeName}
          </p>
        )}
        <svg viewBox="0 0 24 24" className="w-24 h-24 text-on-secondary-container" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <h1 className="text-6xl font-black tracking-tighter text-on-secondary-container">
          Merci !
        </h1>
        <p className="text-3xl font-bold text-on-secondary-container/60 tabular-nums">
          {formatCents(display.total)}
        </p>
      </div>
    );
  }

  // cart state
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-8 py-4 bg-surface-container-low border-b border-outline-variant/10">
        <span className="text-xs font-black uppercase tracking-widest text-outline">
          {display.storeName}
        </span>
        <span className="text-sm font-bold text-outline">
          <LiveClock />
        </span>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {display.items.length === 0 ? (
          <p className="text-outline text-sm text-center mt-16">Panier vide</p>
        ) : (
          <div className="space-y-1">
            {display.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-3 border-b border-outline-variant/10"
              >
                <span className="w-8 text-center text-sm font-black text-primary tabular-nums shrink-0">
                  {item.qty}×
                </span>
                <span className="flex-1 text-on-surface text-base font-medium leading-snug">
                  {item.name}
                </span>
                <span className="font-black text-on-surface tabular-nums text-base shrink-0">
                  {formatCents(item.total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total bar */}
      <div className="shrink-0 bg-primary px-8 py-7 flex items-center justify-between">
        <span className="text-on-primary font-black text-sm uppercase tracking-[0.2em]">
          Total TTC
        </span>
        <span className="text-on-primary font-black text-6xl tabular-nums tracking-tighter">
          {formatCents(display.total)}
        </span>
      </div>
    </div>
  );
}
