import { create } from "zustand";
import type { Room, RestaurantTable, TableStatus } from "@/types/table";
import {
  listRooms, createRoom, updateRoom, deleteRoom,
  listTables, createTable, updateTable,
  updateTableStatus, updateTablePosition, deleteTable,
} from "@/lib/tauri";

interface TablesStore {
  rooms: Room[];
  tables: RestaurantTable[];
  isLoading: boolean;

  load: () => Promise<void>;

  addRoom: (name: string) => Promise<void>;
  renameRoom: (id: string, name: string) => Promise<void>;
  removeRoom: (id: string) => Promise<void>;

  addTable: (table: RestaurantTable) => Promise<void>;
  editTable: (table: RestaurantTable) => Promise<void>;
  removeTable: (id: string) => Promise<void>;
  cycleStatus: (id: string) => Promise<void>;

  /** Optimistic local move — call persistPosition on drag end */
  moveLocal: (id: string, x: number, y: number) => void;
  persistPosition: (id: string) => Promise<void>;
}

const NEXT_STATUS: Record<TableStatus, TableStatus> = {
  libre:    "occupe",
  occupe:   "addition",
  addition: "libre",
};

export const useTablesStore = create<TablesStore>((set, get) => ({
  rooms: [],
  tables: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true });
    const [rooms, tables] = await Promise.all([listRooms(), listTables()]);
    set({ rooms, tables, isLoading: false });
  },

  addRoom: async (name) => {
    const room = await createRoom(name);
    set((s) => ({ rooms: [...s.rooms, room] }));
  },

  renameRoom: async (id, name) => {
    const updated = await updateRoom(id, name);
    set((s) => ({ rooms: s.rooms.map((r) => (r.id === id ? updated : r)) }));
  },

  removeRoom: async (id) => {
    await deleteRoom(id);
    set((s) => ({
      rooms: s.rooms.filter((r) => r.id !== id),
      tables: s.tables.map((t) => t.room_id === id ? { ...t, room_id: null } : t),
    }));
  },

  addTable: async (table) => {
    const created = await createTable(table);
    set((s) => ({ tables: [...s.tables, created] }));
  },

  editTable: async (table) => {
    const updated = await updateTable(table);
    set((s) => ({ tables: s.tables.map((t) => (t.id === table.id ? updated : t)) }));
  },

  removeTable: async (id) => {
    await deleteTable(id);
    set((s) => ({ tables: s.tables.filter((t) => t.id !== id) }));
  },

  cycleStatus: async (id) => {
    const table = get().tables.find((t) => t.id === id);
    if (!table) return;
    const next = NEXT_STATUS[table.status as TableStatus] ?? "libre";
    await updateTableStatus(id, next);
    set((s) => ({
      tables: s.tables.map((t) => (t.id === id ? { ...t, status: next } : t)),
    }));
  },

  moveLocal: (id, x, y) => {
    set((s) => ({
      tables: s.tables.map((t) => (t.id === id ? { ...t, pos_x: x, pos_y: y } : t)),
    }));
  },

  persistPosition: async (id) => {
    const table = get().tables.find((t) => t.id === id);
    if (!table) return;
    await updateTablePosition(id, table.pos_x, table.pos_y);
  },
}));
