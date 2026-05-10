import { TodoItem } from "@/contexts/TimeTrackingContext";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";
import { readVersioned } from "./utils";

export async function saveTodos(todos: TodoItem[]): Promise<void> {
	try {
		localStorage.setItem(
			STORAGE_KEYS.TODOS,
			JSON.stringify({ data: todos, _v: SCHEMA_VERSION })
		);
	} catch (error) {
		console.warn("Failed to save todos to localStorage:", error);
	}
}

export async function getTodos(): Promise<TodoItem[]> {
	try {
		return readVersioned<TodoItem>(STORAGE_KEYS.TODOS, "data");
	} catch (error) {
		console.error("Error loading todos from localStorage:", error);
		return [];
	}
}
