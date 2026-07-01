import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "@/components/CommandPalette";
import { consumePendingMenuAction } from "@/lib/electronMenuActions";

const navigateMock = vi.fn();
let isAuthenticated = false;

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated }),
}));

describe("CommandPalette", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    isAuthenticated = false;
  });

  it("renders navigation destinations when open", () => {
    render(<CommandPalette open onOpenChange={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
  });

  it("only shows the Weekly Report item when authenticated", () => {
    const { rerender } = render(<CommandPalette open onOpenChange={vi.fn()} onSave={vi.fn()} />);
    expect(screen.queryByText("Weekly Report")).not.toBeInTheDocument();

    isAuthenticated = true;
    rerender(<CommandPalette open onOpenChange={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("Weekly Report")).toBeInTheDocument();
  });

  it("navigates and closes when a destination is selected", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<CommandPalette open onOpenChange={onOpenChange} onSave={vi.fn()} />);

    await user.click(screen.getByText("Tasks"));

    expect(navigateMock).toHaveBeenCalledWith("/tasks");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("stashes the new-task pending action and navigates home when New Task is selected", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<CommandPalette open onOpenChange={onOpenChange} onSave={vi.fn()} />);

    await user.click(screen.getByText("New Task"));

    expect(navigateMock).toHaveBeenCalledWith("/");
    expect(consumePendingMenuAction("new-task")).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onSave and closes when Save Changes is selected", async () => {
    const onOpenChange = vi.fn();
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<CommandPalette open onOpenChange={onOpenChange} onSave={onSave} />);

    await user.click(screen.getByText("Save Changes"));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
