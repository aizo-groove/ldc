/**
 * Notes en attente : paniers de la Vente mis de côté pour servir le client suivant.
 *
 * Une note reprise reste en base tant qu'elle n'est pas encaissée (rien n'est
 * perdu si l'app redémarre) ; elle est simplement masquée de la liste.
 */
import { create } from "zustand";
import { deleteHeldOrder, listHeldOrders, renameHeldOrder, saveHeldOrder } from "@/lib/tauri";
import type { OpenOrderFull, OpenOrderLineInput } from "@/types/open_order";
import { useCartStore, type CartItem } from "./store";

export interface ActiveHeld {
  id: string;
  held_no: number | null;
  label: string | null;
}

interface HeldStore {
  notes: OpenOrderFull[];
  /** Note actuellement reprise dans le panier */
  active: ActiveHeld | null;
  load: () => Promise<void>;
  /** Met le panier en attente (garde le numéro si c'est une note reprise) et le vide. */
  hold: (sessionId: string | null) => Promise<void>;
  /** Reprend une note. Un panier non vide est d'abord mis en attente à sa place. */
  resume: (note: OpenOrderFull, sessionId: string | null) => Promise<void>;
  rename: (id: string, label: string | null) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Après encaissement ou abandon du panier : supprime la note reprise. */
  closeActive: () => Promise<void>;
}

const toLines = (items: CartItem[]): OpenOrderLineInput[] =>
  items.map((i) => ({
    product_id: i.product_id,
    product_name: i.product_name,
    product_sku: i.product_sku,
    quantity: i.quantity,
    unit_price_ttc: i.unit_price_ttc,
    unit_price_ht: i.unit_price_ht,
    tva_rate_pct: i.tva_rate_pct,
    discount_ttc: i.discount_ttc,
    sent_qty: 0,
  }));

export const useHeldStore = create<HeldStore>((set, get) => ({
  notes: [],
  active: null,

  load: async () => {
    const notes = await listHeldOrders().catch(() => []);
    set({ notes });
  },

  hold: async (sessionId) => {
    const cart = useCartStore.getState();
    if (cart.items.length === 0) return;
    const { active } = get();
    await saveHeldOrder(active?.id ?? null, sessionId, active?.label ?? null, toLines(cart.items));
    cart.clear();
    set({ active: null });
    await get().load();
  },

  resume: async (note, sessionId) => {
    if (useCartStore.getState().items.length > 0) await get().hold(sessionId);
    useCartStore.getState().loadFromOrderLines(note.lines);
    set({ active: { id: note.order.id, held_no: note.order.held_no, label: note.order.label } });
  },

  rename: async (id, label) => {
    await renameHeldOrder(id, label);
    const clean = label?.trim() || null;
    set((s) => ({ active: s.active?.id === id ? { ...s.active, label: clean } : s.active }));
    await get().load();
  },

  remove: async (id) => {
    await deleteHeldOrder(id);
    set((s) => ({ active: s.active?.id === id ? null : s.active }));
    await get().load();
  },

  closeActive: async () => {
    const { active } = get();
    if (!active) return;
    set({ active: null });
    await deleteHeldOrder(active.id).catch(() => {});
    await get().load();
  },
}));
