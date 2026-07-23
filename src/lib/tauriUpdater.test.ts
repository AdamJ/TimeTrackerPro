import { describe, it, expect, vi, beforeEach } from "vitest";

const checkMock = vi.fn();
const askMock = vi.fn();
const messageMock = vi.fn();
const relaunchMock = vi.fn();

vi.mock("@tauri-apps/plugin-updater", () => ({ check: checkMock }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ ask: askMock, message: messageMock }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: relaunchMock }));

const BACKOFF_KEY = "timetracker_update_backoff";

async function loadModule() {
  vi.resetModules();
  return import("./tauriUpdater");
}

describe("tauriUpdater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("checkForUpdatesSilent", () => {
    it("does nothing when no update is available", async () => {
      checkMock.mockResolvedValueOnce(null);
      const { checkForUpdatesSilent } = await loadModule();

      await checkForUpdatesSilent();

      expect(askMock).not.toHaveBeenCalled();
    });

    it("prompts to download, then prompts to restart, when an update is available and accepted", async () => {
      const downloadAndInstall = vi.fn().mockResolvedValue(undefined);
      checkMock.mockResolvedValueOnce({ version: "2.0.0", downloadAndInstall });
      askMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
      const { checkForUpdatesSilent } = await loadModule();

      await checkForUpdatesSilent();

      expect(downloadAndInstall).toHaveBeenCalledTimes(1);
      expect(relaunchMock).toHaveBeenCalledTimes(1);
    });

    it("records a backoff failure and skips future checks until the backoff window elapses", async () => {
      checkMock.mockRejectedValueOnce(new Error("network down"));
      const { checkForUpdatesSilent } = await loadModule();

      await checkForUpdatesSilent();
      expect(JSON.parse(localStorage.getItem(BACKOFF_KEY)!).consecutiveFailures).toBe(1);

      checkMock.mockClear();
      const { checkForUpdatesSilent: secondCall } = await loadModule();
      await secondCall();
      expect(checkMock).not.toHaveBeenCalled();
    });
  });

  describe("checkForUpdatesManual", () => {
    it("shows a 'no updates' message when already on the latest version", async () => {
      checkMock.mockResolvedValueOnce(null);
      const { checkForUpdatesManual } = await loadModule();

      await checkForUpdatesManual();

      expect(messageMock).toHaveBeenCalledWith(
        "You're running the latest version of Timetraked.",
        expect.objectContaining({ title: "No updates available" }),
      );
    });

    it("shows an error message when the check fails", async () => {
      checkMock.mockRejectedValueOnce(new Error("network down"));
      const { checkForUpdatesManual } = await loadModule();

      await checkForUpdatesManual();

      expect(messageMock).toHaveBeenCalledWith(
        "Could not check for updates. Please try again later.",
        expect.objectContaining({ title: "Update check failed" }),
      );
    });
  });
});
