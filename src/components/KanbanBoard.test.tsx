import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
let isMobile = true;
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => isMobile }));
vi.mock("@/components/KanbanColumn", () => ({
  KanbanColumn: ({
    title,
    tasks,
    emptyMessage,
    hiddenCount = 0,
    onShowAll,
  }: {
    title: string;
    tasks: PlannedTask[];
    emptyMessage: string;
    hiddenCount?: number;
    onShowAll?: () => void;
  }) => (
    <section aria-label={title}>
      {tasks.length === 0 ? emptyMessage : tasks.map((t) => <p key={t.id}>{t.title}</p>)}
      {hiddenCount > 0 && (
        <button onClick={onShowAll}>{hiddenCount} older hidden, show all</button>
      )}
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
    isMobile = true;
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
    isMobile = false;
    render(<KanbanBoard />);
    expect(screen.getByText("No tasks match the current filters.")).toBeInTheDocument();
    expect(screen.getByText("Showing 0 of 2")).toBeInTheDocument();
    expect(screen.getAllByText("No matching tasks")).toHaveLength(4);
  });

  describe("one column at a time on mobile", () => {
    beforeEach(() => {
      plannedTasks = [
        makeTask({ id: "a", title: "Todo task", status: "todo" }),
        makeTask({ id: "b", title: "Doing task", status: "in_progress" }),
        makeTask({ id: "c", title: "Doing too", status: "in_progress" }),
      ];
    });

    it("shows only the To Do column first, with a count on every status tab", () => {
      render(<KanbanBoard />);
      expect(screen.getByText("Todo task")).toBeInTheDocument();
      expect(screen.queryByText("Doing task")).not.toBeInTheDocument();
      expect(screen.getAllByRole("tab")).toHaveLength(4);
      expect(screen.getByRole("tab", { name: /In Progress\s*2/ })).toBeInTheDocument();
    });

    it("switches columns when a status tab is selected", async () => {
      const user = userEvent.setup();
      render(<KanbanBoard />);
      await user.click(screen.getByRole("tab", { name: /In Progress/ }));
      expect(screen.getByText("Doing task")).toBeInTheDocument();
      expect(screen.queryByText("Todo task")).not.toBeInTheDocument();
    });

    it("opens on the last status tab the user picked", async () => {
      const user = userEvent.setup();
      const first = render(<KanbanBoard />);
      await user.click(screen.getByRole("tab", { name: /In Progress/ }));
      first.unmount();
      render(<KanbanBoard />);
      expect(screen.getByRole("tab", { name: /In Progress/ })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByText("Doing task")).toBeInTheDocument();
    });

    const swipe = (from: number, to: number, dy = 0) => {
      const panel = screen.getByRole("tabpanel");
      fireEvent.touchStart(panel, { touches: [{ clientX: from, clientY: 200 }] });
      fireEvent.touchEnd(panel, { changedTouches: [{ clientX: to, clientY: 200 + dy }] });
    };

    it("swipes left to the next tab and right to the previous one", () => {
      render(<KanbanBoard />);
      swipe(300, 150);
      expect(screen.getByRole("tab", { name: /In Progress/ })).toHaveAttribute("aria-selected", "true");
      swipe(150, 300);
      expect(screen.getByRole("tab", { name: /To Do/ })).toHaveAttribute("aria-selected", "true");
    });

    it("stops at the first and last tabs instead of wrapping", () => {
      render(<KanbanBoard />);
      swipe(150, 300);
      expect(screen.getByRole("tab", { name: /To Do/ })).toHaveAttribute("aria-selected", "true");
      for (let i = 0; i < 5; i++) swipe(300, 150);
      expect(screen.getByRole("tab", { name: /Done/ })).toHaveAttribute("aria-selected", "true");
    });

    it("ignores short, mostly vertical, and screen-edge gestures", () => {
      render(<KanbanBoard />);
      swipe(300, 270);
      swipe(300, 200, 120);
      swipe(10, -150);
      expect(screen.getByRole("tab", { name: /To Do/ })).toHaveAttribute("aria-selected", "true");
    });

    it("slides the new column in from the direction of travel, not on first load", async () => {
      const user = userEvent.setup();
      render(<KanbanBoard />);
      expect(screen.getByRole("tabpanel")).not.toHaveClass("animate-in");
      await user.click(screen.getByRole("tab", { name: /Blocked/ }));
      expect(screen.getByRole("tabpanel")).toHaveClass("animate-in", "slide-in-from-right-8");
      await user.click(screen.getByRole("tab", { name: /In Progress/ }));
      expect(screen.getByRole("tabpanel")).toHaveClass("animate-in", "slide-in-from-left-8");
      expect(screen.getByRole("tabpanel")).toHaveClass("motion-reduce:animate-none");
    });

    it("shows every column at once on wider screens", () => {
      isMobile = false;
      render(<KanbanBoard />);
      expect(screen.queryByRole("tab")).not.toBeInTheDocument();
      expect(screen.getByText("Todo task")).toBeInTheDocument();
      expect(screen.getByText("Doing task")).toBeInTheDocument();
    });
  });
  describe("completed tasks", () => {
    const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

    beforeEach(() => {
      isMobile = false;
      plannedTasks = [
        makeTask({ id: "a", title: "Open task", status: "todo", updatedAt: daysAgo(90) }),
        makeTask({ id: "b", title: "Done today", status: "done", updatedAt: daysAgo(0) }),
        makeTask({ id: "c", title: "Done 10 days ago", status: "done", updatedAt: daysAgo(10) }),
        makeTask({ id: "d", title: "Done 60 days ago", status: "done", updatedAt: daysAgo(60) }),
      ];
    });

    const saveDoneRange = (doneRange: string) =>
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ doneRange }));

    const doneColumn = () => within(screen.getByRole("region", { name: "Done" }));

    it("hides done tasks older than 30 days by default but never touches other columns", () => {
      render(<KanbanBoard />);
      expect(screen.getByText("Open task")).toBeInTheDocument();
      expect(screen.getByText("Done today")).toBeInTheDocument();
      expect(screen.getByText("Done 10 days ago")).toBeInTheDocument();
      expect(screen.queryByText("Done 60 days ago")).not.toBeInTheDocument();
    });

    it("tells the Done column how many older tasks are hidden and can reveal them", async () => {
      const user = userEvent.setup();
      render(<KanbanBoard />);
      await user.click(doneColumn().getByRole("button", { name: "1 older hidden, show all" }));
      expect(screen.getByText("Done 60 days ago")).toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).doneRange).toBe("all");
    });

    it("changes the range from the control", async () => {
      isMobile = true;
      const user = userEvent.setup();
      render(<KanbanBoard />);
      await user.selectOptions(screen.getByLabelText("Show completed tasks"), "hide");
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).doneRange).toBe("hide");
      expect(screen.getByRole("tab", { name: /Done\s*0/ })).toBeInTheDocument();
    });

    it("limits to the last 7 days", () => {
      saveDoneRange("7d");
      render(<KanbanBoard />);
      expect(screen.getByText("Done today")).toBeInTheDocument();
      expect(screen.queryByText("Done 10 days ago")).not.toBeInTheDocument();
      expect(doneColumn().getByText("2 older hidden, show all")).toBeInTheDocument();
    });

    it("hides every completed task", () => {
      saveDoneRange("hide");
      render(<KanbanBoard />);
      expect(screen.queryByText("Done today")).not.toBeInTheDocument();
      expect(screen.getByText("Open task")).toBeInTheDocument();
      expect(doneColumn().getByText("3 older hidden, show all")).toBeInTheDocument();
    });

    it("shows everything when set to all", () => {
      saveDoneRange("all");
      render(<KanbanBoard />);
      expect(screen.getByText("Done 60 days ago")).toBeInTheDocument();
      expect(screen.queryByText(/older hidden/)).not.toBeInTheDocument();
    });

    it("does not report a filtered-out board when only done tasks are hidden", () => {
      plannedTasks = [makeTask({ id: "d", status: "done", updatedAt: daysAgo(60) })];
      render(<KanbanBoard />);
      expect(screen.queryByText("No tasks match the current filters.")).not.toBeInTheDocument();
    });

    it("counts only visible done tasks on the mobile Done tab", () => {
      isMobile = true;
      render(<KanbanBoard />);
      expect(screen.getByRole("tab", { name: /Done\s*2/ })).toBeInTheDocument();
    });

    it("treats a done task with an unparseable date as recent rather than losing it", () => {
      plannedTasks = [makeTask({ id: "x", title: "Odd date", status: "done", updatedAt: "not-a-date" })];
      render(<KanbanBoard />);
      expect(screen.getByText("Odd date")).toBeInTheDocument();
    });
  });
});
