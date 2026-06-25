import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DataRecoveryDialog } from "./DataRecoveryDialog";

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

const listBackups = vi.fn();
const previewBackup = vi.fn();
const restoreBackup = vi.fn();
const currentStateSummary = vi.fn();

vi.mock("@/hooks/useDataRecovery", () => ({
  useDataRecovery: () => ({ listBackups, previewBackup, restoreBackup, currentStateSummary }),
}));

const sampleBackup = {
  source: "browser" as const,
  id: "timetracker_projects_v0_backup_1000",
  timestamp: 1000,
  info: { key: "timetracker_projects_v0_backup_1000", originalKey: "timetracker_projects", oldVersion: "0", timestamp: 1000 },
};

beforeEach(() => {
  vi.clearAllMocks();
  currentStateSummary.mockReturnValue({ projects: 1 });
  Object.defineProperty(window, "location", {
    value: { ...window.location, reload: vi.fn() },
    writable: true,
  });
});

describe("DataRecoveryDialog", () => {
  it("shows a loading state then an empty state when no backups exist", async () => {
    listBackups.mockResolvedValue([]);

    render(<DataRecoveryDialog isOpen onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/no backups found/i)).toBeInTheDocument());
  });

  it("lists backups and lets the user preview one", async () => {
    listBackups.mockResolvedValue([sampleBackup]);
    previewBackup.mockResolvedValue({ projects: 3 });

    render(<DataRecoveryDialog isOpen onClose={vi.fn()} />);

    const entry = await screen.findByText(new Date(1000).toLocaleString());
    fireEvent.click(entry);

    await waitFor(() => expect(previewBackup).toHaveBeenCalledWith(sampleBackup));
    expect(await screen.findByText("Projects")).toBeInTheDocument();
  });

  it("disables Restore until a backup is selected and previewed", async () => {
    listBackups.mockResolvedValue([sampleBackup]);

    render(<DataRecoveryDialog isOpen onClose={vi.fn()} />);
    await screen.findByText(new Date(1000).toLocaleString());

    expect(screen.getByRole("button", { name: /restore/i })).toBeDisabled();
  });

  it("restores the selected backup and reloads on success", async () => {
    listBackups.mockResolvedValue([sampleBackup]);
    previewBackup.mockResolvedValue({ projects: 3 });
    restoreBackup.mockResolvedValue(true);

    render(<DataRecoveryDialog isOpen onClose={vi.fn()} />);

    const entry = await screen.findByText(new Date(1000).toLocaleString());
    fireEvent.click(entry);
    await waitFor(() => expect(screen.getByRole("button", { name: /restore/i })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: /restore/i }));
    const confirmButtons = await screen.findAllByRole("button", { name: /restore/i, hidden: true });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(restoreBackup).toHaveBeenCalledWith(sampleBackup));
    await waitFor(() => expect(window.location.reload).toHaveBeenCalled());
  });

  it("shows an error toast and does not reload when restore fails", async () => {
    listBackups.mockResolvedValue([sampleBackup]);
    previewBackup.mockResolvedValue({ projects: 3 });
    restoreBackup.mockResolvedValue(false);

    render(<DataRecoveryDialog isOpen onClose={vi.fn()} />);

    const entry = await screen.findByText(new Date(1000).toLocaleString());
    fireEvent.click(entry);
    await waitFor(() => expect(screen.getByRole("button", { name: /restore/i })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: /restore/i }));
    const confirmButtons = await screen.findAllByRole("button", { name: /restore/i, hidden: true });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }))
    );
    expect(window.location.reload).not.toHaveBeenCalled();
  });
});
