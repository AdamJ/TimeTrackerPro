interface ElectronDiskBackupInfo {
	name: string;
	timestamp: string;
	sizeBytes: number;
}

interface ElectronBackupAPI {
	writeBackup(json: string): Promise<{ ok: boolean; error?: string }>;
	requestFlushBeforeQuit(callback: () => void | Promise<void>): void;
	onMenuAction(callback: (action: string) => void): () => void;
	listBackups(): Promise<{ ok: boolean; backups?: ElectronDiskBackupInfo[]; error?: string }>;
	readBackup(name: string): Promise<{ ok: boolean; content?: string; error?: string }>;
}

declare global {
	interface Window {
		electronAPI?: ElectronBackupAPI;
	}
}

export {};
