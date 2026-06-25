import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
	writeBackup: (json: string): Promise<{ ok: boolean; error?: string }> =>
		ipcRenderer.invoke("backup:write", json),

	requestFlushBeforeQuit: (callback: () => void | Promise<void>): void => {
		ipcRenderer.on("before-quit-flush", async () => {
			try {
				await callback();
			} finally {
				ipcRenderer.send("before-quit-flush-done");
			}
		});
	},

	onMenuAction: (callback: (action: string) => void): (() => void) => {
		const listener = (_event: unknown, action: string) => callback(action);
		ipcRenderer.on("menu:action", listener);
		return () => ipcRenderer.removeListener("menu:action", listener);
	},
});
