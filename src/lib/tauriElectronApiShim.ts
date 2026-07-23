import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { checkForUpdatesManual, checkForUpdatesSilent } from "@/lib/tauriUpdater";

// Populates window.electronAPI with the same shape electron/preload.ts used
// to expose, so useElectronBackup.ts and useElectronMenuActions.ts work
// completely unchanged under Tauri. Only runs when the Tauri runtime is
// present (desktop build); no-ops on web/PWA where window.electronAPI stays
// undefined, same as it always has.
export function installTauriElectronApiShim(): void {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;

  window.electronAPI = {
    writeBackup: (json: string) => invoke("backup_write", { json }),
    listBackups: () => invoke("backup_list"),
    readBackup: (name: string) => invoke("backup_read", { name }),

    requestFlushBeforeQuit: (callback: () => void | Promise<void>) => {
      void listen("before-quit-flush", async () => {
        try {
          await callback();
        } finally {
          await invoke("before_quit_flush_done");
        }
      });
    },

    onMenuAction: (callback: (action: string) => void) => {
      let unlisten: (() => void) | undefined;
      void listen<string>("menu:action", (event) => {
        if (event.payload === "check-updates") {
          void checkForUpdatesManual();
          return;
        }
        callback(event.payload);
      }).then((fn) => {
        unlisten = fn;
      });
      return () => unlisten?.();
    },
  };

  if (import.meta.env.PROD) {
    void checkForUpdatesSilent();
  }
}
