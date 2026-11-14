import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearLocalAppData, clearSupabaseResponseCache, SUPABASE_API_CACHE } from "@/services/localStorageService/clearLocalData";
import { STORAGE_KEYS } from "@/services/localStorageService/constants";

describe("clearLocalAppData", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("removes entity blobs, their backups and saved report summaries", () => {
		localStorage.setItem(STORAGE_KEYS.PROJECTS, "{}");
		localStorage.setItem(STORAGE_KEYS.CLIENTS, "{}");
		localStorage.setItem(`${STORAGE_KEYS.ARCHIVED_DAYS}_v0_backup_123`, "{}");
		localStorage.setItem("ttp_report_2026-11-08_professional", "{}");

		clearLocalAppData();

		expect(localStorage.length).toBe(0);
	});

	it("keeps UI preferences", () => {
		localStorage.setItem("timetracker_task_board_view", "{}");
		localStorage.setItem("timetracker_background_notifications_enabled", "true");
		localStorage.setItem(STORAGE_KEYS.TODOS, "{}");

		clearLocalAppData();

		expect(localStorage.getItem("timetracker_task_board_view")).toBe("{}");
		expect(localStorage.getItem("timetracker_background_notifications_enabled")).toBe("true");
		expect(localStorage.getItem(STORAGE_KEYS.TODOS)).toBeNull();
	});
});

describe("clearSupabaseResponseCache", () => {
	it("deletes the legacy Supabase response cache", async () => {
		const deleteCache = vi.fn(async () => true);
		vi.stubGlobal("caches", { delete: deleteCache });

		await clearSupabaseResponseCache();

		expect(deleteCache).toHaveBeenCalledWith(SUPABASE_API_CACHE);
		vi.unstubAllGlobals();
	});

	it("does nothing when Cache Storage is unavailable", async () => {
		vi.stubGlobal("caches", undefined);
		await expect(clearSupabaseResponseCache()).resolves.toBeUndefined();
		vi.unstubAllGlobals();
	});
});
