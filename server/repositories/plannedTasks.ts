import { db } from "../db";
import type { PlannedTask, PlannedTaskStatus } from "../types";

interface PlannedTaskRow {
	id: string;
	title: string;
	description: string | null;
	status: string;
	project_name: string | null;
	client: string | null;
	category_id: string | null;
	priority: number;
	linked_task_id: string | null;
	time_entries: string | null;
	time_spent: number | string;
	created_at: Date | string;
	updated_at: Date | string;
}

function mapRow(row: PlannedTaskRow): PlannedTask {
	return {
		id: row.id,
		title: row.title,
		description: row.description ?? undefined,
		status: row.status as PlannedTaskStatus,
		project: row.project_name ?? undefined,
		client: row.client ?? undefined,
		category: row.category_id ?? undefined,
		priority: row.priority,
		linkedTaskId: row.linked_task_id ?? undefined,
		timeEntries: row.time_entries ? JSON.parse(row.time_entries) : [],
		timeSpent: Number(row.time_spent ?? 0),
		createdAt: new Date(row.created_at).toISOString(),
		updatedAt: new Date(row.updated_at).toISOString()
	};
}

function taskToRow(task: PlannedTask) {
	return {
		id: task.id,
		title: task.title,
		description: task.description ?? null,
		status: task.status,
		project_name: task.project ?? null,
		client: task.client ?? null,
		category_id: task.category ?? null,
		priority: task.priority,
		linked_task_id: task.linkedTaskId ?? null,
		time_entries: JSON.stringify(task.timeEntries ?? []),
		time_spent: task.timeSpent ?? 0,
		created_at: task.createdAt,
		updated_at: new Date()
	};
}

export async function getPlannedTasks(): Promise<PlannedTask[]> {
	const rows: PlannedTaskRow[] = await db("planned_tasks")
		.orderBy("priority", "asc")
		.orderBy("created_at", "asc");
	return rows.map(mapRow);
}

export async function savePlannedTasks(tasks: PlannedTask[]): Promise<void> {
	if (tasks.length === 0) {
		await db("planned_tasks").delete();
		return;
	}

	const existing = await db("planned_tasks").select("id");
	const existingIds = new Set(existing.map((r) => r.id));
	const newIds = new Set(tasks.map((t) => t.id));
	const toDelete = [...existingIds].filter((id) => !newIds.has(id));
	if (toDelete.length > 0) {
		await db("planned_tasks").whereIn("id", toDelete).delete();
	}

	const rows = tasks.map(taskToRow);
	await db("planned_tasks").insert(rows).onConflict("id").merge();
}

export async function upsertPlannedTask(task: PlannedTask): Promise<void> {
	await db("planned_tasks").insert(taskToRow(task)).onConflict("id").merge();
}

export async function deletePlannedTask(id: string): Promise<void> {
	await db("planned_tasks").where({ id }).delete();
}
