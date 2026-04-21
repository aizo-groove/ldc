import { create } from "zustand";

interface NavStore {
  collapsed: boolean;
  toggle: () => void;
}

const STORAGE_KEY = "nav-collapsed";

export const useNavStore = create<NavStore>((set) => ({
  collapsed: localStorage.getItem(STORAGE_KEY) === "1",
  toggle: () =>
    set((s) => {
      const next = !s.collapsed;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return { collapsed: next };
    }),
}));
