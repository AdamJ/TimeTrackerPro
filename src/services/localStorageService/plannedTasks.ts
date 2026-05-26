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

export async function upsertPlannedTask(task: PlannedTask): Promise<void> {
	try {
		const current = await getPlannedTasks();
		const exists = current.some(t => t.id === task.id);
		const next = exists ? current.map(t => t.id === task.id ? task : t) : [...current, task];
		await savePlannedTasks(next);
	} catch (error) {
		console.warn("Failed to upsert planned task in localStorage:", error);
	}
}

export async function deletePlannedTask(id: string): Promise<void> {
	try {
		const current = await getPlannedTasks();
		await savePlannedTasks(current.filter(t => t.id !== id));
	} catch (error) {
		console.warn("Failed to delete planned task from localStorage:", error);
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
