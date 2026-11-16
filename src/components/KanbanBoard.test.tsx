import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { KanbanBoard } from "@/components/KanbanBoard";
import type { PlannedTask } from "@/contexts/TimeTrackingContext";

let plannedTasks: PlannedTask[] = [];
let loading = false;
const categories = [{ id: "design", name: "Design", color: "#000" }];

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({
    plannedTasks,
    categories,
    loading,
    isDayStarted: false,
    isDayStale: false,
  }),
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => true }));
vi.mock("@/components/KanbanColumn", () => ({
  KanbanColumn: ({ title, tasks, emptyMessage }: { title: string; tasks: PlannedTask[]; emptyMessage: string }) => (
    <section aria-label={title}>
      {tasks.length === 0 ? emptyMessage : tasks.map((t) => <p key={t.id}>{t.title}</p>)}
    </section>
  ),
}));

const STORAGE_KEY = "timetracker_task_board_view";

const makeTask = (overrides: Partial<PlannedTask>): PlannedTask => ({
  id: "t1",
  title: "Task",
  status: "todo",
  priority: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  timeEntries: [],
  timeSpent: 0,
  ...overrides,
}) as PlannedTask;

const savedFilters = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!).filters;

describe("KanbanBoard", () => {
  beforeEach(() => {
    localStorage.clear();
    loading = false;
    plannedTasks = [];
  });

  it("labels category filter options by category name, not id", () => {
    plannedTasks = [makeTask({ category: "design" })];
    render(<KanbanBoard />);
    const select = screen.getByLabelText("Filter by category");
    const option = Array.from(select.querySelectorAll("option")).find((o) => o.value === "design");
    expect(option).toHaveTextContent("Design");
  });

  it("resets a saved filter that no longer matches any task", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sortBy: "oldest", filters: { project: "Gone", client: "all", category: "all" } }),
    );
    plannedTasks = [makeTask({ title: "Visible", project: "Acme" })];
    render(<KanbanBoard />);
    await waitFor(() => expect(savedFilters().project).toBe("all"));
    expect(screen.getByText("Visible")).toBeInTheDocument();
  });

  it("keeps saved filters while data is still loading", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sortBy: "oldest", filters: { project: "Acme", client: "all", category: "all" } }),
    );
    loading = true;
    render(<KanbanBoard />);
    expect(savedFilters().project).toBe("Acme");
  });

  it("explains when filters hide every task", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sortBy: "oldest", filters: { project: "Acme", client: "Globex", category: "all" } }),
    );
    plannedTasks = [
      makeTask({ id: "a", project: "Acme", client: "Initech" }),
      makeTask({ id: "b", project: "Other", client: "Globex" }),
    ];
    render(<KanbanBoard />);
    expect(screen.getByText("No tasks match the current filters.")).toBeInTheDocument();
    expect(screen.getByText("Showing 0 of 2")).toBeInTheDocument();
    expect(screen.getAllByText("No matching tasks")).toHaveLength(4);
  });
});
