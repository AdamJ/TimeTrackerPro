import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";

let isMobile = true;
let visible: { top: number; height: number } | null = null;
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => isMobile }));
vi.mock("@/hooks/useVisualViewport", () => ({
  useVisualViewport: (enabled: boolean) => (enabled ? visible : null),
}));

const renderDialog = (fullScreenOnMobile?: boolean) =>
  render(
    <Dialog open>
      <DialogContent fullScreenOnMobile={fullScreenOnMobile}>
        <DialogTitle>Title</DialogTitle>
        <p>Body</p>
        <DialogFooter data-testid="footer">
          <button type="button">Save</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>,
  );

describe("DialogContent fullScreenOnMobile", () => {
  beforeEach(() => {
    isMobile = true;
    visible = null;
  });

  it("fills the screen on mobile and scrolls", () => {
    renderDialog(true);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("inset-0", "h-dvh", "w-full", "overflow-y-auto");
    expect(dialog).not.toHaveClass("max-w-lg");
  });

  it("falls back to the centered modal from md up via responsive classes", () => {
    renderDialog(true);
    expect(screen.getByRole("dialog")).toHaveClass("md:max-w-lg", "md:left-[50%]", "md:top-[50%]");
  });

  it("matches the visible area so the on-screen keyboard never covers the panel", () => {
    visible = { top: 8, height: 420 };
    renderDialog(true);
    const dialog = screen.getByRole("dialog");
    expect(dialog.style.top).toBe("8px");
    expect(dialog.style.height).toBe("420px");
  });

  it("is full screen by default and keeps the centered modal when opted out", () => {
    visible = { top: 8, height: 420 };
    renderDialog();
    expect(screen.getByRole("dialog")).toHaveClass("h-dvh");
    cleanup();
    renderDialog(false);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("max-w-lg");
    expect(dialog).not.toHaveClass("h-dvh");
    expect(dialog.style.height).toBe("");
  });

  it("does not track the keyboard on wide screens", () => {
    isMobile = false;
    visible = { top: 8, height: 420 };
    renderDialog(true);
    expect(screen.getByRole("dialog").style.height).toBe("");
  });

  it("pins DialogFooter to the bottom of a full-screen panel", () => {
    renderDialog(true);
    expect(screen.getByTestId("footer")).toHaveClass("sticky", "-bottom-4", "mt-auto", "border-t");
  });

  it("leaves DialogFooter alone outside full-screen mode", () => {
    renderDialog(false);
    expect(screen.getByTestId("footer")).not.toHaveClass("sticky");
    cleanup();
    isMobile = false;
    renderDialog(true);
    expect(screen.getByTestId("footer")).not.toHaveClass("sticky");
  });
});
