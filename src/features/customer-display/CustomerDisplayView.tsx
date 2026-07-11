import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { formatCents } from "@/lib/utils";
import type { DisplayPayload } from "./window";
import { FidoQrBlock } from "@/features/loyalty/FidoQrBlock";

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

  // Auto-return to idle after "merci" (4 s) or fido-qr (45 s)
  useEffect(() => {
    if (display.type !== "thankyou" && display.type !== "fido-qr") return;
    const delay = display.type === "fido-qr" ? 45_000 : 4_000;
    const id = setTimeout(() => {
      setDisplay({ type: "idle", storeName: display.storeName });
    }, delay);
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
        <Heart
          size={96}
          className="text-on-secondary-container fill-current animate-[heartbeat_1s_ease-in-out]"
        />
        <h1 className="text-6xl font-black tracking-tighter text-on-secondary-container">
          Merci !
        </h1>
        <p className="text-3xl font-bold text-on-secondary-container/60 tabular-nums">
          {formatCents(display.total)}
        </p>
      </div>
    );
  }

  if (display.type === "fido-qr") {
    return (
      <div className="h-screen bg-on-surface flex flex-col items-center justify-center gap-8 select-none px-8">
        {display.storeName && (
          <p className="text-xs font-black uppercase tracking-[0.4em] text-surface/40">
            {display.storeName}
          </p>
        )}
        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <FidoQrBlock payloadB64url={display.payloadB64url} size={320} />
        </div>
        <div className="text-center space-y-2">
          <p className="text-2xl font-black text-surface tracking-tight">
            Fidélité Fido
          </p>
          <p className="text-surface/60 text-base">
            Scannez avec votre app pour cumuler vos points
          </p>
          <p className="text-surface/40 text-2xl font-black tabular-nums mt-4">
            {formatCents(display.total)}
          </p>
        </div>
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
