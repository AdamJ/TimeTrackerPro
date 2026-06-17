import { randomUUID } from "node:crypto";
import { DEFAULT_CATEGORIES } from "../src/config/categories";
import { DEFAULT_PROJECTS } from "../src/config/projects";
import { db, dbClient } from "./db";
import { ensureSchema } from "./schema";

// Mirrors convertDefaultProjects() in TimeTrackingContext.tsx so seeded
// project ids match what the app would derive on a fresh, empty database.
function defaultProjectId(name: string, index: number): string {
	return `default-${index}-${name.toLowerCase().replace(/\s+/g, "-")}`;
}

async function seedCategories() {
	const count = await db("categories").count<{ count: string }[]>({ count: "*" });
	if (Number(count[0]?.count ?? 0) > 0) {
		console.log("Categories already seeded, skipping.");
		return;
	}

	const rows = DEFAULT_CATEGORIES.map((category) => ({
		id: category.id,
		name: category.name,
		color: category.color,
		is_billable: category.isBillable !== false
	}));
	await db("categories").insert(rows);
	console.log(`Seeded ${rows.length} default categories.`);
}

async function seedProjectsAndClients() {
	const count = await db("projects").count<{ count: string }[]>({ count: "*" });
	if (Number(count[0]?.count ?? 0) > 0) {
		console.log("Projects already seeded, skipping.");
		return;
	}

	const projectRows = DEFAULT_PROJECTS.map((project, index) => ({
		id: defaultProjectId(project.name, index),
		name: project.name,
		client: project.client,
		hourly_rate: project.hourlyRate ?? null,
		color: project.color,
		is_billable: project.isBillable !== false,
		archived: false
	}));
	await db("projects").insert(projectRows);
	console.log(`Seeded ${projectRows.length} default projects.`);

	// Mirrors the client-reconcile-on-load logic: every distinct project
	// client name becomes an active client.
	const existingClients = await db("clients").select("name");
	const existingNames = new Set(existingClients.map((c) => c.name));
	const clientNames = [...new Set(DEFAULT_PROJECTS.map((p) => p.client.trim()).filter(Boolean))];
	const newClients = clientNames
		.filter((name) => !existingNames.has(name))
		.map((name) => ({
			id: randomUUID(),
			name,
			archived: false,
			created_at: new Date()
		}));

	if (newClients.length > 0) {
		await db("clients").insert(newClients);
		console.log(`Seeded ${newClients.length} default clients.`);
	}
}

async function main() {
	console.log(`Seeding ${dbClient} database with default data...`);
	await ensureSchema(db);
	await seedCategories();
	await seedProjectsAndClients();
	console.log("✅ Seed complete.");
}

main()
	.catch((error) => {
		console.error("❌ Seed failed:", error);
		process.exitCode = 1;
	})
	.finally(() => db.destroy());
