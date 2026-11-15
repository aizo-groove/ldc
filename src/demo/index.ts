/**
 * Mode démo web.
 *
 * Dans un navigateur (déploiement Vercel), il n'y a pas de backend Tauri :
 * on branche un backend en mémoire via `mockIPC` pour que la caisse soit
 * utilisable. Rien n'est enregistré, et ce n'est pas une caisse NF525.
 */

/** Vrai hors de Tauri. Calculé avant l'installation du mock, qui crée `__TAURI_INTERNALS__`. */
export const IS_DEMO = typeof window !== "undefined" && !("__TAURI_INTERNALS__" in window);

export const DOWNLOAD_URL = "https://github.com/aizo-groove/ldc/releases/latest";

export async function installDemoBackend(): Promise<void> {
  const [{ mockIPC, mockWindows }, { handle }] = await Promise.all([
    import("@tauri-apps/api/mocks"),
    import("./backend"),
  ]);
  mockWindows("main");
  mockIPC(handle, { shouldMockEvents: true });
}
