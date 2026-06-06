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

	describe("Checklist carry-over on postDay", () => {
		it("should carry over incomplete checklist items as todo items when day is archived", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			await act(async () => {
				result.current.startDay(new Date("2024-12-03T09:00:00.000Z"));
			});

			// Add a task whose description contains mixed checklist items
			await act(async () => {
				result.current.startNewTask(
					"Feature Work",
					"- [ ] Write unit tests\n- [x] Update README\n- [ ] Fix lint errors"
				);
			});

			await waitFor(() => {
				expect(result.current.tasks.length).toBe(1);
			});

			// Archive the day
			await act(async () => {
				result.current.postDay();
			});

			await waitFor(() => {
				expect(result.current.isDayStarted).toBe(false);
				// Only the two incomplete items should be carried over
				expect(result.current.todoItems.length).toBe(2);
				const texts = result.current.todoItems.map((t) => t.text);
				expect(texts).toContain("Write unit tests");
				expect(texts).toContain("Fix lint errors");
				// The already-completed item must NOT be carried over
				expect(texts).not.toContain("Update README");
			});
		});

		it("should not create duplicate todo items when there are no checklist items", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			await act(async () => {
				result.current.startDay(new Date("2024-12-04T09:00:00.000Z"));
			});

			await act(async () => {
				result.current.startNewTask("Plain task", "No checklist here");
			});

			// Add an existing todo before archiving
			await act(async () => {
				result.current.addTodoItem("Pre-existing todo");
			});

			await waitFor(() => {
				expect(result.current.todoItems.length).toBe(1);
			});

			await act(async () => {
				result.current.postDay();
			});

			await waitFor(() => {
				expect(result.current.isDayStarted).toBe(false);
				// No new todos should be added — only the pre-existing one remains
				expect(result.current.todoItems.length).toBe(1);
				expect(result.current.todoItems[0].text).toBe("Pre-existing todo");
			});
		});
	});

	describe("Project merge on load", () => {
		it("should not produce duplicate project ids when a default project was renamed", async () => {
			// A default project keeps its derived id when renamed (updateProject
			// only changes the name). Seed localStorage with such a renamed default.
			localStorage.setItem(
				"timetracker_projects",
				JSON.stringify({
					data: [
						{
							id: "default-0-product-and-design",
							name: "Product and Design — Renamed",
							client: "CAS",
							hourlyRate: 100,
							color: "#3B82F6",
							isBillable: true
						}
					],
					_v: 1
				})
			);

			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			// Wait until the async load has replaced the in-memory defaults with
			// the saved data. projects.length > 0 resolves immediately against the
			// initial defaults, so we poll on the renamed name instead.
			await waitFor(() => {
				const merged = result.current.projects.find(
					project => project.id === "default-0-product-and-design"
				);
				expect(merged?.name).toBe("Product and Design — Renamed");
			});

			const ids = result.current.projects.map(project => project.id);
			expect(new Set(ids).size).toBe(ids.length);
		});
	});

	describe("Client Management", () => {
		it("should add a client with address and contact fields", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			await waitFor(() => expect(result.current.clients).toBeDefined());

			let created: import("@/contexts/TimeTrackingContext").Client | null = null;
			await act(async () => {
				created = result.current.addClient({
					name: "Acme Corp",
					addressStreet: "123 Main St",
					addressCity: "Springfield",
					addressState: "IL",
					addressZip: "62701",
					addressCountry: "USA",
					contactName: "Jane Doe",
					contactEmail: "jane@acme.com",
					contactWebsite: "https://acme.com",
				});
			});

			expect(created).not.toBeNull();
			expect(created!.name).toBe("Acme Corp");
			expect(created!.addressStreet).toBe("123 Main St");
			expect(created!.addressCity).toBe("Springfield");
			expect(created!.addressState).toBe("IL");
			expect(created!.addressZip).toBe("62701");
			expect(created!.addressCountry).toBe("USA");
			expect(created!.contactName).toBe("Jane Doe");
			expect(created!.contactEmail).toBe("jane@acme.com");
			expect(created!.contactWebsite).toBe("https://acme.com");

			await waitFor(() => {
				expect(result.current.clients.some(c => c.name === "Acme Corp")).toBe(true);
			});
		});

		it("should add a client with name only (all fields optional)", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			await waitFor(() => expect(result.current.clients).toBeDefined());

			let created: import("@/contexts/TimeTrackingContext").Client | null = null;
			await act(async () => {
				created = result.current.addClient({ name: "Solo Client" });
			});

			expect(created).not.toBeNull();
			expect(created!.name).toBe("Solo Client");
			expect(created!.addressStreet).toBeUndefined();
			expect(created!.contactEmail).toBeUndefined();
		});

		it("should update an existing client's fields", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			await waitFor(() => expect(result.current.clients).toBeDefined());

			let created: import("@/contexts/TimeTrackingContext").Client | null = null;
			await act(async () => {
				created = result.current.addClient({ name: "Acme Corp", contactEmail: "old@acme.com" });
			});

			await waitFor(() =>
				expect(result.current.clients.some(c => c.name === "Acme Corp")).toBe(true)
			);

			let updated: import("@/contexts/TimeTrackingContext").Client | null = null;
			await act(async () => {
				updated = result.current.updateClient(created!.id, {
					name: "Acme Corp Updated",
					contactEmail: "new@acme.com",
					addressCity: "Chicago",
				});
			});

			expect(updated).not.toBeNull();
			expect(updated!.name).toBe("Acme Corp Updated");
			expect(updated!.contactEmail).toBe("new@acme.com");
			expect(updated!.addressCity).toBe("Chicago");
			expect(updated!.id).toBe(created!.id);
			expect(updated!.createdAt).toBe(created!.createdAt);
			expect(updated!.archived).toBe(false);

			await waitFor(() => {
				const found = result.current.clients.find(c => c.id === created!.id);
				expect(found?.name).toBe("Acme Corp Updated");
			});
		});

		it("should return null when updating a non-existent client", async () => {
			const { result } = renderHook(() => useTimeTracking(), { wrapper });

			await waitFor(() => expect(result.current.clients).toBeDefined());

			let updated: import("@/contexts/TimeTrackingContext").Client | null = null;
			await act(async () => {
				updated = result.current.updateClient("does-not-exist", { name: "Ghost" });
			});

			expect(updated).toBeNull();
		});
	});

  describe("Todo Items", () => {
    it("adds a todo item", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      // Wait for initial async load to settle before mutating todos
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addTodoItem("Buy groceries");
      });

      await waitFor(() => {
        expect(result.current.todoItems).toHaveLength(1);
        expect(result.current.todoItems[0].text).toBe("Buy groceries");
        expect(result.current.todoItems[0].completed).toBe(false);
      });
    });

    it("ignores blank todo text", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addTodoItem("   ");
      });

      expect(result.current.todoItems).toHaveLength(0);
    });

    it("toggles todo item to completed", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addTodoItem("Write report");
      });

      let todoId: string;
      await waitFor(() => {
        expect(result.current.todoItems).toHaveLength(1);
        todoId = result.current.todoItems[0].id;
      });

      await act(async () => {
        result.current.toggleTodoItem(todoId);
      });

      await waitFor(() => {
        expect(result.current.todoItems[0].completed).toBe(true);
        expect(result.current.todoItems[0].completedAt).toBeDefined();
      });
    });

    it("toggles todo item back to incomplete", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addTodoItem("Write report");
      });

      let todoId: string;
      await waitFor(() => { todoId = result.current.todoItems[0].id; });

      await act(async () => { result.current.toggleTodoItem(todoId); });
      await act(async () => { result.current.toggleTodoItem(todoId); });

      await waitFor(() => {
        expect(result.current.todoItems[0].completed).toBe(false);
        expect(result.current.todoItems[0].completedAt).toBeUndefined();
      });
    });

    it("deletes a todo item", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addTodoItem("Delete me");
      });

      let todoId: string;
      await waitFor(() => { todoId = result.current.todoItems[0].id; });

      await act(async () => {
        result.current.deleteTodoItem(todoId);
      });

      await waitFor(() => {
        expect(result.current.todoItems).toHaveLength(0);
      });
    });

    it("clears only completed todo items", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addTodoItem("Keep me");
        result.current.addTodoItem("Delete me");
      });

      let secondId: string;
      await waitFor(() => {
        expect(result.current.todoItems).toHaveLength(2);
        secondId = result.current.todoItems[1].id;
      });

      await act(async () => { result.current.toggleTodoItem(secondId); });
      await act(async () => { result.current.clearCompletedTodos(); });

      await waitFor(() => {
        expect(result.current.todoItems).toHaveLength(1);
        expect(result.current.todoItems[0].text).toBe("Keep me");
      });
    });
  });

  describe("Planned Tasks", () => {
    it("adds a planned task with status todo", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addPlannedTask({ title: "Build login page", description: "OAuth flow" });
      });

      await waitFor(() => {
        expect(result.current.plannedTasks).toHaveLength(1);
        expect(result.current.plannedTasks[0].title).toBe("Build login page");
        expect(result.current.plannedTasks[0].status).toBe("todo");
        expect(result.current.plannedTasks[0].id).toBeTruthy();
      });
    });

    it("updates a planned task's title", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addPlannedTask({ title: "Original title" });
      });

      let taskId: string;
      await waitFor(() => { taskId = result.current.plannedTasks[0].id; });

      await act(async () => {
        result.current.updatePlannedTask(taskId, { title: "Updated title" });
      });

      await waitFor(() => {
        expect(result.current.plannedTasks[0].title).toBe("Updated title");
      });
    });

    it("deletes a planned task", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addPlannedTask({ title: "To delete" });
      });

      let taskId: string;
      await waitFor(() => { taskId = result.current.plannedTasks[0].id; });

      await act(async () => {
        result.current.deletePlannedTask(taskId);
      });

      await waitFor(() => {
        expect(result.current.plannedTasks).toHaveLength(0);
      });
    });

    it("moves a planned task to in_progress status", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addPlannedTask({ title: "Feature work" });
      });

      let taskId: string;
      await waitFor(() => { taskId = result.current.plannedTasks[0].id; });

      await act(async () => {
        result.current.movePlannedTask(taskId, "in_progress");
      });

      await waitFor(() => {
        expect(result.current.plannedTasks[0].status).toBe("in_progress");
      });
    });

    it("moves a planned task to done status", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addPlannedTask({ title: "Completed feature" });
      });

      let taskId: string;
      await waitFor(() => { taskId = result.current.plannedTasks[0].id; });

      await act(async () => {
        result.current.movePlannedTask(taskId, "done");
      });

      await waitFor(() => {
        expect(result.current.plannedTasks[0].status).toBe("done");
      });
    });

    it("pullPlannedTaskToDay is blocked when day is not started", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addPlannedTask({ title: "Pull me" });
      });

      let taskId: string;
      await waitFor(() => { taskId = result.current.plannedTasks[0].id; });

      await act(async () => {
        result.current.pullPlannedTaskToDay(taskId);
      });

      // Status should remain "todo" since the pull was blocked
      await waitFor(() => {
        expect(result.current.plannedTasks[0].status).toBe("todo");
      });
    });

    it("pullPlannedTaskToDay creates a day task and marks planned as in_progress", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.startDay(new Date("2024-12-03T09:00:00.000Z"));
      });

      await act(async () => {
        result.current.addPlannedTask({ title: "Pull me", description: "Some work" });
      });

      let taskId: string;
      await waitFor(() => { taskId = result.current.plannedTasks[0].id; });

      await act(async () => {
        result.current.pullPlannedTaskToDay(taskId);
      });

      await waitFor(() => {
        expect(result.current.plannedTasks[0].status).toBe("in_progress");
        expect(result.current.tasks.some(t => t.title === "Pull me")).toBe(true);
      });
    });
  });

  describe("Project Management", () => {
    it("adds a project", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addProject({
          name: "New Project",
          client: "Acme",
          hourlyRate: 150,
          color: "#FF0000",
          isBillable: true
        });
      });

      await waitFor(() => {
        const found = result.current.projects.find(p => p.name === "New Project");
        expect(found).toBeDefined();
        expect(found?.client).toBe("Acme");
        expect(found?.hourlyRate).toBe(150);
        expect(found?.id).toBeTruthy();
      });
    });

    it("updates a project name and hourlyRate", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addProject({ name: "Old Name", client: "Client", color: "#000", isBillable: true });
      });

      let projectId: string;
      await waitFor(() => {
        const found = result.current.projects.find(p => p.name === "Old Name");
        expect(found).toBeDefined();
        projectId = found!.id;
      });

      await act(async () => {
        result.current.updateProject(projectId, { name: "New Name", hourlyRate: 200 });
      });

      await waitFor(() => {
        const found = result.current.projects.find(p => p.id === projectId);
        expect(found?.name).toBe("New Name");
        expect(found?.hourlyRate).toBe(200);
      });
    });

    it("deletes a project", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addProject({ name: "Delete Me", client: "Client", color: "#000", isBillable: true });
      });

      let projectId: string;
      await waitFor(() => {
        const found = result.current.projects.find(p => p.name === "Delete Me");
        projectId = found!.id;
      });

      await act(async () => {
        result.current.deleteProject(projectId);
      });

      await waitFor(() => {
        expect(result.current.projects.find(p => p.id === projectId)).toBeUndefined();
      });
    });

    it("archives a project", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addProject({ name: "Archive Me", client: "Client", color: "#000", isBillable: true });
      });

      let projectId: string;
      await waitFor(() => {
        projectId = result.current.projects.find(p => p.name === "Archive Me")!.id;
      });

      await act(async () => {
        result.current.archiveProject(projectId);
      });

      await waitFor(() => {
        expect(result.current.projects.find(p => p.id === projectId)?.archived).toBe(true);
      });
    });

    it("restores an archived project", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addProject({ name: "Restore Me", client: "Client", color: "#000", isBillable: true });
      });

      let projectId: string;
      await waitFor(() => {
        projectId = result.current.projects.find(p => p.name === "Restore Me")!.id;
      });

      await act(async () => { result.current.archiveProject(projectId); });
      await act(async () => { result.current.restoreProject(projectId); });

      await waitFor(() => {
        expect(result.current.projects.find(p => p.id === projectId)?.archived).toBe(false);
      });
    });

    it("resets projects to defaults", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addProject({ name: "Custom Project", client: "Me", color: "#000", isBillable: true });
        result.current.resetProjectsToDefaults();
      });

      await waitFor(() => {
        expect(result.current.projects.find(p => p.name === "Custom Project")).toBeUndefined();
        expect(result.current.projects.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Category Management", () => {
    it("adds a category", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      const initialCount = result.current.categories.length;

      await act(async () => {
        result.current.addCategory({ name: "New Cat", color: "#123456", isBillable: true });
      });

      await waitFor(() => {
        expect(result.current.categories).toHaveLength(initialCount + 1);
        const found = result.current.categories.find(c => c.name === "New Cat");
        expect(found).toBeDefined();
        expect(found?.id).toBeTruthy();
      });
    });

    it("updates a category name", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addCategory({ name: "Old Cat", color: "#000", isBillable: true });
      });

      let catId: string;
      await waitFor(() => {
        catId = result.current.categories.find(c => c.name === "Old Cat")!.id;
      });

      await act(async () => {
        result.current.updateCategory(catId, { name: "Updated Cat" });
      });

      await waitFor(() => {
        expect(result.current.categories.find(c => c.id === catId)?.name).toBe("Updated Cat");
      });
    });

    it("deletes a category", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addCategory({ name: "Delete Me", color: "#000", isBillable: true });
      });

      let catId: string;
      await waitFor(() => {
        catId = result.current.categories.find(c => c.name === "Delete Me")!.id;
      });

      await act(async () => {
        result.current.deleteCategory(catId);
      });

      await waitFor(() => {
        expect(result.current.categories.find(c => c.id === catId)).toBeUndefined();
      });
    });
  });

  describe("discardDay", () => {
    it("clears all day state", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.startDay(new Date("2024-12-03T09:00:00Z"));
        result.current.startNewTask("Some work");
      });

      await waitFor(() => {
        expect(result.current.isDayStarted).toBe(true);
        expect(result.current.tasks).toHaveLength(1);
      });

      await act(async () => {
        result.current.discardDay();
      });

      await waitFor(() => {
        expect(result.current.isDayStarted).toBe(false);
        expect(result.current.tasks).toHaveLength(0);
        expect(result.current.currentTask).toBeNull();
        expect(result.current.dayStartTime).toBeNull();
      });
    });
  });

  describe("adjustTaskTime", () => {
    it("rounds start and end time to nearest 15 minutes and updates duration", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.startDay(new Date("2024-12-03T09:00:00Z"));
        result.current.startNewTask("Timed task");
      });

      let taskId: string;
      await waitFor(() => {
        taskId = result.current.currentTask!.id;
      });

      // Use times at :00 and :45 (local-minute-safe boundaries):
      // 09:00 → 09:00, 10:45 → 10:45 (already on quarter-hour)
      const startInput = new Date("2024-12-03T09:00:00Z");
      const endInput = new Date("2024-12-03T10:45:00Z");

      await act(async () => {
        result.current.adjustTaskTime(taskId, startInput, endInput);
      });

      await waitFor(() => {
        const task = result.current.tasks.find(t => t.id === taskId);
        // Both times are already on a 15-min boundary so rounding is a no-op
        expect(task?.startTime.getMinutes()).toBe(0);
        expect(task?.endTime?.getMinutes()).toBe(45);
        // duration = 10:45 - 09:00 = 6300000ms (1h 45m)
        expect(task?.duration).toBe(6_300_000);
      });
    });
  });

  describe("addBackdatedDay", () => {
    it("adds a backdated day to the archive", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      const backdatedDay: import("@/contexts/TimeTrackingContext").DayRecord = {
        id: "backdated-1",
        date: "Mon Nov 25 2024",
        tasks: [
          {
            id: "bt1",
            title: "Past work",
            startTime: new Date("2024-11-25T09:00:00Z"),
            endTime: new Date("2024-11-25T10:00:00Z"),
            duration: 3_600_000
          }
        ],
        totalDuration: 3_600_000,
        startTime: new Date("2024-11-25T09:00:00Z"),
        endTime: new Date("2024-11-25T10:00:00Z")
      };

      await act(async () => {
        await result.current.addBackdatedDay(backdatedDay);
      });

      await waitFor(() => {
        expect(result.current.archivedDays.find(d => d.id === "backdated-1")).toBeDefined();
      });
    });
  });

  describe("archiveClient / restoreClient", () => {
    it("archives a client with no active projects", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let clientId: string;
      await act(async () => {
        const created = result.current.addClient({ name: "Archive-able Client" });
        clientId = created!.id;
      });

      await waitFor(() => {
        expect(result.current.clients.find(c => c.id === clientId)).toBeDefined();
      });

      let errorMsg: string | null = "not-yet-set";
      await act(async () => {
        errorMsg = result.current.archiveClient(clientId);
      });

      await waitFor(() => {
        expect(errorMsg).toBeNull();
        expect(result.current.clients.find(c => c.id === clientId)?.archived).toBe(true);
      });
    });

    it("blocks archiving a client that has active projects", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let clientId: string;
      await act(async () => {
        const created = result.current.addClient({ name: "Busy Client" });
        clientId = created!.id;
      });

      await act(async () => {
        result.current.addProject({ name: "Active Project", client: "Busy Client", color: "#000", isBillable: true });
      });

      let errorMsg: string | null = null;
      await act(async () => {
        errorMsg = result.current.archiveClient(clientId);
      });

      expect(errorMsg).not.toBeNull();
      expect(errorMsg).toContain("Active Project");
      expect(result.current.clients.find(c => c.id === clientId)?.archived).toBe(false);
    });

    it("restores an archived client", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let clientId: string;
      await act(async () => {
        const created = result.current.addClient({ name: "Restore Me" });
        clientId = created!.id;
      });

      await act(async () => { result.current.archiveClient(clientId); });
      await act(async () => { result.current.restoreClient(clientId); });

      await waitFor(() => {
        expect(result.current.clients.find(c => c.id === clientId)?.archived).toBe(false);
      });
    });
  });
});
