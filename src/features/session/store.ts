import { create } from "zustand";
import type { Session } from "@/types/session";
import type { Cashier } from "@/types/cashier";
import { getActiveSession, openSession, closeSession as apiCloseSession } from "@/lib/tauri";

interface SessionStore {
  session: Session | null;
  cashier: Cashier | null;
  isLoading: boolean;
  error: string | null;

  /** Vérifie s'il y a une session active. Ne crée pas de session automatiquement. */
  init: () => Promise<void>;

  /** Ouvre une nouvelle session pour le caissier donné. */
  openForCashier: (cashier: Cashier, openingFloat?: number) => Promise<void>;

  /** Clôture la session courante. */
  close: () => Promise<Session>;

  /** Change de caissier sans fermer la session. */
  switchCashier: (cashier: Cashier) => void;

  /** Efface le caissier actif pour revenir à l'écran de sélection. */
  clearCashier: () => void;

  /** Réinitialise après clôture (revient à l'écran de sélection). */
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  cashier: null,
  isLoading: false,
  error: null,

  init: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await getActiveSession();
      // S'il y a une session active sans caissier connu, on la charge quand même.
      // L'App.tsx décidera d'afficher l'écran de sélection si cashier est null.
      set({ session: session ?? null, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  openForCashier: async (cashier, openingFloat = 0) => {
    set({ isLoading: true, error: null });
    try {
      let session = await getActiveSession();
      if (!session) {
        session = await openSession(openingFloat, undefined, cashier.id, "main");
      }
      set({ session, cashier, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  close: async () => {
    const { session } = get();
    if (!session) throw new Error("Aucune session active");
    const closed = await apiCloseSession(session.id);
    set({ session: null, cashier: null });
    return closed;
  },

  switchCashier: (cashier) => set({ cashier }),
  clearCashier: () => set({ cashier: null }),

  reset: () => set({ session: null, cashier: null, error: null }),
}));
