import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlannedTaskDialog } from "@/components/PlannedTaskDialog";
import type { PlannedTask } from "@/contexts/TimeTrackingContext";

const addPlannedTask = vi.fn();
const updatePlannedTask = vi.fn();
const projects = [{ id: "p1", name: "Project A", client: "Client X", color: "#000", isBillable: true }];
const categories = [{ id: "cat1", name: "Development", color: "#0f0", isBillable: true }];

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({ addPlannedTask, updatePlannedTask, projects, categories }),
}));

const makeTask = (overrides: Partial<PlannedTask> = {}): PlannedTask => ({
  id: "t1",
  title: "Existing task",
  description: "Some notes",
  status: "in_progress",
  priority: 0,
  project: "Project A",
  client: "Client X",
  category: "cat1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  timeEntries: [],
  timeSpent: 90 * 60 * 1000,
  ...overrides,
}) as PlannedTask;

describe("PlannedTaskDialog (create)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is the same kind of dialog as Start New Task: modal, titled, described, with a real form", () => {
    render(<PlannedTaskDialog isOpen onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "New Task" });
    expect(dialog).toHaveAccessibleDescription(/work on later/i);
    expect(screen.getByLabelText(/task title/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /description/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^category$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^project$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Task" })).toHaveAttribute("type", "submit");
  });

  it("shows an error instead of disabling the button when the title is empty, and focuses the field", async () => {
    const user = userEvent.setup();
    render(<PlannedTaskDialog isOpen onClose={vi.fn()} />);

    const add = screen.getByRole("button", { name: "Add Task" });
    expect(add).toBeEnabled();
    await user.click(add);

    expect(screen.getByRole("alert")).toHaveTextContent(/task title is required/i);
    expect(screen.getByLabelText(/task title/i)).toHaveFocus();
    expect(addPlannedTask).not.toHaveBeenCalled();
  });

  it("creates the task in the column it was added from", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PlannedTaskDialog isOpen onClose={onClose} defaultStatus="blocked" />);

    await user.type(screen.getByLabelText(/task title/i), "Waiting on legal");
    await user.click(screen.getByRole("button", { name: "Add Task" }));

    expect(addPlannedTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Waiting on legal", status: "blocked" }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("submits on Enter from the title field", async () => {
    const user = userEvent.setup();
    render(<PlannedTaskDialog isOpen onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(/task title/i), "Enter works{Enter}");

    expect(addPlannedTask).toHaveBeenCalledWith(expect.objectContaining({ title: "Enter works", status: "todo" }));
  });

  it("closes with Cancel and Escape without saving", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PlannedTaskDialog isOpen onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(addPlannedTask).not.toHaveBeenCalled();
  });
});

describe("PlannedTaskDialog (edit)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fills the form from the task and shows status and time spent", () => {
    render(<PlannedTaskDialog task={makeTask()} isOpen onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Edit Task" })).toBeInTheDocument();
    expect(screen.getByLabelText(/task title/i)).toHaveValue("Existing task");
    expect(screen.getByRole("textbox", { name: /description/i })).toHaveValue("Some notes");
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Time Spent")).toHaveValue("1h 30m");
  });

  it("only enables Save Changes once something changed, then saves", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PlannedTaskDialog task={makeTask()} isOpen onClose={onClose} />);

    const save = screen.getByRole("button", { name: "Save Changes" });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText(/task title/i), " v2");
    expect(save).toBeEnabled();
    await user.click(save);

    expect(updatePlannedTask).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({ title: "Existing task v2", status: "in_progress" }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not save a cleared title", async () => {
    const user = userEvent.setup();
    render(<PlannedTaskDialog task={makeTask()} isOpen onClose={vi.fn()} />);

    await user.clear(screen.getByLabelText(/task title/i));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/task title is required/i);
    expect(updatePlannedTask).not.toHaveBeenCalled();
  });
});
