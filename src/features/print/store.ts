import { create } from "zustand";
import type { PrintJob } from "./types";

interface PrintStore {
  job: PrintJob | null;
  trigger: (job: PrintJob) => void;
  clear:   () => void;
}

export const usePrintStore = create<PrintStore>((set) => ({
  job:     null,
  trigger: (job) => set({ job }),
  clear:   () => set({ job: null }),
}));
