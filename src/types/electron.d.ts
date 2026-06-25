interface ElectronBackupAPI {
	writeBackup(json: string): Promise<{ ok: boolean; error?: string }>;
	requestFlushBeforeQuit(callback: () => void | Promise<void>): void;
}

declare global {
	interface Window {
		electronAPI?: ElectronBackupAPI;
	}
}

export {};
