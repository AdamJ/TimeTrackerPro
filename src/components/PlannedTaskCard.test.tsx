import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlannedTaskCard } from "@/components/PlannedTaskCard";
import type { PlannedTask, Task } from "@/contexts/TimeTrackingContext";

const pullPlannedTaskToDay = vi.fn();
const addPlannedTaskToDay = vi.fn();
const startDayAndPullPlannedTask = vi.fn();
let tasks: Task[] = [];
let categories: { id: string; name: string; color: string }[] = [];

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({
    categories,
    tasks,
    deletePlannedTask: vi.fn(),
    restoreDeletedPlannedTask: vi.fn(),
    movePlannedTask: vi.fn(),
    pullPlannedTaskToDay,
    addPlannedTaskToDay,
    startDayAndPullPlannedTask,
  }),
}));
vi.mock("@/hooks/useLongPress", () => ({ useLongPress: () => ({}) }));
vi.mock("@/hooks/useUndoableDelete", () => ({
  useUndoableDelete: () => ({ confirmDelete: vi.fn() }),
}));
vi.mock("@/components/PlannedTaskDialog", () => ({ PlannedTaskDialog: () => null }));

const makeTask = (overrides: Partial<PlannedTask>): PlannedTask => ({
  id: "t1",
  title: "Write spec",
  status: "todo",
  priority: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  timeEntries: [],
  timeSpent: 0,
  ...overrides,
}) as PlannedTask;

const renderCard = (task: PlannedTask, isDayStarted: boolean, isDayStale = false) =>
  render(<PlannedTaskCard task={task} isDayStarted={isDayStarted} isDayStale={isDayStale} />);

describe("PlannedTaskCard quick action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tasks = [];
    categories = [];
  });

  it("starts the day and pulls a to-do task when no day is running", () => {
    renderCard(makeTask({}), false);
    fireEvent.click(screen.getByRole("button", { name: "Start Write spec" }));
    expect(startDayAndPullPlannedTask).toHaveBeenCalledWith("t1");
  });

  it("starts the day and resumes an in-progress task when no day is running", () => {
    renderCard(makeTask({ status: "in_progress" }), false);
    fireEvent.click(screen.getByRole("button", { name: "Resume Write spec" }));
    expect(startDayAndPullPlannedTask).toHaveBeenCalledWith("t1");
  });

  it("pulls a to-do task into a running day", () => {
    renderCard(makeTask({}), true);
    fireEvent.click(screen.getByRole("button", { name: "Start Write spec" }));
    expect(pullPlannedTaskToDay).toHaveBeenCalledWith("t1");
  });

  it("resumes an in-progress task in a running day", () => {
    renderCard(makeTask({ status: "in_progress" }), true);
    fireEvent.click(screen.getByRole("button", { name: "Resume Write spec" }));
    expect(addPlannedTaskToDay).toHaveBeenCalledWith("t1");
  });

  it("hides the action for done tasks, stale days, and ended-but-unposted days", () => {
    const { unmount } = renderCard(makeTask({ status: "done" }), true);
    expect(screen.queryByRole("button", { name: /^(Start|Resume) / })).toBeNull();
    unmount();

    const stale = renderCard(makeTask({}), true, true);
    expect(screen.queryByRole("button", { name: /^(Start|Resume) / })).toBeNull();
    stale.unmount();

    tasks = [{ id: "x" } as Task];
    renderCard(makeTask({}), false);
    expect(screen.queryByRole("button", { name: /^(Start|Resume) / })).toBeNull();
  });
});

describe("PlannedTaskCard category badge", () => {
  beforeEach(() => {
    tasks = [];
  });

  it("picks readable text for light and dark category colors", () => {
    categories = [
      { id: "light", name: "Light", color: "#facc15" },
      { id: "dark", name: "Dark", color: "#1e40af" },
    ];
    const { unmount } = renderCard(makeTask({ category: "light" }), false);
    expect(screen.getByText("Light").closest("[style]")).toHaveStyle({ color: "#000" });
    unmount();
    renderCard(makeTask({ category: "dark" }), false);
    expect(screen.getByText("Dark").closest("[style]")).toHaveStyle({ color: "#fff" });
  });
});
