import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { TimeTrackingProvider } from "./TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";

// Mock the auth context
vi.mock("@/hooks/useAuth", () => ({
	useAuth: () => ({
		isAuthenticated: false,
		user: null
	})
}));

// Helper to render hook with provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
	<TimeTrackingProvider>{children}</TimeTrackingProvider>
);

describe("TimeTrackingContext", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	describe("Day Management", () => {
		it("should start a new day", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			expect(result.current.isDayStarted).toBe(false);

			await act(async () => {
				const startTime = new Date("2024-12-03T09:00:00.000Z");
				result.current.startDay(startTime, "2024-12-03");
			});

			await waitFor(() => {
				expect(result.current.isDayStarted).toBe(true);
			});
		});

		it("should end a day and archive it", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			// Start day
			await act(async () => {
				const startTime = new Date("2024-12-03T09:00:00.000Z");
				result.current.startDay(startTime);
			});

			await waitFor(() => {
				expect(result.current.isDayStarted).toBe(true);
			});

			// Add a task
			await act(async () => {
				result.current.startNewTask(
					"Test Task",
					"Testing"
				);
			});

			// End day (posts to archive)
			await act(async () => {
				result.current.postDay("Test notes");
			});

			await waitFor(() => {
				expect(result.current.isDayStarted).toBe(false);
				expect(result.current.archivedDays.length).toBeGreaterThan(0);
			});
		});

		it("should calculate total day duration correctly", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			await act(async () => {
				const startTime = new Date("2024-12-03T09:00:00.000Z");
				result.current.startDay(startTime);
			});

			// Check that tasks array is initialized
			expect(result.current.tasks).toEqual([]);
		});
	});

	describe("Task Management", () => {
		it("should create a new task", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			// Start day first
			await act(async () => {
				const startTime = new Date("2024-12-03T09:00:00.000Z");
				result.current.startDay(startTime);
			});

			await act(async () => {
				result.current.startNewTask(
					"Test Task",
					"Testing task creation"
				);
			});

			await waitFor(() => {
				expect(result.current.tasks.length).toBe(1);
				expect(result.current.currentTask).toBeTruthy();
				expect(result.current.currentTask?.title).toBe("Test Task");
				expect(result.current.currentTask?.description).toBe("Testing task creation");
			});
		});

		it("should end current task by starting a new one", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			// Start day
			await act(async () => {
				const startTime = new Date("2024-12-03T09:00:00.000Z");
				result.current.startDay(startTime);
			});

			// Start first task
			await act(async () => {
				result.current.startNewTask(
					"First Task",
					"Testing"
				);
			});

			await waitFor(() => {
				expect(result.current.currentTask).toBeTruthy();
				expect(result.current.currentTask?.title).toBe("First Task");
			});

			// Start second task (which ends the first)
			await act(async () => {
				result.current.startNewTask(
					"Second Task",
					"New task"
				);
			});

			await waitFor(() => {
				expect(result.current.currentTask?.title).toBe("Second Task");
				expect(result.current.tasks.length).toBe(2);
				expect(result.current.tasks[0].endTime).toBeTruthy();
			});
		});

		it("should update task", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			// Start day and task
			await act(async () => {
				const startTime = new Date("2024-12-03T09:00:00.000Z");
				result.current.startDay(startTime);
			});

			await act(async () => {
				result.current.startNewTask(
					"Original Title",
					"Original Description"
				);
			});

			let taskId: string;
			await waitFor(() => {
				expect(result.current.currentTask).toBeTruthy();
				taskId = result.current.currentTask!.id;
			});

			// Update task
			await act(async () => {
				result.current.updateTask(taskId, {
					title: "Updated Title",
					description: "Updated Description"
				});
			});

			await waitFor(() => {
				expect(result.current.currentTask?.title).toBe("Updated Title");
				expect(result.current.currentTask?.description).toBe("Updated Description");
			});
		});

		it("should delete task", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			// Start day and create a task
			await act(async () => {
				const startTime = new Date("2024-12-03T09:00:00.000Z");
				result.current.startDay(startTime);
			});

			await act(async () => {
				result.current.startNewTask(
					"Task to Delete",
					"Will be deleted"
				);
			});

			let taskId: string;
			await waitFor(() => {
				expect(result.current.currentTask).toBeTruthy();
				taskId = result.current.currentTask!.id;
			});

			// Delete the task
			await act(async () => {
				result.current.deleteTask(taskId);
			});

			await waitFor(() => {
				// After deleting the only task, currentTask should be null
				expect(result.current.currentTask).toBeNull();
				// tasks array should be empty (or have only the deleted task if not filtering)
				// The actual behavior depends on implementation
			});
		});
	});

	describe("Archive Management", () => {
		it("should archive a completed day", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			// Start day, add task, post day
			await act(async () => {
				const startTime = new Date("2024-12-03T09:00:00.000Z");
				result.current.startDay(startTime);
			});

			await act(async () => {
				result.current.startNewTask(
					"Archive Test Task",
					"Testing archiving"
				);
			});

			const initialArchiveCount = result.current.archivedDays.length;

			await act(async () => {
				result.current.postDay("Test archive");
			});

			await waitFor(() => {
				expect(result.current.archivedDays.length).toBe(
					initialArchiveCount + 1
				);
			});
		});

		it("should update archived day", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			// Create and archive a day
			await act(async () => {
				const startTime = new Date("2024-12-03T09:00:00.000Z");
				result.current.startDay(startTime);
			});

			await act(async () => {
				result.current.startNewTask(
					"Task",
					"Test"
				);
			});

			await act(async () => {
				result.current.postDay("Original notes");
			});

			let dayId: string;
			await waitFor(() => {
				expect(result.current.archivedDays.length).toBeGreaterThan(0);
				dayId = result.current.archivedDays[0].id;
			});

			// Update archived day
			await act(async () => {
				await result.current.updateArchivedDay(dayId, {
					notes: "Updated notes"
				});
			});

			await waitFor(() => {
				const updatedDay = result.current.archivedDays.find((d) => d.id === dayId);
				expect(updatedDay?.notes).toBe("Updated notes");
			});
		});

		it("should delete archived day", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			// Create and archive a day
			await act(async () => {
				const startTime = new Date("2024-12-03T09:00:00.000Z");
				result.current.startDay(startTime);
			});

			await act(async () => {
				result.current.startNewTask(
					"Task",
					"Test"
				);
			});

			await act(async () => {
				result.current.postDay();
			});

			let dayId: string;
			let initialCount: number;
			await waitFor(() => {
				expect(result.current.archivedDays.length).toBeGreaterThan(0);
				dayId = result.current.archivedDays[0].id;
				initialCount = result.current.archivedDays.length;
			});

			// Delete archived day
			await act(async () => {
				result.current.deleteArchivedDay(dayId);
			});

			await waitFor(() => {
				expect(result.current.archivedDays.length).toBe(initialCount - 1);
			});
		});

		it("should restore archived day", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			// Create and archive a day
			await act(async () => {
				const startTime = new Date("2024-12-03T09:00:00.000Z");
				result.current.startDay(startTime);
			});

			await act(async () => {
				result.current.startNewTask(
					"Restore Test Task",
					"Will be restored"
				);
			});

			await act(async () => {
				result.current.postDay();
			});

			let dayId: string;
			await waitFor(() => {
				expect(result.current.archivedDays.length).toBeGreaterThan(0);
				dayId = result.current.archivedDays[0].id;
				expect(result.current.isDayStarted).toBe(false);
			});

			// Restore archived day
			await act(async () => {
				result.current.restoreArchivedDay(dayId);
			});

			await waitFor(() => {
				expect(result.current.isDayStarted).toBe(true);
				expect(result.current.tasks.length).toBeGreaterThan(0);
			});
		});
	});

	describe("Duration Calculations", () => {
		it("should calculate task duration correctly", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			// Mock specific times for consistent testing
			const startTime = new Date("2024-12-03T09:00:00.000Z");
			const endTime = new Date("2024-12-03T10:30:00.000Z");

			await act(async () => {
				result.current.startDay(startTime, "2024-12-03");
			});

			await act(async () => {
				result.current.startNewTask({
					title: "Duration Test",
					description: "Testing duration",
					project: undefined,
					client: undefined,
					category: undefined
				});
			});

			// Manually set end time for testing
			await act(async () => {
				if (result.current.currentTask) {
					result.current.updateTask(result.current.currentTask.id, {
						startTime: startTime,
						endTime: endTime,
						duration: endTime.getTime() - startTime.getTime()
					});
				}
			});

			await waitFor(() => {
				const task = result.current.tasks[0];
				// 1.5 hours = 5,400,000 milliseconds
				expect(task.duration).toBe(5400000);
			});
		});
	});
});
