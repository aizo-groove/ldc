import { useEffect, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { formatCents } from "@/lib/utils";
import type { OpenOrderFull } from "@/types/open_order";

/** Libellés rapides proposés au renommage */
export const QUICK_LABELS = ["À emporter", "Comptoir", "Terrasse", "Livraison"];

export function noteTotal(note: OpenOrderFull): number {
  return note.lines.reduce((s, l) => s + l.unit_price_ttc * l.quantity - l.discount_ttc, 0);
}

/** « Cappuccino ×2 + 1 article » : de quoi reconnaître la note sans libellé */
export function noteSummary(note: OpenOrderFull): string {
  const [first, ...rest] = note.lines;
  if (!first) return "Vide";
  const head = first.quantity > 1 ? `${first.product_name} ×${first.quantity}` : first.product_name;
  return rest.length ? `${head} + ${rest.length} article${rest.length > 1 ? "s" : ""}` : head;
}

function age(iso: string, now: number): string {
  const min = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  return `il y a ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

/** Saisie d'un libellé : texte libre + libellés rapides (un tap suffit). */
export function LabelEditor({
  initial, onSave, onCancel,
}: { initial: string | null; onSave: (label: string | null) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial ?? "");
  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex gap-2">
        <input
          autoFocus
          value={value}
          maxLength={40}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave(value || null);
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Libellé (facultatif)"
          className="flex-1 min-w-0 bg-surface-container-highest rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <button onClick={() => onSave(value || null)} aria-label="Valider" className="p-2 rounded-lg bg-primary text-on-primary">
          <Check size={16} />
        </button>
        <button onClick={onCancel} aria-label="Annuler" className="p-2 rounded-lg bg-surface-container-highest">
          <X size={16} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_LABELS.map((l) => (
          <button
            key={l}
            onClick={() => onSave(l)}
            className="px-2.5 py-1 rounded-full bg-surface-container-highest text-xs font-bold hover:bg-primary hover:text-on-primary transition-colors"
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

interface HeldOrdersPanelProps {
  notes: OpenOrderFull[];
  onResume: (note: OpenOrderFull) => void;
  onRename: (id: string, label: string | null) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/** Liste des notes en attente, de la plus ancienne à la plus récente. */
export function HeldOrdersPanel({ notes, onResume, onRename, onDelete, onClose }: HeldOrdersPanelProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-surface-container-lowest">
      <div className="p-6 flex items-center justify-between border-b border-outline-variant/10">
        <h2 className="text-xl font-bold tracking-tight uppercase select-none">En attente</h2>
        <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-xl hover:bg-surface-container-high">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notes.length === 0 && (
          <p className="text-center text-sm text-outline uppercase tracking-widest pt-12 select-none">
            Aucune note en attente
          </p>
        )}
        {notes.map((note) => {
          const { order } = note;
          const title = order.label ?? noteSummary(note);
          return (
            <div
              key={order.id}
              onClick={() => editing !== order.id && onResume(note)}
              className="rounded-xl bg-surface-container-high p-4 cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0 h-11 w-11 rounded-lg bg-primary/15 text-primary font-black flex items-center justify-center">
                  #{order.held_no ?? "?"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{title}</p>
                  <p className="text-xs text-outline truncate">
                    {order.label ? `${noteSummary(note)} · ` : ""}{age(order.created_at, now)}
                  </p>
                </div>
                <span className="font-black tabular-nums">{formatCents(noteTotal(note))}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(order.id); }}
                  aria-label="Renommer"
                  className="p-2 rounded-lg text-outline hover:bg-surface-container-highest"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirmDelete === order.id) onDelete(order.id);
                    else setConfirmDelete(order.id);
                  }}
                  aria-label="Supprimer"
                  className={`p-2 rounded-lg transition-colors ${confirmDelete === order.id ? "bg-error text-on-error" : "text-outline hover:bg-surface-container-highest"}`}
                >
                  {confirmDelete === order.id ? <span className="text-[10px] font-black uppercase px-1">Suppr. ?</span> : <Trash2 size={16} />}
                </button>
              </div>
              {editing === order.id && (
                <div className="mt-3">
                  <LabelEditor
                    initial={order.label}
                    onSave={(label) => { onRename(order.id, label); setEditing(null); }}
                    onCancel={() => setEditing(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
