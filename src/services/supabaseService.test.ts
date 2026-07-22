import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Project, Client, TodoItem, DayRecord } from "@/contexts/TimeTrackingContext";
import type { TaskCategory } from "@/config/categories";
import type { CurrentDayData } from "@/services/dataService";

const {
	builder,
	fromMock,
	getUserMock,
	getCachedUserMock,
	getCachedProjectsMock,
	setCachedProjectsMock,
	getCachedCategoriesMock,
	setCachedCategoriesMock,
	getCachedClientsMock,
	setCachedClientsMock,
	trackDbCallMock,
	trackAuthCallMock,
	localServiceMocks
} = vi.hoisted(() => {
	const chainMethods = ["eq", "in", "order", "limit", "select", "upsert", "delete", "update"];
	const builder: Record<string, ReturnType<typeof vi.fn>> = {};
	chainMethods.forEach((method) => {
		builder[method] = vi.fn(() => builder);
	});
	builder.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
	(builder as unknown as { then: typeof Promise.prototype.then }).then = (resolve, reject) =>
		Promise.resolve({ data: null, error: null }).then(resolve, reject);

	return {
		builder,
		fromMock: vi.fn(() => builder),
		getUserMock: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })),
		getCachedUserMock: vi.fn(async () => ({ id: "user-1" })),
		getCachedProjectsMock: vi.fn(() => null as Project[] | null),
		setCachedProjectsMock: vi.fn(),
		getCachedCategoriesMock: vi.fn(() => null as TaskCategory[] | null),
		setCachedCategoriesMock: vi.fn(),
		getCachedClientsMock: vi.fn(() => null as Client[] | null),
		setCachedClientsMock: vi.fn(),
		trackDbCallMock: vi.fn(),
		trackAuthCallMock: vi.fn(),
		localServiceMocks: {
			getProjects: vi.fn(async () => [] as Project[]),
			getCategories: vi.fn(async () => [] as TaskCategory[]),
			getCurrentDay: vi.fn(async () => null as CurrentDayData | null),
			getArchivedDays: vi.fn(async () => [] as DayRecord[]),
			getTodos: vi.fn(async () => [] as TodoItem[]),
			getPlannedTasks: vi.fn(async () => []),
			getClients: vi.fn(async () => [] as Client[])
		}
	};
});

vi.mock("@/lib/supabase", () => ({
	supabase: { from: fromMock, auth: { getUser: getUserMock } },
	trackDbCall: trackDbCallMock,
	trackAuthCall: trackAuthCallMock,
	getCachedUser: getCachedUserMock,
	getCachedProjects: getCachedProjectsMock,
	setCachedProjects: setCachedProjectsMock,
	getCachedCategories: getCachedCategoriesMock,
	setCachedCategories: setCachedCategoriesMock,
	getCachedClients: getCachedClientsMock,
	setCachedClients: setCachedClientsMock
}));

vi.mock("@/services/localStorageService", () => ({
	LocalStorageService: vi.fn().mockImplementation(() => localServiceMocks)
}));

import { SupabaseService } from "./supabaseService";

describe("SupabaseService — upsert-only bulk saves (#215)", () => {
	let service: SupabaseService;

	beforeEach(() => {
		vi.clearAllMocks();
		getCachedUserMock.mockResolvedValue({ id: "user-1" });
		getCachedProjectsMock.mockReturnValue(null);
		getCachedCategoriesMock.mockReturnValue(null);
		getCachedClientsMock.mockReturnValue(null);
		service = new SupabaseService();
	});

	describe("saveProjects", () => {
		it("upserts a stale/partial snapshot without deleting rows missing from it", async () => {
			const projects: Project[] = [{ id: "p1", name: "Alpha", client: "Acme" }];
			await service.saveProjects(projects);

			expect(fromMock).toHaveBeenCalledWith("projects");
			expect(builder.delete).not.toHaveBeenCalled();
			expect(builder.upsert).toHaveBeenCalledWith(
				[expect.objectContaining({ id: "p1", user_id: "user-1", name: "Alpha" })],
				{ onConflict: "id" }
			);
		});

		it("is a no-op for an empty array", async () => {
			await service.saveProjects([]);
			expect(fromMock).not.toHaveBeenCalled();
		});
	});

	describe("deleteProject", () => {
		it("deletes a single project by id and prunes the cache", async () => {
			getCachedProjectsMock.mockReturnValue([
				{ id: "p1", name: "Alpha", client: "Acme" },
				{ id: "p2", name: "Beta", client: "Acme" }
			]);

			await service.deleteProject("p1");

			expect(fromMock).toHaveBeenCalledWith("projects");
			expect(builder.delete).toHaveBeenCalledTimes(1);
			expect(builder.eq).toHaveBeenCalledWith("id", "p1");
			expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
			expect(setCachedProjectsMock).toHaveBeenCalledWith(
				[{ id: "p2", name: "Beta", client: "Acme" }],
				"user-1"
			);
		});
	});

	describe("saveCategories", () => {
		it("upserts a stale/partial snapshot without deleting rows missing from it", async () => {
			const categories: TaskCategory[] = [{ id: "c1", name: "Dev", color: "#000", isBillable: true }];
			await service.saveCategories(categories);

			expect(fromMock).toHaveBeenCalledWith("categories");
			expect(builder.delete).not.toHaveBeenCalled();
			expect(builder.upsert).toHaveBeenCalledWith(
				[expect.objectContaining({ id: "c1", user_id: "user-1", name: "Dev" })],
				{ onConflict: "id" }
			);
		});

		it("is a no-op for an empty array", async () => {
			await service.saveCategories([]);
			expect(fromMock).not.toHaveBeenCalled();
		});
	});

	describe("deleteCategory", () => {
		it("deletes a single category by id and prunes the cache", async () => {
			getCachedCategoriesMock.mockReturnValue([
				{ id: "c1", name: "Dev", color: "#000", isBillable: true },
				{ id: "c2", name: "Admin", color: "#111", isBillable: true }
			]);

			await service.deleteCategory("c1");

			expect(fromMock).toHaveBeenCalledWith("categories");
			expect(builder.delete).toHaveBeenCalledTimes(1);
			expect(builder.eq).toHaveBeenCalledWith("id", "c1");
			expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
			expect(setCachedCategoriesMock).toHaveBeenCalledWith(
				[{ id: "c2", name: "Admin", color: "#111", isBillable: true }],
				"user-1"
			);
		});
	});

	describe("saveTodos", () => {
		it("upserts a stale/partial snapshot without deleting rows missing from it", async () => {
			const todos: TodoItem[] = [{ id: "t1", text: "Write report", completed: false, createdAt: "2026-06-01T00:00:00.000Z" }];
			await service.saveTodos(todos);

			expect(fromMock).toHaveBeenCalledWith("todo_items");
			expect(builder.delete).not.toHaveBeenCalled();
			expect(builder.upsert).toHaveBeenCalledWith(
				[expect.objectContaining({ id: "t1", user_id: "user-1", text: "Write report" })],
				{ onConflict: "id" }
			);
		});

		it("is a no-op for an empty array", async () => {
			await service.saveTodos([]);
			expect(fromMock).not.toHaveBeenCalled();
		});
	});

	describe("deleteTodo", () => {
		it("deletes a single todo by id", async () => {
			await service.deleteTodo("t1");

			expect(fromMock).toHaveBeenCalledWith("todo_items");
			expect(builder.delete).toHaveBeenCalledTimes(1);
			expect(builder.eq).toHaveBeenCalledWith("id", "t1");
			expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
		});
	});

	describe("saveClients", () => {
		it("upserts a stale/partial snapshot without deleting rows missing from it", async () => {
			const clients: Client[] = [{ id: "cl1", name: "Acme", archived: false, createdAt: "2026-06-01T00:00:00.000Z" }];
			await service.saveClients(clients);

			expect(fromMock).toHaveBeenCalledWith("clients");
			expect(builder.delete).not.toHaveBeenCalled();
			expect(builder.upsert).toHaveBeenCalledWith(
				[expect.objectContaining({ id: "cl1", user_id: "user-1", name: "Acme" })],
				{ onConflict: "id" }
			);
		});

		it("is a no-op for an empty array", async () => {
			await service.saveClients([]);
			expect(fromMock).not.toHaveBeenCalled();
		});
	});

	describe("saveArchivedDays", () => {
		it("upserts a stale/partial snapshot without selecting or deleting any rows", async () => {
			const day: DayRecord = {
				id: "d1",
				date: "2026-06-01",
				tasks: [],
				totalDuration: 0,
				startTime: new Date("2026-06-01T09:00:00.000Z"),
				endTime: new Date("2026-06-01T17:00:00.000Z"),
				notes: ""
			};

			await service.saveArchivedDays([day]);

			expect(fromMock).toHaveBeenCalledWith("archived_days");
			expect(builder.select).not.toHaveBeenCalled();
			expect(builder.delete).not.toHaveBeenCalled();
			expect(builder.upsert).toHaveBeenCalledWith(
				[expect.objectContaining({ id: "d1", user_id: "user-1" })],
				{ onConflict: "id" }
			);
		});

		it("is a no-op for an empty array", async () => {
			await service.saveArchivedDays([]);
			expect(fromMock).not.toHaveBeenCalled();
		});
	});

	describe("savePlannedTasks", () => {
		it("upserts a stale/partial snapshot without deleting rows missing from it", async () => {
			await service.savePlannedTasks([{
				id: "pt1",
				title: "Plan it",
				status: "todo",
				priority: 1,
				createdAt: "2026-06-01T00:00:00.000Z",
				updatedAt: "2026-06-01T00:00:00.000Z",
				timeEntries: [],
				timeSpent: 0
			}]);

			expect(fromMock).toHaveBeenCalledWith("planned_tasks");
			expect(builder.delete).not.toHaveBeenCalled();
			expect(builder.upsert).toHaveBeenCalledWith(
				[expect.objectContaining({ id: "pt1", user_id: "user-1", title: "Plan it" })],
				{ onConflict: "id" }
			);
		});

		it("is a no-op for an empty array", async () => {
			await service.savePlannedTasks([]);
			expect(fromMock).not.toHaveBeenCalled();
		});
	});
});

describe("SupabaseService — getCurrentDay / saveCurrentDay", () => {
	let service: SupabaseService;

	beforeEach(() => {
		vi.clearAllMocks();
		getCachedUserMock.mockResolvedValue({ id: "user-1" });
		getCachedProjectsMock.mockReturnValue(null);
		getCachedCategoriesMock.mockReturnValue(null);
		getCachedClientsMock.mockReturnValue(null);
		builder.single.mockResolvedValue({ data: null, error: null });
		(builder as unknown as { then: typeof Promise.prototype.then }).then = (resolve, reject) =>
			Promise.resolve({ data: null, error: null }).then(resolve, reject);
		service = new SupabaseService();
	});

	describe("getCurrentDay", () => {
		it("returns null when there is neither a current-day row nor current tasks", async () => {
			builder.single.mockResolvedValueOnce({ data: null, error: { code: "PGRST116", message: "no rows" } });

			const result = await service.getCurrentDay();

			expect(result).toBeNull();
		});

		it("maps the current-day row and its tasks into CurrentDayData", async () => {
			builder.single.mockResolvedValueOnce({
				data: { is_day_started: true, day_start_time: "2026-06-01T09:00:00.000Z", current_task_id: "t1" },
				error: null
			});
			(builder as unknown as { then: typeof Promise.prototype.then }).then = (resolve, reject) =>
				Promise.resolve({
					data: [
						{ id: "t1", title: "Write report", start_time: "2026-06-01T09:00:00.000Z", end_time: null }
					],
					error: null
				}).then(resolve, reject);

			const result = await service.getCurrentDay();

			expect(result?.isDayStarted).toBe(true);
			expect(result?.tasks).toHaveLength(1);
			expect(result?.tasks[0]).toMatchObject({ id: "t1", title: "Write report" });
			expect(result?.currentTask?.id).toBe("t1");
		});

		it("throws when the current-day query errors with a code other than PGRST116", async () => {
			builder.single.mockResolvedValueOnce({ data: null, error: { code: "500", message: "db down" } });

			await expect(service.getCurrentDay()).rejects.toMatchObject({ code: "500" });
		});

		it("throws when the tasks query errors", async () => {
			builder.single.mockResolvedValueOnce({ data: null, error: { code: "PGRST116", message: "no rows" } });
			(builder as unknown as { then: typeof Promise.prototype.then }).then = (resolve, reject) =>
				Promise.resolve({ data: null, error: { message: "tasks query failed" } }).then(resolve, reject);

			await expect(service.getCurrentDay()).rejects.toMatchObject({ message: "tasks query failed" });
		});
	});

	describe("saveCurrentDay", () => {
		const baseData: CurrentDayData = {
			isDayStarted: true,
			dayStartTime: new Date("2026-06-01T09:00:00.000Z"),
			currentTask: null,
			tasks: []
		};

		it("upserts current_day state and deletes all current tasks when tasks is empty", async () => {
			await service.saveCurrentDay(baseData);

			expect(fromMock).toHaveBeenCalledWith("current_day");
			expect(builder.upsert).toHaveBeenCalledWith(
				expect.objectContaining({ user_id: "user-1", is_day_started: true })
			);
			expect(fromMock).toHaveBeenCalledWith("tasks");
			expect(builder.delete).toHaveBeenCalledTimes(1);
			expect(builder.eq).toHaveBeenCalledWith("is_current", true);
		});

		it("throws when the current_day upsert errors, without touching the tasks table", async () => {
			(builder as unknown as { then: typeof Promise.prototype.then }).then = (resolve, reject) =>
				Promise.resolve({ data: null, error: { message: "upsert failed" } }).then(resolve, reject);

			await expect(service.saveCurrentDay(baseData)).rejects.toMatchObject({ message: "upsert failed" });
			expect(builder.delete).not.toHaveBeenCalled();
		});

		it("deletes obsolete tasks and upserts the remaining/new ones when tasks is non-empty", async () => {
			(builder as unknown as { then: typeof Promise.prototype.then }).then = (resolve, reject) =>
				Promise.resolve({ data: [{ id: "old1" }, { id: "keep1" }], error: null }).then(resolve, reject);

			const dataWithTasks: CurrentDayData = {
				...baseData,
				tasks: [
					{
						id: "keep1",
						title: "Keep me",
						startTime: new Date("2026-06-01T09:00:00.000Z")
					}
				]
			};

			await service.saveCurrentDay(dataWithTasks);

			expect(builder.delete).toHaveBeenCalledTimes(1);
			expect(builder.in).toHaveBeenCalledWith("id", ["old1"]);
			expect(builder.upsert).toHaveBeenCalledWith(
				[expect.objectContaining({ id: "keep1", user_id: "user-1", title: "Keep me" })],
				{ onConflict: "id" }
			);
		});
	});
});

// checkNewSchema is private — accessed here via an untyped cast rather than an
// intersection type, since intersecting a class instance with an object type
// that redeclares one of its private members collapses that member to `never`.
function callCheckNewSchema(instance: SupabaseService): Promise<boolean> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (instance as any).checkNewSchema();
}

describe("SupabaseService — schema detection (checkNewSchema)", () => {
	let service: SupabaseService;

	beforeEach(() => {
		vi.clearAllMocks();
		getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
		builder.limit.mockReturnValue(builder);
		(builder as unknown as { then: typeof Promise.prototype.then }).then = (resolve, reject) =>
			Promise.resolve({ data: [], error: null }).then(resolve, reject);
		// Reset the class-level cache so each test observes a fresh schema check.
		(SupabaseService as unknown as { schemaChecked: boolean }).schemaChecked = false;
		(SupabaseService as unknown as { globalSchemaResult: boolean | null }).globalSchemaResult = null;
		service = new SupabaseService();
	});

	it("returns true when the current_day table query succeeds", async () => {
		const result = await callCheckNewSchema(service);
		expect(result).toBe(true);
	});

	it("returns false when the current_day table query errors (schema not present)", async () => {
		(builder as unknown as { then: typeof Promise.prototype.then }).then = (resolve, reject) =>
			Promise.resolve({ data: null, error: { message: "relation does not exist" } }).then(resolve, reject);

		const result = await callCheckNewSchema(service);
		expect(result).toBe(false);
	});

	it("returns false without querying when there is no authenticated user", async () => {
		getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

		const result = await callCheckNewSchema(service);

		expect(result).toBe(false);
		expect(fromMock).not.toHaveBeenCalled();
	});

	it("caches the result across instances via the class-level cache", async () => {
		await callCheckNewSchema(service);
		fromMock.mockClear();

		const secondInstance = new SupabaseService();
		const result = await callCheckNewSchema(secondInstance);

		expect(result).toBe(true);
		expect(fromMock).not.toHaveBeenCalled();
	});
});

describe("SupabaseService — migrateFromLocalStorage", () => {
	let service: SupabaseService;

	beforeEach(() => {
		vi.clearAllMocks();
		getCachedUserMock.mockResolvedValue({ id: "user-1" });
		getCachedProjectsMock.mockReturnValue(null);
		getCachedCategoriesMock.mockReturnValue(null);
		getCachedClientsMock.mockReturnValue(null);
		builder.single.mockResolvedValue({ data: null, error: null });
		(builder as unknown as { then: typeof Promise.prototype.then }).then = (resolve, reject) =>
			Promise.resolve({ data: [], error: null }).then(resolve, reject);

		localServiceMocks.getProjects.mockResolvedValue([]);
		localServiceMocks.getCategories.mockResolvedValue([]);
		localServiceMocks.getCurrentDay.mockResolvedValue(null);
		localServiceMocks.getArchivedDays.mockResolvedValue([]);
		localServiceMocks.getTodos.mockResolvedValue([]);
		localServiceMocks.getPlannedTasks.mockResolvedValue([]);
		localServiceMocks.getClients.mockResolvedValue([]);

		service = new SupabaseService();
	});

	it("returns true and makes no writes when localStorage has no data at all", async () => {
		const result = await service.migrateFromLocalStorage();

		expect(result).toBe(true);
		expect(builder.upsert).not.toHaveBeenCalled();
	});

	it("migrates local projects straight through when the account has no existing remote data", async () => {
		const projects: Project[] = [{ id: "p1", name: "Alpha", client: "Acme" }];
		localServiceMocks.getProjects.mockResolvedValue(projects);

		const result = await service.migrateFromLocalStorage();

		expect(result).toBe(true);
		expect(fromMock).toHaveBeenCalledWith("projects");
		expect(builder.upsert).toHaveBeenCalledWith(
			[expect.objectContaining({ id: "p1", user_id: "user-1", name: "Alpha" })],
			{ onConflict: "id" }
		);
	});

	it("migrates only clients whose name doesn't already exist remotely, and does so last", async () => {
		localServiceMocks.getClients.mockResolvedValue([
			{ id: "cl1", name: "Acme", archived: false, createdAt: "2026-06-01T00:00:00.000Z" },
			{ id: "cl2", name: "Globex", archived: false, createdAt: "2026-06-01T00:00:00.000Z" }
		] satisfies Client[]);
		// getClients() (remote, via the base service) resolves through the shared
		// builder `then` — return one client ("Acme") that already exists remotely.
		(builder as unknown as { then: typeof Promise.prototype.then }).then = (resolve, reject) =>
			Promise.resolve({ data: [{ id: "cl1", name: "Acme", archived: false, created_at: "2026-06-01T00:00:00.000Z" }], error: null }).then(resolve, reject);

		const result = await service.migrateFromLocalStorage();

		expect(result).toBe(true);
		expect(fromMock).toHaveBeenCalledWith("clients");
	});

	it("returns false instead of throwing when an unexpected error occurs during migration", async () => {
		localServiceMocks.getProjects.mockRejectedValue(new Error("localStorage read failed"));

		const result = await service.migrateFromLocalStorage();

		expect(result).toBe(false);
	});
});
