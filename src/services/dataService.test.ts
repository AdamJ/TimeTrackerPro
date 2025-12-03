import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	createDataService
} from "./dataService";
import type { DayRecord, Task } from "@/contexts/TimeTrackingContext";

describe("DataService", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	describe("LocalStorageService (via factory)", () => {
		let service: ReturnType<typeof createDataService>;

		beforeEach(() => {
			service = createDataService(false); // false = guest mode = LocalStorageService
		});

		describe("saveCurrentDay", () => {
			it("should save current day state to localStorage", async () => {
				const mockState = {
					isDayStarted: true,
					dayStartTime: new Date("2024-12-03T09:00:00.000Z"),
					currentTask: null,
					tasks: [] as Task[]
				};

				await service.saveCurrentDay(mockState);

				const saved = localStorage.getItem("timetracker_current_day");
				expect(saved).toBeTruthy();
				const parsed = JSON.parse(saved!);
				expect(parsed.isDayStarted).toBe(true);
			});

			it("should handle empty tasks array", async () => {
				const mockState = {
					isDayStarted: true,
					dayStartTime: new Date("2024-12-03T09:00:00.000Z"),
					currentTask: null,
					tasks: [] as Task[]
				};

				await expect(service.saveCurrentDay(mockState)).resolves.not.toThrow();
			});
		});

		describe("getCurrentDay", () => {
			it("should load current day state from localStorage", async () => {
				// Setup: Save some data first
				const mockData = {
					isDayStarted: true,
					dayStartTime: new Date("2024-12-03T09:00:00.000Z"),
					currentTask: null,
					tasks: []
				};
				await service.saveCurrentDay(mockData);

				const state = await service.getCurrentDay();

				expect(state).toBeTruthy();
				expect(state?.isDayStarted).toBe(true);
				expect(state?.dayStartTime).toBeInstanceOf(Date);
				expect(state?.tasks).toEqual([]);
			});

			it("should return null when no data exists", async () => {
				const state = await service.getCurrentDay();
				expect(state).toBeNull();
			});

			it("should handle corrupted localStorage data gracefully", async () => {
				localStorage.setItem("timetracker_current_day", "invalid json");

				const state = await service.getCurrentDay();
				expect(state).toBeNull();
			});
		});

		describe("saveArchivedDays", () => {
			it("should save archived days to localStorage", async () => {
				const mockArchivedDays: DayRecord[] = [
					{
						id: "day-1",
						date: "2024-12-01",
						startTime: new Date("2024-12-01T09:00:00.000Z"),
						endTime: new Date("2024-12-01T17:00:00.000Z"),
						totalDuration: 28800000, // 8 hours
						tasks: []
					}
				];

				await service.saveArchivedDays(mockArchivedDays);

				const saved = localStorage.getItem("timetracker_archived_days");
				expect(saved).toBeTruthy();

				const parsed = JSON.parse(saved!);
				expect(parsed).toHaveLength(1);
				expect(parsed[0].id).toBe("day-1");
			});
		});

		describe("getArchivedDays", () => {
			it("should load archived days from localStorage", async () => {
				const mockArchivedDays: DayRecord[] = [
					{
						id: "day-1",
						date: "2024-12-01",
						startTime: new Date("2024-12-01T09:00:00.000Z"),
						endTime: new Date("2024-12-01T17:00:00.000Z"),
						totalDuration: 28800000,
						tasks: []
					}
				];

				await service.saveArchivedDays(mockArchivedDays);
				const loaded = await service.getArchivedDays();

				expect(loaded).toHaveLength(1);
				expect(loaded[0].id).toBe("day-1");
				expect(loaded[0].startTime).toBeInstanceOf(Date);
				expect(loaded[0].endTime).toBeInstanceOf(Date);
			});

			it("should return empty array when no archived days exist", async () => {
				const days = await service.getArchivedDays();
				expect(days).toEqual([]);
			});
		});
	});

	describe("createDataService", () => {
		it("should create service for guest mode", () => {
			const service = createDataService(false);
			expect(service).toBeTruthy();
			expect(typeof service.saveCurrentDay).toBe("function");
			expect(typeof service.getCurrentDay).toBe("function");
			expect(typeof service.saveArchivedDays).toBe("function");
			expect(typeof service.getArchivedDays).toBe("function");
		});

		it("should create appropriate service based on authentication", () => {
			const guestService = createDataService(false);
			expect(guestService).toBeTruthy();
			expect(typeof guestService.saveCurrentDay).toBe("function");

			// Note: SupabaseService would be created with isAuthenticated=true
			// but we can't easily test that without mocking Supabase
		});
	});
});
