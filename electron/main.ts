import { app, BrowserWindow, session, protocol, net } from "electron";
import path from "path";
import { pathToFileURL } from "url";

const isDev = process.env.NODE_ENV === "development" || process.env.ELECTRON_DEV === "true";

// Register custom protocol for production SPA routing (BrowserRouter requires path-based URLs)
// Must be registered before app is ready
if (!isDev) {
	protocol.registerSchemesAsPrivileged([
		{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
	]);
}

function createWindow(): void {
	const win = new BrowserWindow({
		width: 1280,
		height: 800,
		minWidth: 800,
		minHeight: 600,
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
		},
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
			const distDir = path.join(app.getAppPath(), "dist");
			// Strip leading slash from pathname
			const relativePath = url.pathname.replace(/^\//, "") || "index.html";
			const filePath = path.join(distDir, relativePath);

			// Try the requested file; fall back to index.html for SPA client-side routes
			return net.fetch(pathToFileURL(filePath).toString()).catch(() =>
				net.fetch(pathToFileURL(path.join(distDir, "index.html")).toString())
			);
		});
	}

	createWindow();

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
