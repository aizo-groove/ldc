import { X, ExternalLink, Map, ShieldCheck, Store, Printer } from "lucide-react";
import { updateSetting } from "@/lib/tauri";

interface WhatsNewModalProps {
  version: string;
  onClose: () => void;
}

type VersionNotes = {
  highlights: { icon: React.ReactNode; title: string; description: string }[];
  githubTag: string;
};

const NOTES: Record<string, VersionNotes> = {
  "0.5.0": {
    githubTag: "v0.5.0",
    highlights: [
      {
        icon: <Store size={20} />,
        title: "Nouveautés à l'ouverture",
        description: "Ce que vous lisez en ce moment — un résumé des nouveautés après chaque mise à jour.",
      },
      {
        icon: <Map size={20} />,
        title: "Visite guidée améliorée",
        description: "La visite couvre désormais la clôture Z, les paramètres et le plan de salle.",
      },
      {
        icon: <ShieldCheck size={20} />,
        title: "Validation des données",
        description: "SIRET, téléphone, TVA, code postal et URL sont maintenant vérifiés dans les paramètres.",
      },
      {
        icon: <Printer size={20} />,
        title: "UX caissier améliorée",
        description: "Après la création d'un caissier, retour direct à la liste prête à cliquer.",
      },
    ],
  },
};

export function WhatsNewModal({ version, onClose }: WhatsNewModalProps) {
  const notes = NOTES[version];

  const handleClose = async () => {
    await updateSetting("last_seen_version", version).catch(() => {});
    onClose();
  };

  if (!notes) {
    handleClose();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-surface-container-low rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-7 pt-7 pb-5 flex items-start justify-between">
          <div>
            <p className="text-[10px] text-outline uppercase tracking-widest mb-1">Mise à jour</p>
            <h2 className="text-2xl font-black uppercase tracking-tight">Nouveautés v{version}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Highlights */}
        <div className="px-7 pb-5 space-y-4">
          {notes.highlights.map((item, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="font-bold text-sm text-on-surface">{item.title}</p>
                <p className="text-xs text-outline mt-0.5 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-outline-variant/10 flex items-center justify-between">
          <a
            href={`https://github.com/aizo-groove/ldc/releases/tag/${notes.githubTag}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-outline hover:text-on-surface transition-colors"
          >
            <ExternalLink size={12} />
            Changelog complet
          </a>
          <button
            onClick={handleClose}
            className="px-5 py-2.5 bg-primary text-on-primary text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 active:scale-95 transition-all"
          >
            C'est noté !
          </button>
        </div>
      </div>
    </div>
  );
}
