import { app, BrowserWindow, session, protocol, net, ipcMain } from "electron";
import path from "path";
import { pathToFileURL } from "url";
import fs from "fs/promises";
import { buildApplicationMenu } from "./menu";
import { initAutoUpdater } from "./updater";

const isDev = process.env.NODE_ENV === "development" || process.env.ELECTRON_DEV === "true";

const MAX_BACKUPS = 20;
const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const QUIT_FLUSH_TIMEOUT_MS = 3000;

let mainWindow: BrowserWindow | null = null;
let isQuittingForReal = false;
let quitFlushPending = false;

function getBackupsDir(): string {
	return path.join(app.getPath("userData"), "backups");
}

async function pruneOldBackups(): Promise<void> {
	const dir = getBackupsDir();
	const entries = await fs.readdir(dir).catch(() => [] as string[]);
	const backupFiles = entries.filter((name) => name.startsWith("backup_") && name.endsWith(".json")).sort();
	const toDelete = backupFiles.slice(0, Math.max(0, backupFiles.length - MAX_BACKUPS));
	await Promise.all(toDelete.map((name) => fs.unlink(path.join(dir, name)).catch(() => undefined)));
}

async function writeBackupFile(json: string): Promise<void> {
	const dir = getBackupsDir();
	await fs.mkdir(dir, { recursive: true });
	// Filename is always generated here, never from renderer input.
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const filePath = path.join(dir, `backup_${timestamp}.json`);
	await fs.writeFile(filePath, json, "utf-8");
	await pruneOldBackups();
}

ipcMain.handle("backup:write", async (_event, json: unknown) => {
	if (typeof json !== "string" || json.length === 0 || json.length > MAX_BACKUP_BYTES) {
		return { ok: false, error: "Invalid backup payload" };
	}
	try {
		await writeBackupFile(json);
		return { ok: true };
	} catch (error) {
		console.error("Failed to write backup file:", error);
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
});

// Register custom protocol for production SPA routing (BrowserRouter requires path-based URLs)
// Must be registered before app is ready
if (!isDev) {
	protocol.registerSchemesAsPrivileged([
		{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
	]);
}

function createWindow(): void {
	// Reset per-window-lifecycle flush state — macOS can reopen a window
	// (via "activate") after the previous one quit-flushed and closed.
	isQuittingForReal = false;
	quitFlushPending = false;

	const win = new BrowserWindow({
		width: 1280,
		height: 800,
		minWidth: 800,
		minHeight: 600,
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			preload: path.join(__dirname, "preload.cjs"),
		},
	});

	mainWindow = win;
	win.on("close", (event) => {
		if (isQuittingForReal) return;

		event.preventDefault();
		beginQuitFlush(win);
	});
	win.on("closed", () => {
		if (mainWindow === win) mainWindow = null;
	});

	session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
		callback({
			responseHeaders: {
				...details.responseHeaders,
				"Content-Security-Policy": [
					"default-src 'self' app: data: https://*.supabase.co; " +
					"script-src 'self'; " +
					"style-src 'self' 'unsafe-inline'; " +
					"img-src 'self' app: data: blob: https:; " +
					"connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
				],
			},
		});
	});

	if (isDev) {
		win.loadURL("http://localhost:8080");
	} else {
		// Production: serve via custom protocol so BrowserRouter path-routing works
		win.loadURL("app://localhost/");
	}
}

app.whenReady().then(() => {
	if (!isDev) {
		// Serve dist/ via app:// so BrowserRouter's pushState URLs resolve correctly
		protocol.handle("app", (request) => {
			const url = new URL(request.url);
			// dist/ is always a sibling of dist-electron/ (both copied in by
			// electron-builder's "files" glob) — app.getAppPath() resolves to the
			// directory of the entry script itself here, not its parent, so it
			// can't be used to find dist/.
			const distDir = path.join(__dirname, "..", "dist");
			// Strip leading slash from pathname
			const relativePath = url.pathname.replace(/^\//, "") || "index.html";
			const filePath = path.join(distDir, relativePath);

			// Try the requested file; fall back to index.html for SPA client-side routes
			return net.fetch(pathToFileURL(filePath).toString()).catch(() =>
				net.fetch(pathToFileURL(path.join(distDir, "index.html")).toString())
			);
		});
	}

	buildApplicationMenu();
	createWindow();

	if (!isDev) {
		initAutoUpdater();
	}

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// beforeunload (DOM) doesn't fire on app.quit() without a window close, on a
// force-quit, or on a crash. This gives the renderer one last chance to flush
// state to localStorage and write a final disk backup before the window
// actually closes, with a timeout so quit is never blocked indefinitely.
//
// Intercepting the window's own "close" event (rather than app's "before-quit")
// matters: closing the last window fires "closed" -> mainWindow set to null ->
// "window-all-closed" -> app.quit() -> "before-quit", so by the time "before-quit"
// would fire, mainWindow is already destroyed and there's no renderer left to
// flush. Hooking "close" runs while the window (and its renderer) is still alive,
// covering both the direct close-button path and app.quit() triggered without
// closing the window first (Electron closes each window as part of quitting).
function beginQuitFlush(win: BrowserWindow): void {
	if (quitFlushPending) return;
	quitFlushPending = true;

	let settled = false;
	const finishQuit = () => {
		if (settled) return;
		settled = true;
		isQuittingForReal = true;
		win.close();
	};

	const timeoutId = setTimeout(finishQuit, QUIT_FLUSH_TIMEOUT_MS);
	ipcMain.once("before-quit-flush-done", () => {
		clearTimeout(timeoutId);
		finishQuit();
	});

	win.webContents.send("before-quit-flush");
}
