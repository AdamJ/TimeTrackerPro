import { PlannedTask } from "@/contexts/TimeTrackingContext";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";
import { notifyWriteFailure, readVersioned, writeVersioned } from "./utils";

export async function savePlannedTasks(tasks: PlannedTask[]): Promise<void> {
	const result = writeVersioned(STORAGE_KEYS.PLANNED_TASKS, { data: tasks, _v: SCHEMA_VERSION });
	if (!result.ok) notifyWriteFailure(STORAGE_KEYS.PLANNED_TASKS);
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
