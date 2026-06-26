import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Settings from "@/pages/Settings";

const renderSettings = () => render(<Settings />, { wrapper: MemoryRouter });

const mockToast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({
    archivedDays: [],
    projects: [],
    categories: [],
    clients: [],
    exportToCSV: vi.fn(),
    exportToJSON: vi.fn(),
    importFromCSV: vi.fn(),
    generateInvoiceData: vi.fn(),
  }),
}));

vi.mock("@/hooks/usePageTitle", () => ({
  usePageTitle: () => ({
    setTitle: vi.fn(),
    setBadge: vi.fn(),
    setActions: vi.fn(),
  }),
}));

const mockUseAuth = vi.fn(() => ({ isAuthenticated: false, user: null }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("Settings — background notifications toggle", () => {
  beforeEach(() => {
    localStorage.clear();
    mockToast.mockClear();
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
  });

  it("requests Notification permission and enables the setting once granted", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    vi.stubGlobal("Notification", { permission: "default", requestPermission });

    renderSettings();
    const toggle = screen.getByRole("switch", { name: /toggle background timer reminders/i });
    fireEvent.click(toggle);

    await waitFor(() => expect(requestPermission).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(toggle).toHaveAttribute("data-state", "checked"));
    expect(localStorage.getItem("timetracker_background_notifications_enabled")).toBe("true");

    vi.unstubAllGlobals();
  });

  it("shows a toast and leaves the setting off when permission is denied", async () => {
    const requestPermission = vi.fn().mockResolvedValue("denied");
    vi.stubGlobal("Notification", { permission: "default", requestPermission });

    renderSettings();
    const toggle = screen.getByRole("switch", { name: /toggle background timer reminders/i });
    fireEvent.click(toggle);

    await waitFor(() => expect(requestPermission).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Notifications blocked", variant: "destructive" })
    );
    expect(toggle).toHaveAttribute("data-state", "unchecked");

    vi.unstubAllGlobals();
  });

  it("turns the setting off without requesting permission again", async () => {
    localStorage.setItem("timetracker_background_notifications_enabled", "true");
    const requestPermission = vi.fn();
    vi.stubGlobal("Notification", { permission: "granted", requestPermission });

    renderSettings();
    const toggle = screen.getByRole("switch", { name: /toggle background timer reminders/i });
    expect(toggle).toHaveAttribute("data-state", "checked");

    fireEvent.click(toggle);

    expect(requestPermission).not.toHaveBeenCalled();
    await waitFor(() => expect(toggle).toHaveAttribute("data-state", "unchecked"));
    expect(localStorage.getItem("timetracker_background_notifications_enabled")).toBe("false");

    vi.unstubAllGlobals();
  });

  it("disables the toggle when the browser does not support notifications", () => {
    const original = (window as { Notification?: unknown }).Notification;
    delete (window as { Notification?: unknown }).Notification;

    renderSettings();
    const toggle = screen.getByRole("switch", { name: /toggle background timer reminders/i });
    expect(toggle).toBeDisabled();

    (window as { Notification?: unknown }).Notification = original;
  });
});

describe("Settings — data recovery visibility", () => {
  beforeEach(() => {
    localStorage.clear();
    mockToast.mockClear();
  });

  it("shows the Data Recovery item in guest mode", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });

    renderSettings();

    expect(screen.getByText("Data Recovery")).toBeInTheDocument();
  });

  it("hides the Data Recovery item for authenticated (cloud-sync) users", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: "u1" } });

    renderSettings();

    expect(screen.queryByText("Data Recovery")).not.toBeInTheDocument();
  });
});
