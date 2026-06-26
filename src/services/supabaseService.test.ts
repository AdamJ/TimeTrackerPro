import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Project, Client, TodoItem, DayRecord } from "@/contexts/TimeTrackingContext";
import type { TaskCategory } from "@/config/categories";

const {
	builder,
	fromMock,
	getCachedUserMock,
	getCachedProjectsMock,
	setCachedProjectsMock,
	getCachedCategoriesMock,
	setCachedCategoriesMock,
	getCachedClientsMock,
	setCachedClientsMock,
	trackDbCallMock,
	trackAuthCallMock
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
		getCachedUserMock: vi.fn(async () => ({ id: "user-1" })),
		getCachedProjectsMock: vi.fn(() => null as Project[] | null),
		setCachedProjectsMock: vi.fn(),
		getCachedCategoriesMock: vi.fn(() => null as TaskCategory[] | null),
		setCachedCategoriesMock: vi.fn(),
		getCachedClientsMock: vi.fn(() => null as Client[] | null),
		setCachedClientsMock: vi.fn(),
		trackDbCallMock: vi.fn(),
		trackAuthCallMock: vi.fn()
	};
});

vi.mock("@/lib/supabase", () => ({
	supabase: { from: fromMock, auth: { getUser: vi.fn() } },
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
			expect(setCachedProjectsMock).toHaveBeenCalledWith([
				{ id: "p2", name: "Beta", client: "Acme" }
			]);
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
			expect(setCachedCategoriesMock).toHaveBeenCalledWith([
				{ id: "c2", name: "Admin", color: "#111", isBillable: true }
			]);
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
