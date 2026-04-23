import { create } from "zustand";
import { getSetting, updateSetting } from "@/lib/tauri";
import type { BusinessProfile, FeatureFlags } from "@/types/settings";
import { PROFILE_FLAGS } from "@/types/settings";

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
      profileVal === "commerce" || profileVal === "cafe" || profileVal === "restaurant"
        ? profileVal
        : "restaurant";
    const theme: Theme = themeVal === "light" ? "light" : "dark";
    applyTheme(theme);
    set({ profile, flags: PROFILE_FLAGS[profile], theme, isLoading: false });
  },

  setProfile: async (profile) => {
    await updateSetting("business_profile", profile);
    set({ profile, flags: PROFILE_FLAGS[profile] });
  },

  setTheme: async (theme) => {
    await updateSetting("theme", theme);
    applyTheme(theme);
    set({ theme });
  },
}));
