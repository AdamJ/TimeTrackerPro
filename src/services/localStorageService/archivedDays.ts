import { DayRecord } from "@/contexts/TimeTrackingContext";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";
import { backupStaleKey, hydrateDay, notifyWriteFailure, writeVersioned } from "./utils";

export async function saveArchivedDays(days: DayRecord[]): Promise<void> {
	const result = writeVersioned(STORAGE_KEYS.ARCHIVED_DAYS, { days, _v: SCHEMA_VERSION });
	if (!result.ok) notifyWriteFailure(STORAGE_KEYS.ARCHIVED_DAYS);
}

export async function getArchivedDays(): Promise<DayRecord[]> {
	try {
		const saved = localStorage.getItem(STORAGE_KEYS.ARCHIVED_DAYS);
		if (!saved) return [];

		const parsed = JSON.parse(saved);
		// Support both versioned format { days, _v } and legacy bare array
		const data: DayRecord[] | undefined = Array.isArray(parsed) ? parsed : parsed?.days;
		if (!Array.isArray(parsed) && parsed?._v !== SCHEMA_VERSION) {
			backupStaleKey(STORAGE_KEYS.ARCHIVED_DAYS, saved, parsed?._v);
			localStorage.removeItem(STORAGE_KEYS.ARCHIVED_DAYS);
			return [];
		}
		if (!Array.isArray(data)) return [];
		return data.map(hydrateDay);
	} catch (error) {
		console.error("Error loading archived days from localStorage:", error);
		return [];
	}
}

export async function updateArchivedDay(
	dayId: string,
	updates: Partial<DayRecord>
): Promise<void> {
	const days = await getArchivedDays();
	const updatedDays = days.map(day => (day.id === dayId ? { ...day, ...updates } : day));
	await saveArchivedDays(updatedDays);
}

export async function deleteArchivedDay(dayId: string): Promise<void> {
	const days = await getArchivedDays();
	const filteredDays = days.filter(day => day.id !== dayId);
	await saveArchivedDays(filteredDays);
}
