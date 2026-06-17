import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import * as archivedDays from "./repositories/archivedDays";
import * as categories from "./repositories/categories";
import * as clients from "./repositories/clients";
import * as currentDay from "./repositories/currentDay";
import * as plannedTasks from "./repositories/plannedTasks";
import * as projects from "./repositories/projects";
import * as todos from "./repositories/todos";

type Handler = (req: Request, res: Response) => Promise<void>;

// Wraps async route handlers so rejected promises reach Express's error handler
// instead of crashing the process.
const wrap = (handler: Handler) => (req: Request, res: Response, next: NextFunction) => {
	handler(req, res).catch(next);
};

export function createApp() {
	const app = express();
	app.use(cors());
	app.use(express.json({ limit: "5mb" }));

	app.get("/api/health", (_req, res) => res.json({ ok: true }));

	app.get(
		"/api/current-day",
		wrap(async (_req, res) => {
			res.json(await currentDay.getCurrentDay());
		})
	);
	app.put(
		"/api/current-day",
		wrap(async (req, res) => {
			await currentDay.saveCurrentDay(req.body);
			res.status(204).end();
		})
	);

	app.get(
		"/api/archived-days",
		wrap(async (_req, res) => {
			res.json(await archivedDays.getArchivedDays());
		})
	);
	app.put(
		"/api/archived-days",
		wrap(async (req, res) => {
			await archivedDays.saveArchivedDays(req.body);
			res.status(204).end();
		})
	);
	app.patch(
		"/api/archived-days/:id",
		wrap(async (req, res) => {
			await archivedDays.updateArchivedDay(String(req.params.id), req.body);
			res.status(204).end();
		})
	);
	app.delete(
		"/api/archived-days/:id",
		wrap(async (req, res) => {
			await archivedDays.deleteArchivedDay(String(req.params.id));
			res.status(204).end();
		})
	);

	app.get(
		"/api/projects",
		wrap(async (_req, res) => {
			res.json(await projects.getProjects());
		})
	);
	app.put(
		"/api/projects",
		wrap(async (req, res) => {
			await projects.saveProjects(req.body);
			res.status(204).end();
		})
	);

	app.get(
		"/api/clients",
		wrap(async (_req, res) => {
			res.json(await clients.getClients());
		})
	);
	app.put(
		"/api/clients",
		wrap(async (req, res) => {
			await clients.saveClients(req.body);
			res.status(204).end();
		})
	);
	app.put(
		"/api/clients/:id",
		wrap(async (req, res) => {
			await clients.upsertClient(req.body);
			res.status(204).end();
		})
	);

	app.get(
		"/api/categories",
		wrap(async (_req, res) => {
			res.json(await categories.getCategories());
		})
	);
	app.put(
		"/api/categories",
		wrap(async (req, res) => {
			await categories.saveCategories(req.body);
			res.status(204).end();
		})
	);

	app.get(
		"/api/todos",
		wrap(async (_req, res) => {
			res.json(await todos.getTodos());
		})
	);
	app.put(
		"/api/todos",
		wrap(async (req, res) => {
			await todos.saveTodos(req.body);
			res.status(204).end();
		})
	);

	app.get(
		"/api/planned-tasks",
		wrap(async (_req, res) => {
			res.json(await plannedTasks.getPlannedTasks());
		})
	);
	app.put(
		"/api/planned-tasks",
		wrap(async (req, res) => {
			await plannedTasks.savePlannedTasks(req.body);
			res.status(204).end();
		})
	);
	app.put(
		"/api/planned-tasks/:id",
		wrap(async (req, res) => {
			await plannedTasks.upsertPlannedTask(req.body);
			res.status(204).end();
		})
	);
	app.delete(
		"/api/planned-tasks/:id",
		wrap(async (req, res) => {
			await plannedTasks.deletePlannedTask(String(req.params.id));
			res.status(204).end();
		})
	);

	app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
		console.error("❌ Request failed:", err);
		res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
	});

	return app;
}
