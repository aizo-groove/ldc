import { create } from "zustand";
import type { LoyaltyConfig, LoyaltyProgram } from "@/types/loyalty";
import {
  getLoyaltyConfig,
  saveLoyaltyConfig,
  testLoyaltyConnection,
  getCachedProgram,
  saveLoyaltyProgram,
  deleteLocalProgram,
} from "@/lib/tauri";
import type { LoyaltyProgramInput } from "@/types/loyalty";

type ConnectionStatus = "idle" | "testing" | "ok" | "error";

interface LoyaltyState {
  config:           LoyaltyConfig | null;
  program:          LoyaltyProgram | null;
  connectionStatus: ConnectionStatus;
  connectionError:  string | null;
  saving:           boolean;
  saveError:        string | null;

  load:             () => Promise<void>;
  updateConfig:     (patch: Partial<LoyaltyConfig>) => void;
  persistConfig:    () => Promise<void>;
  testConnection:   () => Promise<void>;
  loadProgram:      () => Promise<void>;
  persistProgram:   (input: LoyaltyProgramInput) => Promise<void>;
  clearProgram:     () => void;
}

const EMPTY_CONFIG: LoyaltyConfig = {
  fido_mid:            null,
  fido_partner_id:     null,
  fido_partner_secret: null,
  fido_private_key:    null,
  fido_api_url:        null,
  fido_enabled:        false,
};

export const useLoyaltyStore = create<LoyaltyState>((set, get) => ({
  config:           null,
  program:          null,
  connectionStatus: "idle",
  connectionError:  null,
  saving:           false,
  saveError:        null,

  load: async () => {
    const [config, program] = await Promise.all([
      getLoyaltyConfig().catch(() => EMPTY_CONFIG),
      getCachedProgram().catch(() => null),
    ]);
    set({ config, program });
  },

  updateConfig: (patch) =>
    set((s) => ({
      config: { ...(s.config ?? EMPTY_CONFIG), ...patch },
      connectionStatus: "idle",
      connectionError: null,
    })),

  persistConfig: async () => {
    const { config } = get();
    if (!config) return;
    set({ saving: true, saveError: null });
    try {
      await saveLoyaltyConfig(config);
    } catch (e) {
      set({ saveError: String(e) });
    } finally {
      set({ saving: false });
    }
  },

  testConnection: async () => {
    const { config } = get();
    if (!config) return;
    set({ connectionStatus: "testing", connectionError: null, saving: true, saveError: null });
    try {
      await saveLoyaltyConfig(config);
      await testLoyaltyConnection();
      set({ connectionStatus: "ok" });
    } catch (e) {
      set({ connectionStatus: "error", connectionError: String(e) });
    } finally {
      set({ saving: false });
    }
  },

  loadProgram: async () => {
    const program = await getCachedProgram().catch(() => null);
    set({ program });
  },

  persistProgram: async (input) => {
    set({ saving: true, saveError: null });
    try {
      const program = await saveLoyaltyProgram(input);
      set({ program });
    } catch (e) {
      set({ saveError: String(e) });
    } finally {
      set({ saving: false });
    }
  },

  clearProgram: () => {
    deleteLocalProgram().catch(() => {});
    set({ program: null, saveError: null });
  },
}));
