import { autoUpdater } from "electron-updater";
import { app, BrowserWindow, dialog } from "electron";
import fs from "fs/promises";
import path from "path";

let initialized = false;

const BASE_BACKOFF_MS = 60 * 60 * 1000; // 1 hour
const MAX_BACKOFF_MS = 24 * 60 * 60 * 1000; // 24 hours

interface BackoffState {
	consecutiveFailures: number;
	lastFailureAt: number;
}

const EMPTY_BACKOFF_STATE: BackoffState = { consecutiveFailures: 0, lastFailureAt: 0 };

function backoffStateFile(): string {
	return path.join(app.getPath("userData"), "update-check-state.json");
}

// Persisted to disk (not module state) because consecutive-failure tracking
// must survive app relaunches — a persistent network outage would otherwise
// retry, and fail, on every single startup forever.
async function readBackoffState(): Promise<BackoffState> {
	try {
		const raw = await fs.readFile(backoffStateFile(), "utf-8");
		const parsed = JSON.parse(raw);
		if (typeof parsed?.consecutiveFailures === "number" && typeof parsed?.lastFailureAt === "number") {
			return parsed as BackoffState;
		}
	} catch {
		// No state file yet, or it's corrupt — treat as no prior failures.
	}
	return EMPTY_BACKOFF_STATE;
}

async function writeBackoffState(state: BackoffState): Promise<void> {
	await fs.writeFile(backoffStateFile(), JSON.stringify(state), "utf-8").catch((error) => {
		console.error("Failed to persist update-check backoff state:", error);
	});
}

// Backoff doubles per consecutive failure, capped at MAX_BACKOFF_MS.
function nextAllowedCheckAt(state: BackoffState): number {
	if (state.consecutiveFailures <= 0) return 0;
	const delay = Math.min(BASE_BACKOFF_MS * 2 ** (state.consecutiveFailures - 1), MAX_BACKOFF_MS);
	return state.lastFailureAt + delay;
}

function focusedOrFirstWindow(): BrowserWindow | undefined {
	return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
}

// dialog.showMessageBox's window argument can't be passed as `undefined` —
// the overload requires either omitting it or a real BrowserWindow/BaseWindow.
function showMessageBox(
	win: BrowserWindow | undefined,
	options: Electron.MessageBoxOptions,
): Promise<Electron.MessageBoxReturnValue> {
	return win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options);
}

// Checks GitHub Releases (the same target electron-release.yml publishes
// DMG/NSIS artifacts to). Builds are unsigned (no electron-builder signing
// config — see AGENTS.md Electron section / issue #220), so downloading is
// gated on explicit user consent rather than happening automatically.
export function initAutoUpdater(): void {
	if (initialized) return;
	initialized = true;

	autoUpdater.autoDownload = false;
	autoUpdater.autoInstallOnAppQuit = true;

	autoUpdater.on("update-available", (info) => {
		const win = focusedOrFirstWindow();
		void showMessageBox(win, {
			type: "info",
			buttons: ["Download", "Later"],
			defaultId: 0,
			cancelId: 1,
			title: "Update available",
			message: `Timetraked ${info.version} is available.`,
			detail: "Download it now? Builds are unsigned, so only download updates you trust.",
		}).then(({ response }) => {
			if (response === 0) void autoUpdater.downloadUpdate();
		});
	});

	autoUpdater.on("update-downloaded", (info) => {
		const win = focusedOrFirstWindow();
		void showMessageBox(win, {
			type: "info",
			buttons: ["Restart Now", "Later"],
			defaultId: 0,
			cancelId: 1,
			title: "Update ready",
			message: `Timetraked ${info.version} has been downloaded.`,
			detail: "Restart the app to apply the update.",
		}).then(({ response }) => {
			if (response === 0) autoUpdater.quitAndInstall();
		});
	});

	autoUpdater.on("error", (error) => {
		console.error("Auto-update check failed:", error);
		void readBackoffState().then((state) =>
			writeBackoffState({
				consecutiveFailures: state.consecutiveFailures + 1,
				lastFailureAt: Date.now(),
			}),
		);
	});

	void readBackoffState().then((state) => {
		const allowedAt = nextAllowedCheckAt(state);
		if (Date.now() < allowedAt) {
			console.log(`Skipping startup update check; backed off until ${new Date(allowedAt).toISOString()}`);
			return;
		}
		autoUpdater
			.checkForUpdates()
			.then(() => writeBackoffState(EMPTY_BACKOFF_STATE))
			.catch(() => undefined); // already logged + recorded via the "error" listener above
	});
}

// Manual "Check for Updates…" menu action — same feed as the silent startup
// check, but always tells the user the result, and bypasses backoff since
// it's a deliberate user action rather than an automatic retry. "update-not-available"
// is the only outcome the persistent listeners above don't already report on.
export function checkForUpdates(): void {
	const onNotAvailable = () => {
		const win = focusedOrFirstWindow();
		void showMessageBox(win, {
			type: "info",
			title: "No updates available",
			message: "You're running the latest version of Timetraked.",
		});
	};

	autoUpdater.once("update-not-available", onNotAvailable);

	autoUpdater
		.checkForUpdates()
		.then(() => {
			void writeBackoffState(EMPTY_BACKOFF_STATE);
		})
		.catch((error) => {
			console.error("Manual update check failed:", error);
			const win = focusedOrFirstWindow();
			void showMessageBox(win, {
				type: "error",
				title: "Update check failed",
				message: "Could not check for updates. Please try again later.",
			});
		})
		.finally(() => {
			autoUpdater.removeListener("update-not-available", onNotAvailable);
		});
}
