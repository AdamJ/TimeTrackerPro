import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KanbanColumn } from "@/components/KanbanColumn";
import type { PlannedTaskStatus } from "@/contexts/TimeTrackingContext";

vi.mock("@/components/PlannedTaskCard", () => ({ PlannedTaskCard: () => null }));
vi.mock("@/components/PlannedTaskDialog", () => ({
  PlannedTaskDialog: ({ isOpen, defaultStatus }: { isOpen: boolean; defaultStatus: PlannedTaskStatus }) =>
    isOpen ? <div data-testid="new-task-dialog">{defaultStatus}</div> : null,
}));

const COLUMNS: [PlannedTaskStatus, string][] = [
  ["todo", "To Do"],
  ["in_progress", "In Progress"],
  ["blocked", "Blocked"],
  ["done", "Done"],
];

describe("KanbanColumn", () => {
  it.each(COLUMNS)("adds a task with status %s from the %s column", (status, title) => {
    render(
      <KanbanColumn status={status} title={title} tasks={[]} isDayStarted={false} isDayStale={false} />,
    );
    fireEvent.click(screen.getByRole("button", { name: `Add task to ${title}` }));
    expect(screen.getByTestId("new-task-dialog")).toHaveTextContent(status);
  });
});
