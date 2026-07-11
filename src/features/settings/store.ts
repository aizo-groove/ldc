import { create } from "zustand";
import { getSetting, updateSetting } from "@/lib/tauri";
import type { BusinessProfile, FeatureFlags } from "@/types/settings";
import { PROFILE_FLAGS } from "@/types/settings";

async function loadCustomFlags(): Promise<FeatureFlags> {
  const keys = Object.keys(PROFILE_FLAGS.custom) as (keyof FeatureFlags)[];
  const values = await Promise.all(keys.map((k) => getSetting(`feature_${k}`)));
  const flags = { ...PROFILE_FLAGS.custom };
  keys.forEach((k, i) => { if (values[i] !== null) flags[k] = values[i] === "true"; });
  return flags;
}

export type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

interface SettingsStore {
  profile: BusinessProfile;
  flags: FeatureFlags;
  theme: Theme;
  isLoading: boolean;
  init: () => Promise<void>;
  setProfile: (profile: BusinessProfile) => Promise<void>;
  setFlag: (key: keyof FeatureFlags, value: boolean) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  profile: "restaurant",
  flags: PROFILE_FLAGS["restaurant"],
  theme: "dark",
  isLoading: false,

  init: async () => {
    set({ isLoading: true });
    const [profileVal, themeVal] = await Promise.all([
      getSetting("business_profile"),
      getSetting("theme"),
    ]);
    const profile: BusinessProfile =
      profileVal === "commerce" || profileVal === "cafe" || profileVal === "restaurant" || profileVal === "custom"
        ? profileVal
        : "restaurant";
    const flags = profile === "custom" ? await loadCustomFlags() : PROFILE_FLAGS[profile];
    const theme: Theme = themeVal === "light" ? "light" : "dark";
    applyTheme(theme);
    set({ profile, flags, theme, isLoading: false });
  },

  setProfile: async (profile) => {
    await updateSetting("business_profile", profile);
    const flags = profile === "custom" ? await loadCustomFlags() : PROFILE_FLAGS[profile];
    set({ profile, flags });
  },

  setFlag: async (key, value) => {
    await updateSetting(`feature_${key}`, value ? "true" : "false");
    set((s) => ({ flags: { ...s.flags, [key]: value } }));
  },

  setTheme: async (theme) => {
    await updateSetting("theme", theme);
    applyTheme(theme);
    set({ theme });
  },
}));
