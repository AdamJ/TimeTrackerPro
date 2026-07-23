import { check } from "@tauri-apps/plugin-updater";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";

const BACKOFF_STORAGE_KEY = "timetracker_update_backoff";
const BASE_BACKOFF_MS = 60 * 60 * 1000; // 1 hour
const MAX_BACKOFF_MS = 24 * 60 * 60 * 1000; // 24 hours

interface BackoffState {
  consecutiveFailures: number;
  lastFailureAt: number;
}

const EMPTY_BACKOFF_STATE: BackoffState = { consecutiveFailures: 0, lastFailureAt: 0 };

function readBackoffState(): BackoffState {
  try {
    const raw = localStorage.getItem(BACKOFF_STORAGE_KEY);
    if (!raw) return EMPTY_BACKOFF_STATE;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.consecutiveFailures === "number" && typeof parsed?.lastFailureAt === "number") {
      return parsed as BackoffState;
    }
  } catch {
    // corrupt/missing — treat as no prior failures
  }
  return EMPTY_BACKOFF_STATE;
}

function writeBackoffState(state: BackoffState): void {
  localStorage.setItem(BACKOFF_STORAGE_KEY, JSON.stringify(state));
}

function nextAllowedCheckAt(state: BackoffState): number {
  if (state.consecutiveFailures <= 0) return 0;
  const delay = Math.min(BASE_BACKOFF_MS * 2 ** (state.consecutiveFailures - 1), MAX_BACKOFF_MS);
  return state.lastFailureAt + delay;
}

async function promptDownloadAndInstall(version: string, update: { downloadAndInstall: () => Promise<void> }): Promise<void> {
  const shouldDownload = await ask(`Timetraked ${version} is available. Download it now?`, {
    title: "Update available",
    okLabel: "Download",
    cancelLabel: "Later",
  });
  if (!shouldDownload) return;

  await update.downloadAndInstall();

  const shouldRestart = await ask("Restart the app to apply the update?", {
    title: "Update ready",
    okLabel: "Restart Now",
    cancelLabel: "Later",
  });
  if (shouldRestart) await relaunch();
}

export async function checkForUpdatesSilent(): Promise<void> {
  const state = readBackoffState();
  if (Date.now() < nextAllowedCheckAt(state)) return;

  try {
    const update = await check();
    writeBackoffState(EMPTY_BACKOFF_STATE);
    if (!update) return;
    await promptDownloadAndInstall(update.version, update);
  } catch (error) {
    console.error("Auto-update check failed:", error);
    writeBackoffState({ consecutiveFailures: state.consecutiveFailures + 1, lastFailureAt: Date.now() });
  }
}

export async function checkForUpdatesManual(): Promise<void> {
  try {
    const update = await check();
    if (!update) {
      await message("You're running the latest version of Timetraked.", { title: "No updates available" });
      return;
    }
    writeBackoffState(EMPTY_BACKOFF_STATE);
    await promptDownloadAndInstall(update.version, update);
  } catch (error) {
    console.error("Manual update check failed:", error);
    await message("Could not check for updates. Please try again later.", { title: "Update check failed" });
  }
}
