import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectDialog } from "@/components/ProjectDialog";

const addProject = vi.fn();
const updateProject = vi.fn();
const addClient = vi.fn();
const persistClient = vi.fn(async () => undefined);
const forceSyncToDatabase = vi.fn(async () => undefined);
const clients = [{ id: "cl1", name: "Acme", archived: false, createdAt: "2026-01-01T00:00:00.000Z" }];

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({ clients, addClient, persistClient, addProject, updateProject, forceSyncToDatabase }),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
// phone layout: ResponsiveSelect renders a native <select>, which user-event can drive
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => true }));

const project = { id: "p1", name: "Website", client: "Acme", hourlyRate: 120, color: "#3B82F6", isBillable: true };

describe("ProjectDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addClient.mockImplementation((name: string) => ({ id: "new", name, archived: false, createdAt: "now" }));
  });

  it("is a named, described modal dialog with a real form", () => {
    render(<ProjectDialog open onOpenChange={vi.fn()} mode="add" />);
    const dialog = screen.getByRole("dialog", { name: "Add Project" });
    expect(dialog).toHaveAccessibleDescription(/track time against/i);
    expect(dialog.querySelector("form")).toHaveAttribute("novalidate");
    expect(screen.getByLabelText(/project name/i)).toBeRequired();
  });

  it("shows errors and focuses the first invalid field when submitted empty", async () => {
    const user = userEvent.setup();
    render(<ProjectDialog open onOpenChange={vi.fn()} mode="add" />);

    await user.click(screen.getByRole("button", { name: "Add Project" }));

    expect(await screen.findByText("Project name is required")).toBeInTheDocument();
    expect(screen.getByText("Client name is required")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/project name/i)).toHaveFocus());
    expect(addProject).not.toHaveBeenCalled();
  });

  it("adds a project for an existing client and closes", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ProjectDialog open onOpenChange={onOpenChange} mode="add" />);

    await user.type(screen.getByLabelText(/project name/i), "Mobile app");
    await user.selectOptions(screen.getByLabelText(/client name/i), "Acme");
    await user.type(screen.getByLabelText(/hourly rate/i), "95");
    await user.click(screen.getByRole("button", { name: "Add Project" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(addProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Mobile app", client: "Acme", hourlyRate: 95 }),
    );
    expect(forceSyncToDatabase).toHaveBeenCalled();
  });

  it("fills the form when editing and saves changes", async () => {
    const user = userEvent.setup();
    render(<ProjectDialog open onOpenChange={vi.fn()} mode="edit" project={project} />);

    expect(screen.getByRole("dialog", { name: "Edit Project" })).toBeInTheDocument();
    expect(screen.getByLabelText(/project name/i)).toHaveValue("Website");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(updateProject).toHaveBeenCalledWith("p1", expect.objectContaining({ name: "Website", hourlyRate: 120 })));
  });

  it("Enter in the new-client field adds the client instead of submitting the project form", async () => {
    const user = userEvent.setup();
    render(<ProjectDialog open onOpenChange={vi.fn()} mode="add" />);

    await user.selectOptions(screen.getByLabelText(/client name/i), "__add_new__");
    await user.type(screen.getByPlaceholderText("New client name"), "Globex{Enter}");

    await waitFor(() => expect(addClient).toHaveBeenCalledWith("Globex"));
    expect(addProject).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Add Project" })).toBeInTheDocument();
  });
});
