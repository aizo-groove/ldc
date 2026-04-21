import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Room, RestaurantTable, TableShape, TableStatus } from "@/types/table";

interface TableFormModalProps {
  table?: RestaurantTable;
  rooms: Room[];
  defaultRoomId?: string | null;
  onClose: () => void;
  onSaved: (t: RestaurantTable) => void;
}

const SHAPES: { id: TableShape; label: string; cls: string }[] = [
  { id: "square", label: "Carré",       cls: "w-10 h-10 rounded-xl" },
  { id: "round",  label: "Rond",        cls: "w-10 h-10 rounded-full" },
  { id: "rect",   label: "Rectangle",   cls: "w-20 h-10 rounded-xl" },
];

const STATUSES: { id: TableStatus; label: string; color: string }[] = [
  { id: "libre",    label: "Libre",            color: "bg-secondary" },
  { id: "occupe",   label: "Occupé",           color: "bg-error" },
  { id: "addition", label: "Attente addition", color: "bg-primary" },
];

const INPUT_CLS = "w-full bg-surface-container rounded-xl px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-outline";

export function TableFormModal({ table, rooms, defaultRoomId, onClose, onSaved }: TableFormModalProps) {
  const isEdit = !!table;

  const [name,     setName]     = useState(table?.name ?? "");
  const [roomId,   setRoomId]   = useState(table?.room_id ?? defaultRoomId ?? rooms[0]?.id ?? "");
  const [seats,    setSeats]    = useState(String(table?.seats ?? 4));
  const [shape,    setShape]    = useState<TableShape>(table?.shape ?? "square");
  const [status,   setStatus]   = useState<TableStatus>(table?.status ?? "libre");
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = () => {
    if (!name.trim()) { setError("Le nom de la table est obligatoire."); return; }
    const seatsNum = parseInt(seats);
    if (!seatsNum || seatsNum < 1) { setError("Le nombre de couverts doit être ≥ 1."); return; }
    setError(null);
    onSaved({
      id:         table?.id ?? "",
      room_id:    roomId || null,
      name:       name.trim(),
      seats:      seatsNum,
      shape,
      status,
      pos_x:      table?.pos_x ?? 100,
      pos_y:      table?.pos_y ?? 100,
      sort_order: table?.sort_order ?? 0,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-container-low rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h2 className="font-black text-on-surface tracking-tight text-lg">
            {isEdit ? `Modifier — ${table.name}` : "Nouvelle table"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 text-error text-sm">{error}</div>
          )}

          {/* Nom */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-outline uppercase tracking-widest">Nom *</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : T01, Bar, Terrasse..." className={INPUT_CLS} />
          </div>

          {/* Salle */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-outline uppercase tracking-widest">Salle</label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={INPUT_CLS}>
              <option value="">— Sans salle —</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          {/* Couverts + Forme */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-outline uppercase tracking-widest">Couverts</label>
              <input type="number" min="1" max="20" value={seats} onChange={(e) => setSeats(e.target.value)} className={INPUT_CLS} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-outline uppercase tracking-widest">Statut initial</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TableStatus)} className={INPUT_CLS}>
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Forme */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-outline uppercase tracking-widest">Forme</label>
            <div className="flex gap-3">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setShape(s.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 flex-1 transition-all",
                    shape === s.id ? "border-primary bg-primary/5" : "border-outline-variant/20 hover:border-outline-variant/50"
                  )}
                >
                  <div className={cn(s.cls, shape === s.id ? "bg-primary/30" : "bg-surface-container-highest")} />
                  <span className="text-[10px] font-black text-outline uppercase">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant/10 bg-surface-container">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-on-surface-variant font-bold text-sm hover:bg-surface-container-high transition-colors">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Save size={16} />
            {isEdit ? "Enregistrer" : "Créer la table"}
          </button>
        </div>
      </div>
    </div>
  );
}
