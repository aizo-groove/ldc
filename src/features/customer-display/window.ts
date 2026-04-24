import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emit } from "@tauri-apps/api/event";

export const DISPLAY_LABEL = "customer-display";

export type DisplayItem = { name: string; qty: number; total: number };

export type DisplayPayload =
  | { type: "idle";     storeName: string }
  | { type: "cart";     storeName: string; items: DisplayItem[]; total: number }
  | { type: "thankyou"; storeName: string; total: number };

export async function openCustomerDisplayWindow(): Promise<void> {
  const existing = await WebviewWindow.getByLabel(DISPLAY_LABEL);
  if (existing) {
    await existing.setFocus();
    return;
  }
  new WebviewWindow(DISPLAY_LABEL, {
    url: "/#customer-display",
    title: "Écran client — LDC",
    width: 1280,
    height: 720,
    decorations: false,
    resizable: true,
    alwaysOnTop: false,
  });
}

export async function closeCustomerDisplayWindow(): Promise<void> {
  const win = await WebviewWindow.getByLabel(DISPLAY_LABEL);
  if (win) await win.close();
}

export const emitDisplay = (payload: DisplayPayload): Promise<void> =>
  emit("ldc:display", payload);
