import { Task } from "@/contexts/TimeTrackingContext";
import type { CurrentDayData } from "@/services/dataService";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";
import { backupStaleKey, notifyWriteFailure, writeVersioned } from "./utils";

export async function saveCurrentDay(data: CurrentDayData): Promise<void> {
	const result = writeVersioned(STORAGE_KEYS.CURRENT_DAY, { ...data, _v: SCHEMA_VERSION });
	if (!result.ok) notifyWriteFailure(STORAGE_KEYS.CURRENT_DAY);
}

export async function getCurrentDay(): Promise<CurrentDayData | null> {
	try {
		const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_DAY);
		if (!saved) return null;

		const data = JSON.parse(saved);
		if (data._v !== SCHEMA_VERSION) {
			backupStaleKey(STORAGE_KEYS.CURRENT_DAY, saved, data._v);
			localStorage.removeItem(STORAGE_KEYS.CURRENT_DAY);
			return null;
		}
		return {
			...data,
			dayStartTime: data.dayStartTime ? new Date(data.dayStartTime) : null,
			tasks: (data.tasks ?? []).map((task: Task) => ({
				...task,
				startTime: new Date(task.startTime),
				endTime: task.endTime ? new Date(task.endTime) : undefined
			})),
			currentTask: data.currentTask
				? {
						...data.currentTask,
						startTime: new Date(data.currentTask.startTime),
						endTime: data.currentTask.endTime
							? new Date(data.currentTask.endTime)
							: undefined
					}
				: null
		};
	} catch (error) {
		console.error("Error loading current day from localStorage:", error);
		return null;
	}
}
