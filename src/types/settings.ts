export type BusinessProfile = "restaurant" | "cafe" | "commerce" | "custom";

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
  custom: {
    hasSplitBill: false,
    hasTableManagement: false,
    hasStockAlerts: false,
    hasBarcodeScanning: false,
  },
};

export const FLAG_META: Record<keyof FeatureFlags, { label: string; description: string }> = {
  hasSplitBill: {
    label: "Partage de l'addition",
    description: "Divise un ticket entre plusieurs personnes ou modes de paiement.",
  },
  hasTableManagement: {
    label: "Gestion des tables",
    description: "Active le plan de salle et les tickets par table.",
  },
  hasStockAlerts: {
    label: "Alertes de rupture de stock",
    description: "Signale les produits en quantité insuffisante.",
  },
  hasBarcodeScanning: {
    label: "Scan codes-barres",
    description: "Recherche et ajoute les produits par code EAN.",
  },
};
