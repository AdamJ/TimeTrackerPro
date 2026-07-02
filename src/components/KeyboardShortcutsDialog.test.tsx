import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";

describe("KeyboardShortcutsDialog", () => {
  it("renders nothing when closed", () => {
    render(<KeyboardShortcutsDialog open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
  });

  it("lists each shortcut and its description when open", () => {
    render(<KeyboardShortcutsDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Create a new task")).toBeInTheDocument();
    expect(screen.getByText("Save changes")).toBeInTheDocument();
    expect(screen.getByText("Jump to a page or command")).toBeInTheDocument();
    expect(screen.getByText("Show this list of shortcuts")).toBeInTheDocument();
  });
});
