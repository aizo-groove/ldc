import { create } from "zustand";
import { getSetting, updateSetting } from "@/lib/tauri";
import type { BusinessProfile, FeatureFlags } from "@/types/settings";
import { PROFILE_FLAGS } from "@/types/settings";

interface SettingsStore {
  profile: BusinessProfile;
  flags: FeatureFlags;
  isLoading: boolean;
  init: () => Promise<void>;
  setProfile: (profile: BusinessProfile) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  profile: "restaurant",
  flags: PROFILE_FLAGS["restaurant"],
  isLoading: false,

  init: async () => {
    set({ isLoading: true });
    const value = await getSetting("business_profile");
    const profile: BusinessProfile =
      value === "commerce" || value === "cafe" || value === "restaurant"
        ? value
        : "restaurant";
    set({ profile, flags: PROFILE_FLAGS[profile], isLoading: false });
  },

  setProfile: async (profile) => {
    await updateSetting("business_profile", profile);
    set({ profile, flags: PROFILE_FLAGS[profile] });
  },
}));
