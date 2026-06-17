import type { Task } from "../types";

export interface TaskRow {
	id: string;
	title: string;
	description: string | null;
	start_time: Date | string;
	end_time: Date | string | null;
	duration: number | string | null;
	project_name: string | null;
	client: string | null;
	category_id: string | null;
	day_record_id: string | null;
	is_current: boolean | number;
	inserted_at: Date | string | null;
	updated_at: Date | string | null;
}

export function mapTaskRow(row: TaskRow): Task {
	return {
		id: row.id,
		title: row.title,
		description: row.description ?? undefined,
		startTime: new Date(row.start_time),
		endTime: row.end_time ? new Date(row.end_time) : undefined,
		duration: row.duration != null ? Number(row.duration) : undefined,
		project: row.project_name ?? undefined,
		client: row.client ?? undefined,
		category: row.category_id ?? undefined,
		insertedAt: row.inserted_at ? new Date(row.inserted_at) : undefined,
		updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
	};
}

export function taskToRow(
	task: Task,
	opts: { isCurrent: boolean; dayRecordId?: string | null }
) {
	return {
		id: task.id,
		title: task.title,
		description: task.description ?? null,
		start_time: task.startTime,
		end_time: task.endTime ?? null,
		duration: task.duration ?? null,
		project_name: task.project ?? null,
		client: task.client ?? null,
		category_id: task.category ?? null,
		day_record_id: opts.dayRecordId ?? null,
		is_current: opts.isCurrent,
		updated_at: new Date()
	};
}
