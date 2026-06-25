import { useCallback, useEffect, useRef } from "react";

// No-ops entirely when window.electronAPI is absent (web/PWA builds).
export function useElectronBackup() {
	const quitFlushRef = useRef<() => void | Promise<void>>();

	const writeBackup = useCallback((snapshot: unknown) => {
		if (!window.electronAPI) return;
		void window.electronAPI.writeBackup(JSON.stringify(snapshot));
	}, []);

	const registerQuitFlush = useCallback((callback: () => void | Promise<void>) => {
		quitFlushRef.current = callback;
	}, []);

	// Registers the IPC listener once; always delegates to the latest callback
	// via the ref so re-registration never leaks duplicate listeners.
	useEffect(() => {
		if (!window.electronAPI) return;
		window.electronAPI.requestFlushBeforeQuit(() => quitFlushRef.current?.());
	}, []);

	const listDiskBackups = useCallback(async () => {
		if (!window.electronAPI) return { ok: true, backups: [] };
		return window.electronAPI.listBackups();
	}, []);

	const readDiskBackup = useCallback(async (name: string) => {
		if (!window.electronAPI) return { ok: false, error: "Not running in Electron" };
		return window.electronAPI.readBackup(name);
	}, []);

	return { writeBackup, registerQuitFlush, listDiskBackups, readDiskBackup };
}
