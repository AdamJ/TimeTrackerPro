import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskItem } from "@/components/TaskItem";
import type { Task } from "@/contexts/TimeTrackingContext";

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({
    categories: [{ id: "cat1", name: "Development", color: "#0f0", isBillable: true }]
  })
}));

vi.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => ({
    lightImpact: vi.fn(),
    mediumImpact: vi.fn(),
    heavyImpact: vi.fn(),
    successNotify: vi.fn(),
    errorNotify: vi.fn()
  })
}));

vi.mock("@/hooks/useLongPress", () => ({
  useLongPress: () => ({})
}));

// Minimal dialog mocks — just enough to show/hide in tests
vi.mock("@/components/TaskEditDialog", () => ({
  TaskEditDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="edit-dialog">Edit Dialog</div> : null
}));

vi.mock("@/components/DeleteConfirmationDialog", () => ({
  DeleteConfirmationDialog: ({
    isOpen,
    onConfirm,
    onClose
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onClose: () => void;
    taskTitle: string;
  }) =>
    isOpen ? (
      <div data-testid="delete-dialog">
        <button onClick={onConfirm}>Confirm Delete</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
}));

const baseTask: Task = {
  id: "task-1",
  title: "Review PR",
  description: "Check the authentication changes",
  startTime: new Date("2024-12-03T09:00:00Z"),
  endTime: new Date("2024-12-03T10:00:00Z"),
  duration: 3_600_000,
  project: "Project A",
  client: "Client X",
  category: "cat1"
};

describe("TaskItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the task title", () => {
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);
    expect(screen.getByText("Review PR")).toBeInTheDocument();
  });

  it("renders the task description", () => {
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);
    expect(screen.getByText(/Check the authentication changes/)).toBeInTheDocument();
  });

  it("renders the project badge", () => {
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);
    expect(screen.getByText("Project A")).toBeInTheDocument();
  });

  it("renders the client badge", () => {
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);
    expect(screen.getByText("Client X")).toBeInTheDocument();
  });

  it("shows Active badge when isActive is true", () => {
    render(<TaskItem task={baseTask} isActive={true} onDelete={vi.fn()} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("does not show Active badge when isActive is false", () => {
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("shows the delete confirmation dialog when Delete is clicked", async () => {
    const user = userEvent.setup();
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /delete task: review pr/i }));

    expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
  });

  it("calls onDelete with task id when deletion is confirmed", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<TaskItem task={baseTask} isActive={false} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete task: review pr/i }));
    await user.click(screen.getByRole("button", { name: /confirm delete/i }));

    expect(onDelete).toHaveBeenCalledWith("task-1");
  });

  it("opens the edit dialog when Edit is clicked", async () => {
    const user = userEvent.setup();
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /edit task: review pr/i }));

    expect(screen.getByTestId("edit-dialog")).toBeInTheDocument();
  });

  it("renders the category badge when category matches", () => {
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);
    expect(screen.getByText("Development")).toBeInTheDocument();
  });
});
