import { Download } from "lucide-react";
import { DOWNLOAD_URL } from ".";

/** Bandeau permanent du mode démo web : avertissement + téléchargement de l'app. */
export function DemoBanner() {
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-full bg-surface-container-high border border-outline-variant/30 shadow-lg pl-4 pr-1 py-1">
      <span className="text-xs text-on-surface-variant whitespace-nowrap">
        <strong className="text-on-surface uppercase tracking-widest">Démo</strong>
        <span className="hidden lg:inline"> · rien n'est enregistré, ce n'est pas une caisse NF525</span>
      </span>
      <a
        href={DOWNLOAD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-full bg-primary text-on-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all whitespace-nowrap"
      >
        <Download size={14} /> Télécharger LDC
      </a>
    </div>
  );
}
