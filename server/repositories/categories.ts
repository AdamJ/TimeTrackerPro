import { db } from "../db";
import type { TaskCategory } from "../types";

interface CategoryRow {
	id: string;
	name: string;
	color: string | null;
	is_billable: boolean | number;
}

function mapRow(row: CategoryRow): TaskCategory {
	return {
		id: row.id,
		name: row.name,
		color: row.color || "#8B5CF6",
		isBillable: !!row.is_billable
	};
}

export async function getCategories(): Promise<TaskCategory[]> {
	const rows: CategoryRow[] = await db("categories").orderBy("name", "asc");
	return rows.map(mapRow);
}

export async function saveCategories(categories: TaskCategory[]): Promise<void> {
	if (categories.length === 0) {
		await db("categories").delete();
		return;
	}

	const existing = await db("categories").select("id");
	const existingIds = new Set(existing.map((r) => r.id));
	const newIds = new Set(categories.map((c) => c.id));
	const toDelete = [...existingIds].filter((id) => !newIds.has(id));
	if (toDelete.length > 0) {
		await db("categories").whereIn("id", toDelete).delete();
	}

	const rows = categories.map((category) => ({
		id: category.id,
		name: category.name,
		color: category.color || null,
		is_billable: category.isBillable !== false,
		updated_at: new Date()
	}));

	await db("categories").insert(rows).onConflict("id").merge();
}
