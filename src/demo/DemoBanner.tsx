import { Download } from "lucide-react";
import { DOWNLOAD_URL } from ".";

/**
 * Bandeau du mode démo web : avertissement + téléchargement de l'app.
 * - `inline` : dans la TopBar, prend sa place sans masquer les boutons.
 * - `floating` : écrans sans TopBar (choix du caissier) ; masqué dès que la TopBar est affichée.
 */
export function DemoBanner({ variant }: { variant: "inline" | "floating" }) {
  const position =
    variant === "floating"
      ? "fixed top-3 left-1/2 -translate-x-1/2 z-[60] [body[data-topbar]_&]:hidden"
      : "min-w-0 mx-4";

  return (
    <div className={`${position} flex items-center gap-3 rounded-full bg-surface-container-high border border-outline-variant/30 shadow-lg pl-4 pr-1 py-1`}>
      <span className="text-xs text-on-surface-variant whitespace-nowrap truncate">
        <strong className="text-on-surface uppercase tracking-widest">Démo</strong>
        <span className="hidden xl:inline"> · rien n'est enregistré, ce n'est pas une caisse NF525</span>
        <span className="hidden md:inline xl:hidden"> · pas une caisse NF525</span>
      </span>
      <a
        href={DOWNLOAD_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Télécharger LDC"
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary text-on-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all whitespace-nowrap"
      >
        <Download size={14} />
        <span className="hidden md:inline">Télécharger LDC</span>
      </a>
    </div>
  );
}
