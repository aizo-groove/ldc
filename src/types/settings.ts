export type BusinessProfile = "restaurant" | "cafe" | "commerce";

export interface FeatureFlags {
  hasSplitBill: boolean;
  hasTableManagement: boolean;
  hasStockAlerts: boolean;
  hasBarcodeScanning: boolean;
}

export const PROFILE_FLAGS: Record<BusinessProfile, FeatureFlags> = {
  restaurant: {
    hasSplitBill: true,
    hasTableManagement: true,
    hasStockAlerts: false,
    hasBarcodeScanning: false,
  },
  cafe: {
    hasSplitBill: true,
    hasTableManagement: false,
    hasStockAlerts: false,
    hasBarcodeScanning: false,
  },
  commerce: {
    hasSplitBill: false,
    hasTableManagement: false,
    hasStockAlerts: true,
    hasBarcodeScanning: true,
  },
};
