/** True när appen körs som Tauri-skrivbordsapp (annars i webbläsaren). */
export function isDesktopApp() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let pendingUpdate = null;

/**
 * Frågar GitHub Releases (via Tauri-uppdateraren) efter en nyare version.
 * Returnerar { status: "web" | "current" | "available" | "error", version?, error? }
 */
export async function checkDesktopUpdate() {
  if (!isDesktopApp()) return { status: "web" };

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) {
      pendingUpdate = null;
      return { status: "current" };
    }
    pendingUpdate = update;
    return { status: "available", version: update.version, notes: update.body ?? "" };
  } catch (error) {
    pendingUpdate = null;
    return { status: "error", error: error?.message || String(error) };
  }
}

/** Laddar ner, installerar och startar om appen. */
export async function installDesktopUpdate() {
  if (!pendingUpdate) return false;
  await pendingUpdate.downloadAndInstall();
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
  return true;
}
