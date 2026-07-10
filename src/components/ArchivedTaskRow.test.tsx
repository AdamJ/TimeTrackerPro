import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Table, TableBody } from "@/components/ui/table";
import { ArchivedTaskRow } from "@/components/ArchivedTaskRow";
import type { Task, Project } from "@/contexts/TimeTrackingContext";
import type { TaskCategory } from "@/config/categories";
import type { ComponentProps } from "react";

const renderRow = (props: ComponentProps<typeof ArchivedTaskRow>) =>
  render(
    <TooltipProvider>
      <Table>
        <TableBody>
          <ArchivedTaskRow {...props} />
        </TableBody>
      </Table>
    </TooltipProvider>
  );

const categories: TaskCategory[] = [
  { id: "cat1", name: "Development", color: "#0f0", isBillable: true },
];

const projects: Project[] = [
  { id: "proj1", name: "Project A", client: "Client X" },
];

// 9:07 / 10:52 — deliberately off-quarter-hour so rounding-on-expand is observable.
const baseTask: Task = {
  id: "task-1",
  title: "Review PR",
  description: "Check the authentication changes",
  startTime: new Date(2026, 5, 15, 9, 7, 0),
  endTime: new Date(2026, 5, 15, 10, 52, 0),
  duration: 6_300_000,
  project: "Project A",
  client: "Client X",
  category: "cat1",
};

describe("ArchivedTaskRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the task title, category, project and times in collapsed view", () => {
    renderRow({
      task: baseTask,
      isExpanded: false,
      onToggleExpand: vi.fn(),
      onSave: vi.fn(),
      onDelete: vi.fn(),
      categories,
      projects,
    });

    expect(screen.getByText("Review PR")).toBeInTheDocument();
    expect(screen.getByText("Development")).toBeInTheDocument();
    expect(screen.getByText("Project A")).toBeInTheDocument();
  });

  it("always shows Edit and Delete actions, even without a parent edit mode", () => {
    renderRow({
      task: baseTask,
      isExpanded: false,
      onToggleExpand: vi.fn(),
      onSave: vi.fn(),
      onDelete: vi.fn(),
      categories,
      projects,
    });

    expect(screen.getByRole("button", { name: "Edit task" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete task" })).toBeInTheDocument();
  });

  it("calls onToggleExpand with the task id when Edit is clicked", async () => {
    const onToggleExpand = vi.fn();
    const user = userEvent.setup();
    renderRow({
      task: baseTask,
      isExpanded: false,
      onToggleExpand,
      onSave: vi.fn(),
      onDelete: vi.fn(),
      categories,
      projects,
    });

    await user.click(screen.getByRole("button", { name: "Edit task" }));
    expect(onToggleExpand).toHaveBeenCalledWith("task-1");
  });

  it("calls onDelete with the task id when Delete is clicked", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderRow({
      task: baseTask,
      isExpanded: false,
      onToggleExpand: vi.fn(),
      onSave: vi.fn(),
      onDelete,
      categories,
      projects,
    });

    await user.click(screen.getByRole("button", { name: "Delete task" }));
    expect(onDelete).toHaveBeenCalledWith("task-1");
  });

  it("pre-fills the expanded editor with times rounded to the nearest 15 minutes", () => {
    renderRow({
      task: baseTask,
      isExpanded: true,
      onToggleExpand: vi.fn(),
      onSave: vi.fn(),
      onDelete: vi.fn(),
      categories,
      projects,
    });

    expect(screen.getByLabelText("Task start time")).toHaveValue("09:00");
    expect(screen.getByLabelText("Task end time")).toHaveValue("10:45");
  });

  it("calls onSave with the updated task and does not persist directly", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderRow({
      task: baseTask,
      isExpanded: true,
      onToggleExpand: vi.fn(),
      onSave,
      onDelete: vi.fn(),
      categories,
      projects,
    });

    const titleInput = screen.getByLabelText(/Task Title/);
    await user.clear(titleInput);
    await user.type(titleInput, "Updated title");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const updated = onSave.mock.calls[0][0] as Task;
    expect(updated.title).toBe("Updated title");
    expect(updated.id).toBe("task-1");
    expect(updated.duration).toBe(
      updated.endTime!.getTime() - updated.startTime.getTime()
    );
  });

  it("collapses via onToggleExpand without calling onSave when Cancel is clicked", async () => {
    const onSave = vi.fn();
    const onToggleExpand = vi.fn();
    const user = userEvent.setup();
    renderRow({
      task: baseTask,
      isExpanded: true,
      onToggleExpand,
      onSave,
      onDelete: vi.fn(),
      categories,
      projects,
    });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onToggleExpand).toHaveBeenCalledWith("task-1");
  });

  it("disables Save when the title is blank", async () => {
    const user = userEvent.setup();
    renderRow({
      task: baseTask,
      isExpanded: true,
      onToggleExpand: vi.fn(),
      onSave: vi.fn(),
      onDelete: vi.fn(),
      categories,
      projects,
    });

    const titleInput = screen.getByLabelText(/Task Title/);
    await user.clear(titleInput);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
