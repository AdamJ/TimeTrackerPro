import { autoUpdater } from "electron-updater";
import { BrowserWindow, dialog } from "electron";

let initialized = false;

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
// DMG/NSIS artifacts to) and, when a newer version is found, downloads it
// in the background and prompts to restart once ready.
export function initAutoUpdater(): void {
	if (initialized) return;
	initialized = true;

	autoUpdater.autoDownload = true;
	autoUpdater.autoInstallOnAppQuit = true;

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
	});

	void autoUpdater.checkForUpdatesAndNotify();
}

// Manual "Check for Updates…" menu action — same feed as the silent
// startup check, but always tells the user the result.
export function checkForUpdates(): void {
	autoUpdater
		.checkForUpdates()
		.then((result) => {
			if (!result?.downloadPromise) {
				const win = focusedOrFirstWindow();
				void showMessageBox(win, {
					type: "info",
					title: "No updates available",
					message: "You're running the latest version of Timetraked.",
				});
			}
		})
		.catch((error) => {
			console.error("Manual update check failed:", error);
			const win = focusedOrFirstWindow();
			void showMessageBox(win, {
				type: "error",
				title: "Update check failed",
				message: "Could not check for updates. Please try again later.",
			});
		});
}
