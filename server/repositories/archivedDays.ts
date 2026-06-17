import { db } from "../db";
import type { DayRecord, Task } from "../types";
import { mapTaskRow, taskToRow, type TaskRow } from "./taskMapper";

interface ArchivedDayRow {
	id: string;
	date: string;
	total_duration: number | string | null;
	start_time: Date | string;
	end_time: Date | string;
	notes: string | null;
	inserted_at: Date | string | null;
	updated_at: Date | string | null;
}

export async function getArchivedDays(): Promise<DayRecord[]> {
	const dayRows: ArchivedDayRow[] = await db("archived_days").orderBy("start_time", "desc");
	if (dayRows.length === 0) {
		return [];
	}

	const taskRows: TaskRow[] = await db("tasks")
		.where({ is_current: false })
		.orderBy("start_time", "asc");

	const tasksByDay = new Map<string, Task[]>();
	for (const row of taskRows) {
		if (!row.day_record_id) continue;
		const list = tasksByDay.get(row.day_record_id) ?? [];
		list.push(mapTaskRow(row));
		tasksByDay.set(row.day_record_id, list);
	}

	return dayRows.map((day) => ({
		id: day.id,
		date: day.date,
		tasks: tasksByDay.get(day.id) ?? [],
		totalDuration: day.total_duration != null ? Number(day.total_duration) : 0,
		startTime: new Date(day.start_time),
		endTime: new Date(day.end_time),
		notes: day.notes ?? undefined,
		insertedAt: day.inserted_at ? new Date(day.inserted_at) : undefined,
		updatedAt: day.updated_at ? new Date(day.updated_at) : undefined
	}));
}

export async function saveArchivedDays(days: DayRecord[]): Promise<void> {
	if (days.length === 0) {
		await db("tasks").where({ is_current: false }).delete();
		await db("archived_days").delete();
		return;
	}

	const existingDays = await db("archived_days").select("id");
	const existingTasks = await db("tasks").where({ is_current: false }).select("id");

	const newDayIds = new Set(days.map((d) => d.id));
	const daysToDelete = existingDays.map((d) => d.id).filter((id) => !newDayIds.has(id));
	if (daysToDelete.length > 0) {
		await db("archived_days").whereIn("id", daysToDelete).delete();
	}

	const allTasks = days.flatMap((day) => day.tasks.map((task) => ({ task, dayId: day.id })));
	const newTaskIds = new Set(allTasks.map((t) => t.task.id));
	const tasksToDelete = existingTasks.map((t) => t.id).filter((id) => !newTaskIds.has(id));
	if (tasksToDelete.length > 0) {
		await db("tasks").where({ is_current: false }).whereIn("id", tasksToDelete).delete();
	}

	const dayRows = days.map((day) => ({
		id: day.id,
		date: day.date,
		total_duration: day.totalDuration,
		start_time: day.startTime,
		end_time: day.endTime,
		notes: day.notes ?? null,
		updated_at: new Date()
	}));
	await db("archived_days").insert(dayRows).onConflict("id").merge();

	if (allTasks.length > 0) {
		const taskRows = allTasks.map(({ task, dayId }) =>
			taskToRow(task, { isCurrent: false, dayRecordId: dayId })
		);
		await db("tasks").insert(taskRows).onConflict("id").merge();
	}
}

export async function updateArchivedDay(
	dayId: string,
	updates: Partial<DayRecord>
): Promise<void> {
	const updateData: Record<string, unknown> = { updated_at: new Date() };
	if (updates.date) updateData.date = updates.date;
	if (updates.totalDuration !== undefined) updateData.total_duration = updates.totalDuration;
	if (updates.startTime) updateData.start_time = updates.startTime;
	if (updates.endTime) updateData.end_time = updates.endTime;
	if (updates.notes !== undefined) updateData.notes = updates.notes;

	await db("archived_days").where({ id: dayId }).update(updateData);

	if (updates.tasks) {
		const existing = await db("tasks")
			.where({ day_record_id: dayId, is_current: false })
			.select("id");
		const existingIds = new Set(existing.map((r) => r.id));
		const newIds = new Set(updates.tasks.map((t) => t.id));
		const toDelete = [...existingIds].filter((id) => !newIds.has(id));
		if (toDelete.length > 0) {
			await db("tasks")
				.where({ day_record_id: dayId, is_current: false })
				.whereIn("id", toDelete)
				.delete();
		}

		if (updates.tasks.length > 0) {
			const rows = updates.tasks.map((task) =>
				taskToRow(task, { isCurrent: false, dayRecordId: dayId })
			);
			await db("tasks").insert(rows).onConflict("id").merge();
		}
	}
}

export async function deleteArchivedDay(dayId: string): Promise<void> {
	await db("tasks").where({ day_record_id: dayId }).delete();
	await db("archived_days").where({ id: dayId }).delete();
}
