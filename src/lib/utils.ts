import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge de classes Tailwind sans conflits */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formate un montant en centimes vers une chaîne €.
 * 1250 → "12,50 €"
 */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/**
 * Calcule le prix HT depuis un prix TTC et un taux TVA.
 * rate_pct est en centièmes de % : 20% → 2000
 * Arrondi à l'entier le plus proche (centimes).
 */
export function computePriceHt(price_ttc: number, rate_pct: number): number {
  return Math.round((price_ttc * 10000) / (10000 + rate_pct));
}

/**
 * Calcule le montant de TVA sur un prix TTC.
 */
export function computeTva(price_ttc: number, rate_pct: number): number {
  return price_ttc - computePriceHt(price_ttc, rate_pct);
}
