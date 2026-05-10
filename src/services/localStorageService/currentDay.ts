import { Task } from "@/contexts/TimeTrackingContext";
import type { CurrentDayData } from "@/services/dataService";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";

export async function saveCurrentDay(data: CurrentDayData): Promise<void> {
	try {
		localStorage.setItem(
			STORAGE_KEYS.CURRENT_DAY,
			JSON.stringify({ ...data, _v: SCHEMA_VERSION })
		);
	} catch (error) {
		console.warn("Failed to save current day to localStorage:", error);
	}
}

export async function getCurrentDay(): Promise<CurrentDayData | null> {
	try {
		const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_DAY);
		if (!saved) return null;

		const data = JSON.parse(saved);
		if (data._v !== SCHEMA_VERSION) {
			console.warn("localStorage current day schema mismatch — clearing stale data");
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
