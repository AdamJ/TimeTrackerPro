import { Task, DayRecord } from "@/contexts/TimeTrackingContext";
import { toast } from "@/hooks/use-toast";
import { SCHEMA_VERSION } from "./constants";

export type WriteResult = { ok: true } | { ok: false; error: unknown };

const WRITE_FAILURE_TOAST_DEBOUNCE_MS = 2000;
let lastWriteFailureToastAt = 0;

// Surfaces a save failure to the user. Debounced because forceSyncToDatabase
// can trigger up to 7 of these in the same tick on a single quota error.
export function notifyWriteFailure(key: string): void {
	const now = Date.now();
	if (now - lastWriteFailureToastAt < WRITE_FAILURE_TOAST_DEBOUNCE_MS) return;
	lastWriteFailureToastAt = now;
	console.error(`localStorage write failed for "${key}" — notifying user`);
	toast({
		variant: "destructive",
		title: "Save failed",
		description: "Your data may not have been saved. Free up storage space and try again."
	});
}

// Wraps localStorage.setItem so write failures (e.g. QuotaExceededError) are
// reported to the caller instead of being thrown mid-save.
export function writeVersioned(key: string, payload: object): WriteResult {
	try {
		localStorage.setItem(key, JSON.stringify(payload));
		return { ok: true };
	} catch (error) {
		console.warn(`Failed to write localStorage key "${key}":`, error);
		return { ok: false, error };
	}
}

// Copies a stale/mismatched blob to a sibling key before it's cleared, so a
// schema bump or a blob from another app version doesn't destroy data
// outright — it's recoverable from the backup key if needed.
export function backupStaleKey(key: string, raw: string, oldVersion: unknown): void {
	const backupKey = `${key}_v${oldVersion ?? "unknown"}_backup_${Date.now()}`;
	try {
		localStorage.setItem(backupKey, raw);
		console.warn(`localStorage ${key} schema mismatch — backed up to ${backupKey} before clearing`);
	} catch (error) {
		console.error(`Failed to back up stale key "${key}" before clearing:`, error);
	}
}

// Reads a versioned { [dataField]: T[], _v } envelope or a legacy bare array.
// Returns [] on missing key or schema mismatch; throws on JSON parse error so
// callers can emit a domain-specific error message.
export function readVersioned<T>(key: string, dataField: string): T[] {
	const raw = localStorage.getItem(key);
	if (!raw) return [];
	const parsed = JSON.parse(raw);
	if (!Array.isArray(parsed) && parsed?._v !== SCHEMA_VERSION) {
		backupStaleKey(key, raw, parsed?._v);
		localStorage.removeItem(key);
		return [];
	}
	const data: T[] = Array.isArray(parsed) ? parsed : parsed?.[dataField];
	return Array.isArray(data) ? data : [];
}

export function hydrateTask(task: Task): Task {
	return {
		...task,
		startTime: new Date(task.startTime),
		endTime: task.endTime ? new Date(task.endTime) : undefined
	};
}

export function hydrateDay(day: DayRecord): DayRecord {
	return {
		...day,
		startTime: new Date(day.startTime),
		endTime: new Date(day.endTime),
		tasks: day.tasks.map(hydrateTask)
	};
}
