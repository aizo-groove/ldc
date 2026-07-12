export type LoyaltyProgramType = "points" | "stamps" | "cashback" | "tiers" | "visits";

export interface LoyaltyConfig {
  fido_mid:            string | null;  // UUID merchants.id — identifiant marchand
  fido_partner_id:     string | null;  // credential de provisioning Fido — 32 hex chars (16 bytes) — QR frame header
  fido_partner_secret: string | null;  // shared secret for API auth
  fido_private_key:    string | null;  // Ed25519 PKCS#8 PEM — signs QR payloads
  fido_api_url:        string | null;
  fido_enabled:        boolean;
}

// Per-type config shapes

export interface PointsConfig {
  points_per_euro:      number;
  minimum_spend_cents:  number;
  rewards: { id: string; label: string; cost: number }[];
}

export interface StampsConfig {
  stamps_required:      number;
  minimum_spend_cents:  number;
  reward_label:         string;
}

export interface CashbackConfig {
  cashback_rate_pct:    number;   // e.g. 5 = 5%
  minimum_spend_cents:  number;
}

export interface TiersConfig {
  xp_per_euro:   number;
  tiers: {
    name:      string;   // "Bronze" | "Silver" | "Gold"
    xp_min:    number;
    reward:    string;
  }[];
}

export interface VisitsConfig {
  visits_required:      number;
  minimum_spend_cents:  number;
  reward_label:         string;
}

export type ProgramConfig =
  | PointsConfig
  | StampsConfig
  | CashbackConfig
  | TiersConfig
  | VisitsConfig;

export interface LoyaltyProgram {
  id:           string;
  mid:          string;
  name:         string;
  type:         LoyaltyProgramType;
  status:       "draft" | "active" | "archived";
  config:       ProgramConfig;
  synced_at:    string | null;
  created_at:   string;
  updated_at:   string;
}

export interface LoyaltyProgramInput {
  name:   string;
  type:   LoyaltyProgramType;
  config: ProgramConfig;
}

// Metadata for the type picker UI
export const PROGRAM_TYPE_META: Record<LoyaltyProgramType, { label: string; sub: string; emoji: string }> = {
  points:   { emoji: "⭐", label: "Points",    sub: "Chaque euro rapporte des points" },
  stamps:   { emoji: "🎫", label: "Tampons",   sub: "Achetez N fois, la suivante est offerte" },
  cashback: { emoji: "💰", label: "Cashback",  sub: "Un % de chaque achat est remboursé" },
  tiers:    { emoji: "🏆", label: "Niveaux",   sub: "Bronze, Silver, Gold selon le total dépensé" },
  visits:   { emoji: "📍", label: "Visites",   sub: "Récompense à la Nème visite" },
};

export interface LoyaltyQrResult {
  payload_b64url: string;
  prog_id:        string;
  prog_type:      string;
  earned:         number;
}

export interface RctInfo {
  reward_type:  string;
  reward_value: number;
  prog_id:      string;
  cid:          string;
  tid:          string;
  expires_at:   string;
}

export const DEFAULT_CONFIG: Record<LoyaltyProgramType, ProgramConfig> = {
  points:   { points_per_euro: 10, minimum_spend_cents: 0, rewards: [] },
  stamps:   { stamps_required: 10, minimum_spend_cents: 0, reward_label: "1 offert" },
  cashback: { cashback_rate_pct: 5, minimum_spend_cents: 0 },
  tiers:    { xp_per_euro: 1, tiers: [
    { name: "Bronze", xp_min: 0,    reward: "5% de réduction" },
    { name: "Silver", xp_min: 200,  reward: "10% de réduction" },
    { name: "Gold",   xp_min: 500,  reward: "15% de réduction" },
  ]},
  visits:   { visits_required: 10, minimum_spend_cents: 0, reward_label: "1 offert" },
};
