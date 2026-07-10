import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArchiveEditDialog } from "@/components/ArchiveEditDialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { DayRecord } from "@/contexts/TimeTrackingContext";
import type { ComponentProps } from "react";

const renderDialog = (props: ComponentProps<typeof ArchiveEditDialog>) =>
  render(
    <TooltipProvider>
      <ArchiveEditDialog {...props} />
    </TooltipProvider>,
  );

const updateArchivedDay = vi.fn().mockResolvedValue(undefined);
const deleteArchivedDay = vi.fn();
const restoreArchivedDay = vi.fn();
const restoreDeletedArchivedDay = vi.fn();

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({
    updateArchivedDay,
    deleteArchivedDay,
    restoreArchivedDay,
    restoreDeletedArchivedDay,
    categories: [{ id: "cat1", name: "Development", color: "#0f0", isBillable: true }],
    projects: [{ id: "proj1", name: "Project A", client: "Client X" }],
    isDayStarted: false,
  }),
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
  toast: (...args: unknown[]) => mockToast(...args),
}));

const confirmDelete = vi.fn();
vi.mock("@/hooks/useUndoableDelete", () => ({
  useUndoableDelete: () => ({ confirmDelete }),
}));

// day.endTime and the last task's endTime are deliberately off-quarter-hour
// by different amounts, so the rounding-consistency fix is observable.
const buildDay = (): DayRecord => ({
  id: "day-1",
  date: "Mon Jun 15 2026",
  totalDuration: 5 * 60 * 60 * 1000,
  startTime: new Date(2026, 5, 15, 9, 0, 0),
  endTime: new Date(2026, 5, 15, 17, 44, 0),
  tasks: [
    {
      id: "t1",
      title: "Task One",
      startTime: new Date(2026, 5, 15, 9, 0, 0),
      endTime: new Date(2026, 5, 15, 12, 0, 0),
      duration: 3 * 60 * 60 * 1000,
      category: "cat1",
      project: "Project A",
      client: "Client X",
    },
    {
      id: "t2",
      title: "Task Two",
      startTime: new Date(2026, 5, 15, 13, 0, 0),
      endTime: new Date(2026, 5, 15, 17, 52, 0),
      duration: 2 * 60 * 60 * 1000,
      category: "cat1",
      project: "Project A",
      client: "Client X",
    },
  ],
});

describe("ArchiveEditDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateArchivedDay.mockResolvedValue(undefined);
  });

  it("rounds the last task's end time to match the day's rounded end time on open", () => {
    renderDialog({ day: buildDay(), isOpen: true, onClose: vi.fn() });

    // Both 17:44 (day) and 17:52 (last task) round to 17:45.
    const taskTwoRow = screen.getByText("Task Two").closest("tr")!;
    expect(within(taskTwoRow).getByText("5:45 PM")).toBeInTheDocument();
  });

  it("toggles the day-summary editor independently of task rows", async () => {
    const user = userEvent.setup();
    renderDialog({ day: buildDay(), isOpen: true, onClose: vi.fn() });

    expect(screen.queryByLabelText("Day start time")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit day summary" }));
    expect(screen.getByLabelText("Day start time")).toBeInTheDocument();

    // Task rows are unaffected by the summary editor being open.
    expect(screen.queryByLabelText(/Task Title/)).not.toBeInTheDocument();
  });

  it("enables Save Changes and shows a pending-changes notice from a task edit alone", async () => {
    const user = userEvent.setup();
    renderDialog({ day: buildDay(), isOpen: true, onClose: vi.fn() });

    const saveButton = screen.getByRole("button", { name: /no changes/i });
    expect(saveButton).toBeDisabled();

    const taskTwoRow = screen.getByText("Task Two").closest("tr")!;
    await user.click(within(taskTwoRow).getByRole("button", { name: "Edit task" }));

    const titleInput = screen.getByLabelText(/Task Title/);
    await user.clear(titleInput);
    await user.type(titleInput, "Task Two Updated");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText(/you have unsaved changes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
  });

  it("persists a task-only edit via a single updateArchivedDay call", async () => {
    const user = userEvent.setup();
    renderDialog({ day: buildDay(), isOpen: true, onClose: vi.fn() });

    const taskTwoRow = screen.getByText("Task Two").closest("tr")!;
    await user.click(within(taskTwoRow).getByRole("button", { name: "Edit task" }));

    const titleInput = screen.getByLabelText(/Task Title/);
    await user.clear(titleInput);
    await user.type(titleInput, "Task Two Updated");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(updateArchivedDay).toHaveBeenCalledTimes(1);
    const [dayId, payload] = updateArchivedDay.mock.calls[0];
    expect(dayId).toBe("day-1");
    expect(payload.tasks.find((t: { id: string }) => t.id === "t2").title).toBe(
      "Task Two Updated",
    );
  });

  it("restores the day when Restore is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog({ day: buildDay(), isOpen: true, onClose });

    await user.click(screen.getByRole("button", { name: "Restore this day" }));

    expect(restoreArchivedDay).toHaveBeenCalledWith("day-1");
    expect(onClose).toHaveBeenCalled();
  });

  it("deletes the day with undo support when Delete is confirmed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog({ day: buildDay(), isOpen: true, onClose });

    await user.click(screen.getByRole("button", { name: "Delete this day" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteArchivedDay).toHaveBeenCalledWith("day-1");
    expect(confirmDelete).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("re-stamps every task's date and keeps the rounded last-task time-of-day when the date changes", async () => {
    const user = userEvent.setup();
    renderDialog({ day: buildDay(), isOpen: true, onClose: vi.fn() });

    await user.click(screen.getByRole("button", { name: "Edit day summary" }));
    const dateInput = screen.getByLabelText("Date");
    await user.clear(dateInput);
    await user.type(dateInput, "2026-06-20");
    await user.tab();

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(updateArchivedDay).toHaveBeenCalledTimes(1);
    const [, payload] = updateArchivedDay.mock.calls[0];
    const lastTask = payload.tasks.find((t: { id: string }) => t.id === "t2");
    expect(lastTask.endTime.getDate()).toBe(20);
    // Time-of-day survives re-stamping: rounded from 17:52 to 17:45.
    expect(lastTask.endTime.getHours()).toBe(17);
    expect(lastTask.endTime.getMinutes()).toBe(45);
  });
});
