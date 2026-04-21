import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Settings2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTablesStore } from "./store";
import { TableFormModal } from "./components/TableFormModal";
import { TableTicketPanel } from "./components/TableTicketPanel";
import type { RestaurantTable, TableStatus } from "@/types/table";

interface TableViewProps {
  onTablePay: (tableId: string) => void;
}

// ── Constants ─────────────────────────────────────────────────

const CANVAS_W = 1400;
const CANVAS_H = 800;

const STATUS_COLOR: Record<TableStatus, { border: string; text: string; dot: string; bg: string; badge: string }> = {
  libre:    { border: "border-secondary/40",  text: "text-secondary",  dot: "bg-secondary", bg: "",                          badge: "" },
  occupe:   { border: "border-error/60",      text: "text-error",      dot: "bg-error",     bg: "bg-error/10",               badge: "bg-error text-on-error" },
  addition: { border: "border-primary/60",    text: "text-primary",    dot: "bg-primary",   bg: "bg-primary/10",             badge: "bg-primary text-on-primary" },
};

const STATUS_LABEL: Record<TableStatus, string> = {
  libre:    "Libre",
  occupe:   "Occupé",
  addition: "Addition",
};

const SHAPE_SIZE: Record<string, { w: number; h: number; radius: string }> = {
  square: { w: 96,  h: 96,  radius: "rounded-xl" },
  round:  { w: 96,  h: 96,  radius: "rounded-full" },
  rect:   { w: 176, h: 96,  radius: "rounded-xl" },
};

// ── TableCard ─────────────────────────────────────────────────

interface TableCardProps {
  table: RestaurantTable;
  editMode: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

function TableCard({ table, editMode, onMouseDown, onEdit, onDelete, onClick }: TableCardProps) {
  const colors = STATUS_COLOR[table.status as TableStatus] ?? STATUS_COLOR.libre;
  const size   = SHAPE_SIZE[table.shape] ?? SHAPE_SIZE.square;

  return (
    <div
      style={{ left: table.pos_x, top: table.pos_y, width: size.w, height: size.h }}
      className={cn(
        "absolute flex flex-col items-center justify-center select-none",
        "border-b-4 transition-shadow",
        colors.bg || "bg-surface-container-high",
        size.radius,
        colors.border,
        editMode ? "cursor-move hover:shadow-xl hover:shadow-black/30" : "cursor-pointer hover:brightness-110",
      )}
      onMouseDown={editMode ? onMouseDown : undefined}
      onClick={!editMode ? onClick : undefined}
    >
      {/* Status badge for non-libre tables */}
      {table.status !== "libre" && (
        <span className={cn(
          "absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap",
          colors.badge,
        )}>
          {STATUS_LABEL[table.status as TableStatus]}
        </span>
      )}

      <span className={cn("font-black text-lg leading-none", colors.text)}>
        {table.name}
      </span>
      <span className="text-[10px] font-bold text-outline mt-1">
        {table.seats} cvts
      </span>

      {/* Edit mode overlay */}
      {editMode && (
        <div className="absolute inset-0 flex items-start justify-end p-1 opacity-0 hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
          <div className="flex gap-1 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="w-6 h-6 rounded-lg bg-surface-container-highest/90 flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors text-outline"
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-6 h-6 rounded-lg bg-surface-container-highest/90 flex items-center justify-center hover:bg-error hover:text-on-error transition-colors text-outline"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────

export function TableView({ onTablePay }: TableViewProps) {
  const { rooms, tables, isLoading, load, addRoom, renameRoom, removeRoom, addTable, editTable, removeTable, moveLocal, persistPosition } = useTablesStore();

  const [activeRoomId,   setActiveRoomId]   = useState<string | "all">("all");
  const [editMode,       setEditMode]       = useState(false);
  const [modal,          setModal]          = useState<RestaurantTable | null | undefined>(undefined);
  const [selectedTable,  setSelectedTable]  = useState<RestaurantTable | null>(null);
  // undefined = closed, null = create, RestaurantTable = edit

  // Room management state
  const [addingRoom,    setAddingRoom]    = useState(false);
  const [newRoomName,   setNewRoomName]   = useState("");
  const [renamingRoom,  setRenamingRoom]  = useState<string | null>(null);
  const [renameValue,   setRenameValue]   = useState("");

  // Drag state
  const canvasRef  = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ id: string; ox: number; oy: number } | null>(null);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag handlers ────────────────────────────────────────

  const handleTableMouseDown = useCallback((e: React.MouseEvent, table: RestaurantTable) => {
    if (!editMode) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scrollLeft = canvas.parentElement?.scrollLeft ?? 0;
    const scrollTop  = canvas.parentElement?.scrollTop  ?? 0;
    draggingRef.current = {
      id: table.id,
      ox: e.clientX - rect.left + scrollLeft - table.pos_x,
      oy: e.clientY - rect.top  + scrollTop  - table.pos_y,
    };
  }, [editMode]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = draggingRef.current;
      if (!drag || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scrollLeft = canvasRef.current.parentElement?.scrollLeft ?? 0;
      const scrollTop  = canvasRef.current.parentElement?.scrollTop  ?? 0;
      const x = Math.max(0, Math.min(e.clientX - rect.left + scrollLeft - drag.ox, CANVAS_W - 200));
      const y = Math.max(0, Math.min(e.clientY - rect.top  + scrollTop  - drag.oy, CANVAS_H - 120));
      moveLocal(drag.id, Math.round(x), Math.round(y));
    };
    const onUp = async () => {
      if (!draggingRef.current) return;
      await persistPosition(draggingRef.current.id);
      draggingRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, [moveLocal, persistPosition]);

  // ── Derived stats ─────────────────────────────────────────

  const libreCount    = tables.filter((t) => t.status === "libre").length;
  const occupeCount   = tables.filter((t) => t.status === "occupe").length;
  const additionCount = tables.filter((t) => t.status === "addition").length;
  const totalSeats    = tables.filter((t) => t.status === "libre").reduce((s, t) => s + t.seats, 0);

  const visibleTables = activeRoomId === "all"
    ? tables
    : tables.filter((t) => t.room_id === activeRoomId);

  // ── Room helpers ─────────────────────────────────────────

  const handleAddRoom = async () => {
    if (!newRoomName.trim()) return;
    await addRoom(newRoomName.trim());
    setNewRoomName("");
    setAddingRoom(false);
  };

  const handleRenameRoom = async (id: string) => {
    if (!renameValue.trim()) return;
    await renameRoom(id, renameValue.trim());
    setRenamingRoom(null);
  };

  // ── Modal save ────────────────────────────────────────────

  const handleSaveTable = async (t: RestaurantTable) => {
    if (t.id) {
      await editTable(t);
    } else {
      await addTable({ ...t, pos_x: 60 + Math.random() * 400 | 0, pos_y: 60 + Math.random() * 400 | 0 });
    }
    setModal(undefined);
  };

  // ── Render ────────────────────────────────────────────────

  if (selectedTable) {
    return (
      <TableTicketPanel
        table={selectedTable}
        onClose={() => { setSelectedTable(null); load(); }}
        onPay={() => onTablePay(selectedTable.id)}
      />
    );
  }

  return (
    <main className="mt-16 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-surface">

      {/* ── Stats bar ───────────────────────────────────── */}
      <div className="flex gap-4 px-6 py-4 border-b border-outline-variant/10 shrink-0">
        <StatPill label="Libre"           value={libreCount}    color="text-secondary" sub={`${totalSeats} places dispo`} />
        <StatPill label="Occupé"          value={occupeCount}   color="text-error"     sub={`${occupeCount} table${occupeCount > 1 ? "s" : ""}`} />
        <StatPill label="Attente addition" value={additionCount} color="text-primary"   sub="En attente" />
        <StatPill label="Total tables"    value={tables.length} color="text-on-surface" sub={`${rooms.length} salle${rooms.length > 1 ? "s" : ""}`} />
      </div>

      {/* ── Room tabs + Edit toggle ──────────────────────── */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-outline-variant/10 shrink-0 gap-4">

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1">
          <RoomTab label="Toutes les salles" active={activeRoomId === "all"} onClick={() => setActiveRoomId("all")} />
          {rooms.map((room) => (
            <div key={room.id} className="flex items-center">
              {renamingRoom === room.id ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRenameRoom(room.id); if (e.key === "Escape") setRenamingRoom(null); }}
                    className="bg-surface-container text-sm px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-primary/40 w-32"
                  />
                  <button onClick={() => handleRenameRoom(room.id)} className="p-1 text-secondary hover:text-secondary/80"><Check size={14} /></button>
                  <button onClick={() => setRenamingRoom(null)} className="p-1 text-outline hover:text-on-surface"><X size={14} /></button>
                </div>
              ) : (
                <RoomTab
                  label={room.name}
                  active={activeRoomId === room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  onRename={editMode ? () => { setRenamingRoom(room.id); setRenameValue(room.name); } : undefined}
                  onDelete={editMode ? () => removeRoom(room.id) : undefined}
                />
              )}
            </div>
          ))}

          {/* Add room input */}
          {editMode && (
            addingRoom ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddRoom(); if (e.key === "Escape") { setAddingRoom(false); setNewRoomName(""); } }}
                  placeholder="Nom de la salle…"
                  className="bg-surface-container text-sm px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-primary/40 w-36"
                />
                <button onClick={handleAddRoom} className="p-1 text-secondary"><Check size={14} /></button>
                <button onClick={() => { setAddingRoom(false); setNewRoomName(""); }} className="p-1 text-outline"><X size={14} /></button>
              </div>
            ) : (
              <button
                onClick={() => setAddingRoom(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-outline hover:text-primary text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-surface-container-high transition-colors"
              >
                <Plus size={13} /> Salle
              </button>
            )
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {editMode && (
            <button
              onClick={() => setModal(null)}
              className="flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all"
            >
              <Plus size={14} /> Ajouter une table
            </button>
          )}
          <button
            onClick={() => setEditMode((v) => !v)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              editMode
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
            )}
          >
            <Settings2 size={14} />
            {editMode ? "Terminer l'édition" : "Modifier le plan"}
          </button>
        </div>
      </div>

      {/* ── Canvas ──────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div
          ref={canvasRef}
          className="relative"
          style={{
            width:  CANVAS_W,
            height: CANVAS_H,
            backgroundImage: "radial-gradient(rgba(229,226,225,0.07) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-outline text-sm uppercase tracking-widest animate-pulse">
              Chargement…
            </div>
          ) : visibleTables.length === 0 && !editMode ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-outline">
              <p className="text-sm font-bold uppercase tracking-widest">Aucune table dans cette salle</p>
              <p className="text-xs">Activez l'édition pour en ajouter.</p>
            </div>
          ) : (
            visibleTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                editMode={editMode}
                onMouseDown={(e) => handleTableMouseDown(e, table)}
                onEdit={() => setModal(table)}
                onDelete={() => removeTable(table.id)}
                onClick={() => setSelectedTable(table)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────── */}
      <div className="px-6 py-3 border-t border-outline-variant/10 flex items-center gap-8 shrink-0">
        {(["libre", "occupe", "addition"] as TableStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-sm", STATUS_COLOR[s].dot)} />
            <span className="text-xs text-outline font-medium">{STATUS_LABEL[s]}</span>
          </div>
        ))}
        {!editMode && (
          <span className="ml-auto text-[10px] text-outline/50 uppercase tracking-wide">
            Cliquer sur une table pour changer son statut
          </span>
        )}
      </div>

      {/* ── Modal ───────────────────────────────────────── */}
      {modal !== undefined && (
        <TableFormModal
          table={modal ?? undefined}
          rooms={rooms}
          defaultRoomId={activeRoomId !== "all" ? activeRoomId : rooms[0]?.id}
          onClose={() => setModal(undefined)}
          onSaved={handleSaveTable}
        />
      )}
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StatPill({ label, value, color, sub }: { label: string; value: number; color: string; sub: string }) {
  return (
    <div className="bg-surface-container-low px-4 py-3 rounded-xl flex-1 min-w-0">
      <p className="text-[10px] font-black text-outline uppercase tracking-widest truncate">{label}</p>
      <p className={cn("text-3xl font-black", color)}>{value}</p>
      <p className="text-[10px] text-outline/60 truncate">{sub}</p>
    </div>
  );
}

interface RoomTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}

function RoomTab({ label, active, onClick, onRename, onDelete }: RoomTabProps) {
  return (
    <div className={cn("flex items-center gap-1 rounded-lg transition-colors shrink-0", active ? "bg-surface-container-high" : "")}>
      <button
        onClick={onClick}
        className={cn(
          "px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors rounded-lg",
          active ? "text-primary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
        )}
      >
        {label}
      </button>
      {(onRename || onDelete) && (
        <div className="flex items-center pr-1 gap-0.5">
          {onRename && (
            <button onClick={onRename} className="p-0.5 text-outline hover:text-primary rounded transition-colors">
              <Pencil size={10} />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-0.5 text-outline hover:text-error rounded transition-colors">
              <X size={10} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
