import { db } from "../db";
import type { Project } from "../types";

interface ProjectRow {
	id: string;
	name: string;
	client: string;
	hourly_rate: string | number | null;
	color: string | null;
	is_billable: boolean | number;
	archived: boolean | number;
}

function mapRow(row: ProjectRow): Project {
	return {
		id: row.id,
		name: row.name,
		client: row.client,
		hourlyRate: row.hourly_rate != null ? Number(row.hourly_rate) : undefined,
		color: row.color ?? undefined,
		isBillable: !!row.is_billable,
		archived: !!row.archived
	};
}

export async function getProjects(): Promise<Project[]> {
	const rows: ProjectRow[] = await db("projects").orderBy("name", "asc");
	return rows.map(mapRow);
}

export async function saveProjects(projects: Project[]): Promise<void> {
	if (projects.length === 0) {
		await db("projects").delete();
		return;
	}

	const existing = await db("projects").select("id");
	const existingIds = new Set(existing.map((r) => r.id));
	const newIds = new Set(projects.map((p) => p.id));
	const toDelete = [...existingIds].filter((id) => !newIds.has(id));
	if (toDelete.length > 0) {
		await db("projects").whereIn("id", toDelete).delete();
	}

	// Dedup by id: a single insert batch cannot upsert the same conflict key twice.
	const dedupedById = Array.from(new Map(projects.map((p) => [p.id, p])).values());
	const rows = dedupedById.map((project) => ({
		id: project.id,
		name: project.name,
		client: project.client,
		hourly_rate: project.hourlyRate ?? null,
		color: project.color ?? null,
		is_billable: project.isBillable !== false,
		archived: project.archived === true,
		updated_at: new Date()
	}));

	await db("projects").insert(rows).onConflict("id").merge();
}
