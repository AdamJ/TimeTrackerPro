import { db } from "../db";
import type { Initiative, InitiativeStatus, InitiativeDeadlineType } from "../types";

interface InitiativeRow {
	id: string;
	project_id: string | null;
	name: string;
	goal: string | null;
	status: string;
	deadline_type: string;
	deadline_date: string | null;
	deadline_quarter: number | null;
	deadline_year: number | null;
	created_at: Date | string;
	updated_at: Date | string;
}

function mapRow(row: InitiativeRow): Initiative {
	return {
		id: row.id,
		projectId: row.project_id ?? "",
		name: row.name,
		goal: row.goal ?? "",
		status: row.status as InitiativeStatus,
		deadlineType: row.deadline_type as InitiativeDeadlineType,
		deadlineDate: row.deadline_date ?? undefined,
		deadlineQuarter: row.deadline_quarter ?? undefined,
		deadlineYear: row.deadline_year ?? undefined,
		createdAt: new Date(row.created_at).toISOString(),
		updatedAt: new Date(row.updated_at).toISOString()
	};
}

function initiativeToRow(initiative: Initiative) {
	return {
		id: initiative.id,
		project_id: initiative.projectId,
		name: initiative.name,
		goal: initiative.goal,
		status: initiative.status,
		deadline_type: initiative.deadlineType,
		deadline_date: initiative.deadlineDate ?? null,
		deadline_quarter: initiative.deadlineQuarter ?? null,
		deadline_year: initiative.deadlineYear ?? null,
		created_at: initiative.createdAt,
		updated_at: new Date()
	};
}

export async function getInitiatives(): Promise<Initiative[]> {
	const rows: InitiativeRow[] = await db("planning_initiatives").orderBy("created_at", "asc");
	return rows.map(mapRow);
}

export async function saveInitiatives(initiatives: Initiative[]): Promise<void> {
	if (initiatives.length === 0) {
		await db("planning_initiatives").delete();
		return;
	}

	const existing = await db("planning_initiatives").select("id");
	const existingIds = new Set(existing.map((r) => r.id));
	const newIds = new Set(initiatives.map((i) => i.id));
	const toDelete = [...existingIds].filter((id) => !newIds.has(id));
	if (toDelete.length > 0) {
		await db("planning_initiatives").whereIn("id", toDelete).delete();
	}

	const rows = initiatives.map(initiativeToRow);
	await db("planning_initiatives").insert(rows).onConflict("id").merge();
}

export async function upsertInitiative(initiative: Initiative): Promise<void> {
	await db("planning_initiatives").insert(initiativeToRow(initiative)).onConflict("id").merge();
}

export async function deleteInitiative(id: string): Promise<void> {
	await db("planning_initiatives").where({ id }).delete();
}
