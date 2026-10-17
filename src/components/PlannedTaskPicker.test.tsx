import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PlannedTaskPicker } from "@/components/PlannedTaskPicker";
import type { PlannedTask } from "@/contexts/TimeTrackingContext";

const pullPlannedTaskToDay = vi.fn();
const addPlannedTaskToDay = vi.fn();
let plannedTasks: PlannedTask[] = [];

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({ plannedTasks, pullPlannedTaskToDay, addPlannedTaskToDay }),
}));

const makeTask = (overrides: Partial<PlannedTask>): PlannedTask => ({
  id: "t1",
  title: "Task",
  status: "todo",
  priority: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  timeEntries: [],
  timeSpent: 0,
  ...overrides,
}) as PlannedTask;

const renderPicker = () =>
  render(
    <MemoryRouter>
      <PlannedTaskPicker />
    </MemoryRouter>,
  );

describe("PlannedTaskPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    plannedTasks = [];
  });

  it("shows an empty message and a board link when nothing is startable", () => {
    plannedTasks = [makeTask({ id: "d", title: "Finished", status: "done" })];
    renderPicker();
    expect(screen.getByText("No planned tasks are ready to start.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the Task Board" })).toHaveAttribute("href", "/tasks");
  });

  it("lists in-progress tasks first and omits done and blocked tasks", () => {
    plannedTasks = [
      makeTask({ id: "a", title: "Todo task", status: "todo", priority: 1 }),
      makeTask({ id: "b", title: "Active task", status: "in_progress", priority: 2 }),
      makeTask({ id: "c", title: "Blocked task", status: "blocked" }),
      makeTask({ id: "d", title: "Done task", status: "done" }),
    ];
    renderPicker();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Active task");
    expect(items[1]).toHaveTextContent("Todo task");
  });

  it("pulls a todo task and resumes an in-progress task", () => {
    plannedTasks = [
      makeTask({ id: "a", title: "Todo task", status: "todo" }),
      makeTask({ id: "b", title: "Active task", status: "in_progress" }),
    ];
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Start Todo task" }));
    expect(pullPlannedTaskToDay).toHaveBeenCalledWith("a");
    fireEvent.click(screen.getByRole("button", { name: "Resume Active task" }));
    expect(addPlannedTaskToDay).toHaveBeenCalledWith("b");
  });

  it("caps the list and links to the full board", () => {
    plannedTasks = Array.from({ length: 7 }, (_, i) =>
      makeTask({ id: `t${i}`, title: `Task ${i}`, priority: i }),
    );
    renderPicker();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("link", { name: "View all 7 on the Task Board" })).toBeInTheDocument();
  });
});
