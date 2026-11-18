import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryDialog } from "@/components/CategoryDialog";

const addCategory = vi.fn();
const updateCategory = vi.fn();
const forceSyncToDatabase = vi.fn(async () => undefined);

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({ addCategory, updateCategory, forceSyncToDatabase }),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const category = { id: "c1", name: "Design", description: "Visual work", color: "#10B981", isBillable: false };

describe("CategoryDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is a named, described modal dialog with a real form", () => {
    render(<CategoryDialog open onOpenChange={vi.fn()} mode="add" />);
    const dialog = screen.getByRole("dialog", { name: "Add Category" });
    expect(dialog).toHaveAccessibleDescription(/organize your tasks/i);
    expect(dialog.querySelector("form")).toHaveAttribute("novalidate");
    expect(screen.getByRole("button", { name: "Add Category" })).toHaveAttribute("type", "submit");
    expect(screen.getByLabelText(/category name/i)).toBeRequired();
  });

  it("shows an error and focuses the name when submitted empty", async () => {
    const user = userEvent.setup();
    render(<CategoryDialog open onOpenChange={vi.fn()} mode="add" />);

    await user.click(screen.getByRole("button", { name: "Add Category" }));

    expect(await screen.findByText("Category name is required")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/category name/i)).toHaveFocus());
    expect(addCategory).not.toHaveBeenCalled();
  });

  it("adds a category, syncs, and closes", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<CategoryDialog open onOpenChange={onOpenChange} mode="add" />);

    await user.type(screen.getByLabelText(/category name/i), "Research");
    await user.click(screen.getByRole("button", { name: "Set color to #EF4444" }));
    await user.click(screen.getByRole("button", { name: "Add Category" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(addCategory).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Research", color: "#EF4444", isBillable: true }),
    );
    expect(forceSyncToDatabase).toHaveBeenCalled();
  });

  it("fills the form when editing and saves changes", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<CategoryDialog open onOpenChange={onOpenChange} mode="edit" category={category} />);

    expect(screen.getByRole("dialog", { name: "Edit Category" })).toBeInTheDocument();
    expect(screen.getByLabelText(/category name/i)).toHaveValue("Design");
    await user.type(screen.getByLabelText(/category name/i), " Ops");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(updateCategory).toHaveBeenCalledWith("c1", expect.objectContaining({ name: "Design Ops", isBillable: false })));
  });

  it("closes with Cancel and Escape without saving", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<CategoryDialog open onOpenChange={onOpenChange} mode="add" />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(addCategory).not.toHaveBeenCalled();
  });
});
