import { useEffect, useState } from "react";
import { Download, X, Loader2, RefreshCw } from "lucide-react";
import { check, type Update } from "@tauri-apps/plugin-updater";

export function UpdateBanner() {
  const [update,      setUpdate]      = useState<Update | null>(null);
  const [dismissed,   setDismissed]   = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress,    setProgress]    = useState<number | null>(null);
  const [done,        setDone]        = useState(false);

  useEffect(() => {
    // Check silently after a short delay so the app renders first
    const id = setTimeout(() => {
      check()
        .then((u) => { if (u?.available) setUpdate(u); })
        .catch(() => { /* network unavailable — silent fail */ });
    }, 3000);
    return () => clearTimeout(id);
  }, []);

  if (!update || dismissed) return null;

  const handleInstall = async () => {
    setDownloading(true);
    setProgress(0);
    try {
      let downloaded = 0;
      let total = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started")    { total = event.data.contentLength ?? 0; }
        if (event.event === "Progress")   { downloaded += event.data.chunkLength; setProgress(total > 0 ? Math.round(downloaded / total * 100) : null); }
        if (event.event === "Finished")   { setDone(true); }
      });
    } catch {
      setDownloading(false);
      setProgress(null);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3 bg-surface-container-low border border-primary/20 rounded-2xl shadow-2xl text-sm min-w-96">
      {done ? (
        <>
          <RefreshCw size={16} className="text-secondary shrink-0" />
          <span className="flex-1 text-on-surface font-medium">
            Mise à jour installée — redémarrez LDC pour l'appliquer.
          </span>
        </>
      ) : downloading ? (
        <>
          <Loader2 size={16} className="text-primary shrink-0 animate-spin" />
          <span className="flex-1 text-on-surface font-medium">
            Téléchargement{progress !== null ? ` ${progress}%` : "…"}
          </span>
          {progress !== null && (
            <div className="w-24 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </>
      ) : (
        <>
          <Download size={16} className="text-primary shrink-0" />
          <div className="flex-1">
            <span className="font-bold text-on-surface">Mise à jour disponible</span>
            <span className="text-outline ml-2 text-xs">v{update.version}</span>
          </div>
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 bg-primary text-on-primary text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 active:scale-95 transition-all"
          >
            Installer
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-outline hover:text-on-surface transition-colors"
          >
            <X size={14} />
          </button>
        </>
      )}
    </div>
  );
}
