import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";

export interface LocalStorageBackupInfo {
	key: string;
	originalKey: string;
	oldVersion: string;
	timestamp: number;
}

export interface BackupSummary {
	currentDayTasks?: number;
	archivedDays?: number;
	projects?: number;
	categories?: number;
	todos?: number;
	plannedTasks?: number;
	clients?: number;
}

export interface FullSnapshot {
	currentDay?: { tasks?: unknown[] };
	projects?: unknown[];
	categories?: unknown[];
	archivedDays?: unknown[];
	todoItems?: unknown[];
	plannedTasks?: unknown[];
	clients?: unknown[];
}

// Matches the sibling keys written by backupStaleKey, e.g.
// "timetracker_archived_days_v0_backup_1719345600000".
const BACKUP_KEY_PATTERN = /^(.+)_v(.+)_backup_(\d+)$/;

const SUMMARY_FIELD_BY_KEY: Record<string, keyof BackupSummary> = {
	[STORAGE_KEYS.CURRENT_DAY]: "currentDayTasks",
	[STORAGE_KEYS.ARCHIVED_DAYS]: "archivedDays",
	[STORAGE_KEYS.PROJECTS]: "projects",
	[STORAGE_KEYS.CATEGORIES]: "categories",
	[STORAGE_KEYS.TODOS]: "todos",
	[STORAGE_KEYS.PLANNED_TASKS]: "plannedTasks",
	[STORAGE_KEYS.CLIENTS]: "clients"
};

export function listLocalStorageBackups(): LocalStorageBackupInfo[] {
	const backups: LocalStorageBackupInfo[] = [];
	for (const key of Object.keys(localStorage)) {
		const match = key.match(BACKUP_KEY_PATTERN);
		if (!match) continue;
		const [, originalKey, oldVersion, timestamp] = match;
		if (!(originalKey in SUMMARY_FIELD_BY_KEY)) continue;
		backups.push({ key, originalKey, oldVersion, timestamp: Number(timestamp) });
	}
	return backups.sort((a, b) => b.timestamp - a.timestamp);
}

// Extracts the underlying array (or, for CURRENT_DAY, the raw object) from a
// blob that may be the versioned envelope or a legacy bare array.
function extractEntityData(originalKey: string, parsed: unknown): unknown {
	if (originalKey === STORAGE_KEYS.CURRENT_DAY) return parsed;
	if (Array.isArray(parsed)) return parsed;
	if (originalKey === STORAGE_KEYS.ARCHIVED_DAYS) {
		return (parsed as { days?: unknown })?.days ?? [];
	}
	return (parsed as { data?: unknown })?.data ?? [];
}

function countFor(originalKey: string, data: unknown): number {
	if (originalKey === STORAGE_KEYS.CURRENT_DAY) {
		return (data as { tasks?: unknown[] })?.tasks?.length ?? 0;
	}
	return Array.isArray(data) ? data.length : 0;
}

export function summarizeLocalStorageBackup(backup: LocalStorageBackupInfo): BackupSummary | null {
	const raw = localStorage.getItem(backup.key);
	if (!raw) return null;
	try {
		const data = extractEntityData(backup.originalKey, JSON.parse(raw));
		const field = SUMMARY_FIELD_BY_KEY[backup.originalKey];
		return { [field]: countFor(backup.originalKey, data) };
	} catch (error) {
		console.error(`Failed to summarize backup "${backup.key}":`, error);
		return null;
	}
}

// Restores a single schema-mismatch backup back into its live key, re-stamped
// with the current schema version so a normal load doesn't immediately
// re-flag it as stale and back it up again.
export function restoreLocalStorageBackup(backup: LocalStorageBackupInfo): boolean {
	const raw = localStorage.getItem(backup.key);
	if (!raw) return false;
	try {
		const data = extractEntityData(backup.originalKey, JSON.parse(raw));
		const envelope =
			backup.originalKey === STORAGE_KEYS.CURRENT_DAY
				? { ...(data as object), _v: SCHEMA_VERSION }
				: backup.originalKey === STORAGE_KEYS.ARCHIVED_DAYS
					? { days: data, _v: SCHEMA_VERSION }
					: { data, _v: SCHEMA_VERSION };
		localStorage.setItem(backup.originalKey, JSON.stringify(envelope));
		return true;
	} catch (error) {
		console.error(`Failed to restore backup "${backup.key}":`, error);
		return false;
	}
}

export function summarizeFullSnapshot(snapshot: FullSnapshot): BackupSummary {
	return {
		currentDayTasks: snapshot.currentDay?.tasks?.length ?? 0,
		archivedDays: snapshot.archivedDays?.length ?? 0,
		projects: snapshot.projects?.length ?? 0,
		categories: snapshot.categories?.length ?? 0,
		todos: snapshot.todoItems?.length ?? 0,
		plannedTasks: snapshot.plannedTasks?.length ?? 0,
		clients: snapshot.clients?.length ?? 0
	};
}

// Round-trips a full Electron disk-backup snapshot back into the live
// localStorage keys, the same shape a normal save would have produced.
export function restoreFullSnapshot(snapshot: FullSnapshot): void {
	if (snapshot.currentDay) {
		localStorage.setItem(STORAGE_KEYS.CURRENT_DAY, JSON.stringify({ ...snapshot.currentDay, _v: SCHEMA_VERSION }));
	}
	localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify({ data: snapshot.projects ?? [], _v: SCHEMA_VERSION }));
	localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify({ data: snapshot.categories ?? [], _v: SCHEMA_VERSION }));
	localStorage.setItem(
		STORAGE_KEYS.ARCHIVED_DAYS,
		JSON.stringify({ days: snapshot.archivedDays ?? [], _v: SCHEMA_VERSION })
	);
	localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify({ data: snapshot.todoItems ?? [], _v: SCHEMA_VERSION }));
	localStorage.setItem(
		STORAGE_KEYS.PLANNED_TASKS,
		JSON.stringify({ data: snapshot.plannedTasks ?? [], _v: SCHEMA_VERSION })
	);
	localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify({ data: snapshot.clients ?? [], _v: SCHEMA_VERSION }));
}

// Counts from the live keys, for comparison against a backup before restoring.
export function summarizeCurrentLocalStorageState(): BackupSummary {
	const countLiveKey = (key: string): number => {
		const raw = localStorage.getItem(key);
		if (!raw) return 0;
		try {
			return countFor(key, extractEntityData(key, JSON.parse(raw)));
		} catch {
			return 0;
		}
	};

	return {
		currentDayTasks: countLiveKey(STORAGE_KEYS.CURRENT_DAY),
		archivedDays: countLiveKey(STORAGE_KEYS.ARCHIVED_DAYS),
		projects: countLiveKey(STORAGE_KEYS.PROJECTS),
		categories: countLiveKey(STORAGE_KEYS.CATEGORIES),
		todos: countLiveKey(STORAGE_KEYS.TODOS),
		plannedTasks: countLiveKey(STORAGE_KEYS.PLANNED_TASKS),
		clients: countLiveKey(STORAGE_KEYS.CLIENTS)
	};
}
