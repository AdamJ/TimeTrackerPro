import { Task, DayRecord } from "@/contexts/TimeTrackingContext";
import { SCHEMA_VERSION } from "./constants";

// Reads a versioned { [dataField]: T[], _v } envelope or a legacy bare array.
// Returns [] on missing key or schema mismatch; throws on JSON parse error so
// callers can emit a domain-specific error message.
export function readVersioned<T>(key: string, dataField: string): T[] {
	const raw = localStorage.getItem(key);
	if (!raw) return [];
	const parsed = JSON.parse(raw);
	if (!Array.isArray(parsed) && parsed?._v !== SCHEMA_VERSION) {
		console.warn(`localStorage ${key} schema mismatch — clearing stale data`);
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
