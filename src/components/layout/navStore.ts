import { create } from "zustand";

interface NavStore {
  collapsed:      boolean;
  settingsTab:    string | null;
  toggle:         () => void;
  setSettingsTab: (tab: string | null) => void;
}

const STORAGE_KEY = "nav-collapsed";

export const useNavStore = create<NavStore>((set) => ({
  collapsed:      localStorage.getItem(STORAGE_KEY) === "1",
  settingsTab:    null,
  toggle: () =>
    set((s) => {
      const next = !s.collapsed;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return { collapsed: next };
    }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),
}));
