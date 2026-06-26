import { useCallback, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";

const BACKUP_FAILURE_TOAST_DEBOUNCE_MS = 2000;
let lastBackupFailureToastAt = 0;

// Coalesces rapid-fire calls (e.g. mashing manual-sync) into a single disk
// write carrying the latest snapshot, rather than queuing one write per call.
const WRITE_BACKUP_DEBOUNCE_MS = 1000;

// Mirrors notifyWriteFailure (localStorageService/utils.ts) so disk-backup
// failures get the same on-screen signal as localStorage write failures,
// debounced for the same reason: a single bad save can fire several backups.
function notifyBackupFailure(error?: string): void {
	const now = Date.now();
	if (now - lastBackupFailureToastAt < BACKUP_FAILURE_TOAST_DEBOUNCE_MS) return;
	lastBackupFailureToastAt = now;
	console.error("Electron disk backup write failed:", error);
	toast({
		variant: "destructive",
		title: "Backup failed",
		description: "Your local disk backup may not have been saved. Free up disk space and try again."
	});
}

// No-ops entirely when window.electronAPI is absent (web/PWA builds).
export function useElectronBackup() {
	const quitFlushRef = useRef<() => void | Promise<void>>();
	const pendingSnapshotRef = useRef<unknown>(null);
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

	// Returns the write result so the quit-flush path can await it (so the
	// "flush done" ack reflects an actual write attempt, not just a fire-and-forget
	// call); other call sites are free to ignore the returned promise.
	const writeBackup = useCallback(async (snapshot: unknown): Promise<{ ok: boolean; error?: string } | undefined> => {
		if (!window.electronAPI) return undefined;
		const result = await window.electronAPI.writeBackup(JSON.stringify(snapshot));
		if (!result.ok) notifyBackupFailure(result.error);
		return result;
	}, []);

	// Fire-and-forget call sites (manual sync, day-archiving) use this instead
	// of writeBackup directly, so rapid repeated calls collapse into one disk
	// write of the latest snapshot rather than queuing overlapping writes/prunes.
	// Not for the quit-flush path — that one must write immediately and be awaited.
	const writeBackupDebounced = useCallback((snapshot: unknown): void => {
		if (!window.electronAPI) return;
		pendingSnapshotRef.current = snapshot;
		if (debounceTimerRef.current) return;
		debounceTimerRef.current = setTimeout(() => {
			debounceTimerRef.current = undefined;
			const latest = pendingSnapshotRef.current;
			pendingSnapshotRef.current = null;
			void writeBackup(latest);
		}, WRITE_BACKUP_DEBOUNCE_MS);
	}, [writeBackup]);

	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
		};
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

	return { writeBackup, writeBackupDebounced, registerQuitFlush, listDiskBackups, readDiskBackup };
}
