import { create } from "zustand";

interface TutorialStore {
  pending: boolean;
  setPending: (v: boolean) => void;
}

export const useTutorialStore = create<TutorialStore>((set) => ({
  pending: false,
  setPending: (v) => set({ pending: v }),
}));
