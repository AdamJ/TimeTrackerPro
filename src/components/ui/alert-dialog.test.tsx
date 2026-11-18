import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

let isMobile = true;
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => isMobile }));
vi.mock("@/hooks/useVisualViewport", () => ({
  useVisualViewport: (enabled: boolean) => (enabled ? { top: 0, height: 500 } : null),
}));

const renderAlert = (props: { size?: "default" | "sm"; fullScreenOnMobile?: boolean } = {}) =>
  render(
    <AlertDialog open>
      <AlertDialogContent {...props}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter data-testid="footer">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>,
  );

describe("AlertDialogContent full screen", () => {
  beforeEach(() => {
    isMobile = true;
  });

  it("fills the screen on mobile by default, sized to the visible area", () => {
    renderAlert();
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveClass("inset-0", "h-dvh", "w-full");
    expect(dialog.style.height).toBe("500px");
  });

  it("keeps the alert's size and group styling for the centered layout from md up", () => {
    renderAlert({ size: "sm" });
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAttribute("data-size", "sm");
    expect(dialog).toHaveClass("group/alert-dialog-content", "md:data-[size=sm]:max-w-xs", "md:left-[50%]");
  });

  it("pins the footer to the bottom of the full-screen panel", () => {
    renderAlert();
    expect(screen.getByTestId("footer")).toHaveClass("sticky", "-bottom-4", "mt-auto");
  });

  it("is the usual centered alert on wide screens or when opted out", () => {
    isMobile = false;
    renderAlert();
    let dialog = screen.getByRole("alertdialog");
    expect(dialog.style.height).toBe("");
    expect(screen.getByTestId("footer")).not.toHaveClass("sticky");
    cleanup();
    isMobile = true;
    renderAlert({ fullScreenOnMobile: false });
    dialog = screen.getByRole("alertdialog");
    expect(dialog).not.toHaveClass("h-dvh");
    expect(dialog).toHaveClass("max-w-[calc(100%-2rem)]");
    expect(screen.getByTestId("footer")).not.toHaveClass("sticky");
  });
});
