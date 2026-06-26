import { TodoItem } from "@/contexts/TimeTrackingContext";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";
import { notifyWriteFailure, readVersioned, writeVersioned } from "./utils";

export async function saveTodos(todos: TodoItem[]): Promise<void> {
	const result = writeVersioned(STORAGE_KEYS.TODOS, { data: todos, _v: SCHEMA_VERSION });
	if (!result.ok) notifyWriteFailure(STORAGE_KEYS.TODOS);
}

export async function getTodos(): Promise<TodoItem[]> {
	try {
		return readVersioned<TodoItem>(STORAGE_KEYS.TODOS, "data");
	} catch (error) {
		console.error("Error loading todos from localStorage:", error);
		return [];
	}
}

export async function deleteTodo(id: string): Promise<void> {
	const todos = await getTodos();
	await saveTodos(todos.filter((todo) => todo.id !== id));
}
