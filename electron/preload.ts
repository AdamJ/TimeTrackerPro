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
});
