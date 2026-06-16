import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewTaskForm } from "@/components/NewTaskForm";

const mockProjects = [
  { id: "p1", name: "Project A", client: "Client X", color: "#000", isBillable: true }
];
const mockCategories = [
  { id: "cat1", name: "Development", color: "#0f0", isBillable: true }
];

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({
    projects: mockProjects,
    categories: mockCategories
  })
}));

describe("NewTaskForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the title input", () => {
    render(<NewTaskForm onSubmit={vi.fn()} defaultOpen={true} />);
    expect(screen.getByLabelText(/task title/i)).toBeInTheDocument();
  });

  it("renders category and project selects", () => {
    render(<NewTaskForm onSubmit={vi.fn()} defaultOpen={true} />);
    expect(screen.getByLabelText(/select category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/select project/i)).toBeInTheDocument();
  });

  it("calls onSubmit with title when form is submitted", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<NewTaskForm onSubmit={onSubmit} defaultOpen={true} />);

    await user.type(screen.getByLabelText(/task title/i), "Write tests");
    await user.click(screen.getByRole("button", { name: /start task/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith(
      "Write tests",
      undefined,  // no description
      undefined,  // no project selected
      undefined,  // no client
      undefined   // no category
    );
  });

  it("shows a validation error when submitted with empty title", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<NewTaskForm onSubmit={onSubmit} defaultOpen={true} />);

    await user.click(screen.getByRole("button", { name: /start task/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/task title is required/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not call onSubmit when title is only whitespace", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<NewTaskForm onSubmit={onSubmit} defaultOpen={true} />);

    await user.type(screen.getByLabelText(/task title/i), "   ");
    await user.click(screen.getByRole("button", { name: /start task/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears the form after successful submission", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<NewTaskForm onSubmit={onSubmit} defaultOpen={true} />);

    const titleInput = screen.getByLabelText(/task title/i);
    await user.type(titleInput, "My task");
    await user.click(screen.getByRole("button", { name: /start task/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    // After submission the form collapses back to FAB; title input is gone
    expect(screen.queryByLabelText(/task title/i)).not.toBeInTheDocument();
  });

  it("calls onCancel and hides the form when Cancel is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<NewTaskForm onSubmit={vi.fn()} onCancel={onCancel} defaultOpen={true} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText(/task title/i)).not.toBeInTheDocument();
  });

  it("shows the FAB button when defaultOpen is false", () => {
    render(<NewTaskForm onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /new task/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/task title/i)).not.toBeInTheDocument();
  });

  it("opens the form when FAB is clicked", async () => {
    const user = userEvent.setup();
    render(<NewTaskForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /new task/i }));

    expect(screen.getByLabelText(/task title/i)).toBeInTheDocument();
  });
});
