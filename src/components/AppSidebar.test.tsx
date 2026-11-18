import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

let isMobile = true;
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => isMobile }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({
    isDayStarted: false,
    tasks: [],
    currentTask: null,
    isSyncing: false,
    lastSyncTime: null,
    hasUnsavedChanges: false,
    forceSyncToDatabase: vi.fn(),
  }),
}));
vi.mock("@/hooks/useCurrentTime", () => ({ useCurrentTime: () => new Date() }));
vi.mock("@/components/UserMenu", () => ({ UserMenu: () => null }));
vi.mock("@/components/SyncStatus", () => ({ SyncStatus: () => null }));
vi.mock("@/components/AuthDialog", () => ({ AuthDialog: () => null }));
vi.mock("@/components/ExportDialog", () => ({ ExportDialog: () => null }));

const renderSidebar = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <SidebarProvider>
        <SidebarTrigger />
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>,
  );

describe("AppSidebar on mobile", () => {
  beforeEach(() => {
    isMobile = true;
  });

  it("is a sheet narrower than the screen, so there is page to tap outside it", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: /toggle sidebar/i }));
    const sheet = document.querySelector("[data-mobile=true]") as HTMLElement;
    expect(sheet).toBeInTheDocument();
    // tailwind-merge v2 doesn't know w-(--var); a leftover w-full would cover the whole screen
    expect(sheet).not.toHaveClass("w-full");
    expect(sheet).toHaveClass("w-[var(--sidebar-width)]");
  });

  it("has a visible Close button that dismisses it", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: /toggle sidebar/i }));
    // The sheet used to hide its Close button with [&>button]:hidden, leaving no way to dismiss it
    expect(document.querySelector("[data-mobile=true]")?.className).not.toContain("[&>button]:hidden");
    await user.click(screen.getByRole("button", { name: /close/i }));
    await waitFor(() => expect(document.querySelector("[data-mobile=true]")).not.toBeInTheDocument());
  });

  it("closes after a link takes the user to another page", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: /toggle sidebar/i }));
    await user.click(screen.getByRole("link", { name: "Tasks" }));
    await waitFor(() => expect(document.querySelector("[data-mobile=true]")).not.toBeInTheDocument());
  });
});
