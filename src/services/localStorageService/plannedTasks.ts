import { PlannedTask } from "@/contexts/TimeTrackingContext";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";
import { readVersioned } from "./utils";

export async function savePlannedTasks(tasks: PlannedTask[]): Promise<void> {
	try {
		localStorage.setItem(
			STORAGE_KEYS.PLANNED_TASKS,
			JSON.stringify({ data: tasks, _v: SCHEMA_VERSION })
		);
	} catch (error) {
		console.warn("Failed to save planned tasks to localStorage:", error);
	}
}

export async function getPlannedTasks(): Promise<PlannedTask[]> {
	try {
		return readVersioned<PlannedTask>(STORAGE_KEYS.PLANNED_TASKS, "data");
	} catch (error) {
		console.error("Error loading planned tasks from localStorage:", error);
		return [];
	}
}
