import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientDialog } from "@/components/ClientDialog";

const addClient = vi.fn();
const updateClient = vi.fn();
const persistClient = vi.fn(async () => undefined);

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({ addClient, updateClient, persistClient }),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const client = { id: "cl1", name: "Acme", archived: false, createdAt: "2026-01-01T00:00:00.000Z", contactEmail: "a@acme.test" };

describe("ClientDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addClient.mockImplementation((d) => ({ id: "new", archived: false, createdAt: "now", ...d }));
    updateClient.mockImplementation((id, d) => ({ ...client, ...d }));
  });

  it("is a named, described modal dialog with a real form", () => {
    render(<ClientDialog open onOpenChange={vi.fn()} mode="add" />);
    const dialog = screen.getByRole("dialog", { name: "Add Client" });
    expect(dialog).toHaveAccessibleDescription(/bill your projects/i);
    expect(dialog.querySelector("form")).toHaveAttribute("novalidate");
    expect(screen.getByLabelText(/client name/i)).toBeRequired();
  });

  it("shows an error and focuses the name when submitted empty", async () => {
    const user = userEvent.setup();
    render(<ClientDialog open onOpenChange={vi.fn()} mode="add" />);

    await user.click(screen.getByRole("button", { name: "Add Client" }));

    expect(await screen.findByText("Client name is required")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/client name/i)).toHaveFocus());
    expect(addClient).not.toHaveBeenCalled();
  });

  it("rejects an invalid email with a message", async () => {
    const user = userEvent.setup();
    render(<ClientDialog open onOpenChange={vi.fn()} mode="add" />);

    await user.type(screen.getByLabelText(/client name/i), "Globex");
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Add Client" }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(addClient).not.toHaveBeenCalled();
  });

  it("adds a client, persists it, and closes", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ClientDialog open onOpenChange={onOpenChange} mode="add" />);

    await user.type(screen.getByLabelText(/client name/i), "Globex");
    await user.click(screen.getByRole("button", { name: "Add Client" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(addClient).toHaveBeenCalledWith(expect.objectContaining({ name: "Globex" }));
    expect(persistClient).toHaveBeenCalled();
  });

  it("fills the form when editing and saves changes", async () => {
    const user = userEvent.setup();
    render(<ClientDialog open onOpenChange={vi.fn()} mode="edit" client={client} />);

    expect(screen.getByRole("dialog", { name: "Edit Client" })).toBeInTheDocument();
    expect(screen.getByLabelText(/client name/i)).toHaveValue("Acme");
    expect(screen.getByLabelText("Email")).toHaveValue("a@acme.test");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(updateClient).toHaveBeenCalledWith("cl1", expect.objectContaining({ name: "Acme" })));
  });
});
