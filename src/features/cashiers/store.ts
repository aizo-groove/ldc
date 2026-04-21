import { create } from "zustand";
import type { Cashier } from "@/types/cashier";
import { listCashiers, createCashier, updateCashier, deleteCashier } from "@/lib/tauri";

interface CashiersStore {
  cashiers: Cashier[];
  isLoading: boolean;
  load: () => Promise<void>;
  add: (name: string, pin: string | null, role: string) => Promise<Cashier>;
  update: (id: string, name: string, pin: string | null, role: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useCashiersStore = create<CashiersStore>((set) => ({
  cashiers: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true });
    const cashiers = await listCashiers();
    set({ cashiers, isLoading: false });
  },

  add: async (name, pin, role) => {
    const cashier = await createCashier(name, pin, role);
    set((s) => ({ cashiers: [...s.cashiers, cashier] }));
    return cashier;
  },

  update: async (id, name, pin, role) => {
    const updated = await updateCashier(id, name, pin, role);
    set((s) => ({ cashiers: s.cashiers.map((c) => (c.id === id ? updated : c)) }));
  },

  remove: async (id) => {
    await deleteCashier(id);
    set((s) => ({ cashiers: s.cashiers.filter((c) => c.id !== id) }));
  },
}));
