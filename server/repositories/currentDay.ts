import { db } from "../db";
import type { CurrentDayData } from "../types";
import { mapTaskRow, taskToRow, type TaskRow } from "./taskMapper";

const SINGLETON_ID = "singleton";

interface CurrentDayRow {
	id: string;
	is_day_started: boolean | number;
	day_start_time: Date | string | null;
	current_task_id: string | null;
}

export async function getCurrentDay(): Promise<CurrentDayData | null> {
	const row: CurrentDayRow | undefined = await db("current_day")
		.where({ id: SINGLETON_ID })
		.first();
	const taskRows: TaskRow[] = await db("tasks")
		.where({ is_current: true })
		.orderBy("start_time", "asc");

	if (!row && taskRows.length === 0) {
		return null;
	}

	const tasks = taskRows.map(mapTaskRow);
	const currentTask = row?.current_task_id
		? tasks.find((task) => task.id === row.current_task_id) ?? null
		: null;

	return {
		isDayStarted: !!row?.is_day_started,
		dayStartTime: row?.day_start_time ? new Date(row.day_start_time) : null,
		tasks,
		currentTask
	};
}

export async function saveCurrentDay(data: CurrentDayData): Promise<void> {
	await db("current_day")
		.insert({
			id: SINGLETON_ID,
			is_day_started: data.isDayStarted,
			day_start_time: data.dayStartTime,
			current_task_id: data.currentTask?.id ?? null,
			updated_at: new Date()
		})
		.onConflict("id")
		.merge();

	if (data.tasks.length === 0) {
		await db("tasks").where({ is_current: true }).delete();
		return;
	}

	const existing = await db("tasks").where({ is_current: true }).select("id");
	const existingIds = new Set(existing.map((r) => r.id));
	const newIds = new Set(data.tasks.map((t) => t.id));

	const toDelete = [...existingIds].filter((id) => !newIds.has(id));
	if (toDelete.length > 0) {
		await db("tasks").where({ is_current: true }).whereIn("id", toDelete).delete();
	}

	const rows = data.tasks.map((task) => taskToRow(task, { isCurrent: true }));
	await db("tasks").insert(rows).onConflict("id").merge();
}
