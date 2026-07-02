import { app, shell, BrowserWindow, Menu, type MenuItemConstructorOptions } from "electron";
import { checkForUpdates } from "./updater";

export type MenuAction = "new-task" | "export" | "settings" | "save" | "command-palette" | "shortcuts-help";

function sendMenuAction(action: MenuAction): void {
	const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
	win?.webContents.send("menu:action", action);
}

// Builds and installs the app's menu bar. Renderer-facing actions (new task,
// export, settings) are dispatched over IPC rather than handled here — the
// renderer owns routing/dialog state, so main only tells it what was clicked.
export function buildApplicationMenu(): Menu {
	const isMac = process.platform === "darwin";

	const template: MenuItemConstructorOptions[] = [
		...(isMac
			? ([
					{
						label: app.name,
						submenu: [
							{ role: "about" },
							{ type: "separator" },
							{ label: "Preferences…", accelerator: "Cmd+,", click: () => sendMenuAction("settings") },
							{ type: "separator" },
							{ role: "services" },
							{ type: "separator" },
							{ role: "hide" },
							{ role: "hideOthers" },
							{ role: "unhide" },
							{ type: "separator" },
							{ role: "quit" },
						],
					},
				] as MenuItemConstructorOptions[])
			: []),
		{
			label: "File",
			submenu: [
				{ label: "New Task", accelerator: "CmdOrCtrl+N", click: () => sendMenuAction("new-task") },
				{ label: "Save Changes", accelerator: "CmdOrCtrl+S", click: () => sendMenuAction("save") },
				{ label: "Export Data…", accelerator: "CmdOrCtrl+E", click: () => sendMenuAction("export") },
				...(!isMac
					? ([
							{ type: "separator" },
							{ label: "Settings…", accelerator: "Ctrl+,", click: () => sendMenuAction("settings") },
						] as MenuItemConstructorOptions[])
					: []),
				{ type: "separator" },
				{ role: isMac ? "close" : "quit" },
			],
		},
		{
			label: "Edit",
			submenu: [
				{ role: "undo" },
				{ role: "redo" },
				{ type: "separator" },
				{ role: "cut" },
				{ role: "copy" },
				{ role: "paste" },
				{ role: "selectAll" },
			],
		},
		{
			label: "View",
			submenu: [
				{ label: "Command Palette…", accelerator: "CmdOrCtrl+K", click: () => sendMenuAction("command-palette") },
				{ type: "separator" },
				{ role: "reload" },
				{ role: "forceReload" },
				{ role: "toggleDevTools" },
				{ type: "separator" },
				{ role: "resetZoom" },
				{ role: "zoomIn" },
				{ role: "zoomOut" },
				{ type: "separator" },
				{ role: "togglefullscreen" },
			],
		},
		// macOS's "windowMenu" role auto-builds the standard Window menu
		// (Minimize, Zoom, Bring All to Front, open-window list) — Electron's
		// own default app menu template uses it as a whole top-level entry
		// rather than a hand-rolled submenu.
		...(isMac
			? ([{ role: "windowMenu" }] as MenuItemConstructorOptions[])
			: ([
					{
						label: "Window",
						submenu: [{ role: "minimize" }, { role: "close" }],
					},
				] as MenuItemConstructorOptions[])),
		{
			label: "Help",
			submenu: [
				{
					label: "Timetraked on GitHub",
					click: () => void shell.openExternal("https://github.com/AdamJ/TimeTrackerPro"),
				},
				{ type: "separator" },
				{ label: "Keyboard Shortcuts", click: () => sendMenuAction("shortcuts-help") },
				{ label: "Check for Updates…", click: () => checkForUpdates() },
			],
		},
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
	return menu;
}
