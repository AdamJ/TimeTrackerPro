import { db } from "../db";
import type { TodoItem } from "../types";

interface TodoRow {
	id: string;
	text: string;
	completed: boolean | number;
	created_at: Date | string;
	completed_at: Date | string | null;
}

function mapRow(row: TodoRow): TodoItem {
	return {
		id: row.id,
		text: row.text,
		completed: !!row.completed,
		createdAt: new Date(row.created_at).toISOString(),
		completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined
	};
}

export async function getTodos(): Promise<TodoItem[]> {
	const rows: TodoRow[] = await db("todo_items").orderBy("created_at", "asc");
	return rows.map(mapRow);
}

export async function saveTodos(todos: TodoItem[]): Promise<void> {
	if (todos.length === 0) {
		await db("todo_items").delete();
		return;
	}

	const existing = await db("todo_items").select("id");
	const existingIds = new Set(existing.map((r) => r.id));
	const newIds = new Set(todos.map((t) => t.id));
	const toDelete = [...existingIds].filter((id) => !newIds.has(id));
	if (toDelete.length > 0) {
		await db("todo_items").whereIn("id", toDelete).delete();
	}

	const rows = todos.map((item) => ({
		id: item.id,
		text: item.text,
		completed: item.completed,
		created_at: item.createdAt,
		completed_at: item.completedAt ?? null
	}));

	await db("todo_items").insert(rows).onConflict("id").merge();
}
