import { describe, it, expect, vi, beforeEach } from "vitest";

const invokeMock = vi.fn();
const listenMock = vi.fn();
const checkForUpdatesManualMock = vi.fn();
const checkForUpdatesSilentMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));
vi.mock("@tauri-apps/api/event", () => ({ listen: listenMock }));
vi.mock("@/lib/tauriUpdater", () => ({
  checkForUpdatesManual: checkForUpdatesManualMock,
  checkForUpdatesSilent: checkForUpdatesSilentMock,
}));

async function loadShim() {
  vi.resetModules();
  const mod = await import("./tauriElectronApiShim");
  return mod.installTauriElectronApiShim;
}

describe("installTauriElectronApiShim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).__TAURI_INTERNALS__;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).electronAPI;
    listenMock.mockResolvedValue(() => undefined);
  });

  it("does nothing when the Tauri runtime is absent (web/PWA build)", async () => {
    const install = await loadShim();
    install();
    expect(window.electronAPI).toBeUndefined();
  });

  it("populates window.electronAPI with the full contract when Tauri is present", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};
    const install = await loadShim();
    install();

    expect(window.electronAPI).toBeDefined();
    expect(Object.keys(window.electronAPI!).sort()).toEqual(
      ["listBackups", "onMenuAction", "readBackup", "requestFlushBeforeQuit", "writeBackup"].sort(),
    );
  });

  it("writeBackup invokes backup_write with the JSON payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValueOnce({ ok: true });
    const install = await loadShim();
    install();

    const result = await window.electronAPI!.writeBackup("{\"foo\":1}");

    expect(invokeMock).toHaveBeenCalledWith("backup_write", { json: "{\"foo\":1}" });
    expect(result).toEqual({ ok: true });
  });

  it("listBackups invokes backup_list", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValueOnce({ ok: true, backups: [] });
    const install = await loadShim();
    install();

    const result = await window.electronAPI!.listBackups();

    expect(invokeMock).toHaveBeenCalledWith("backup_list");
    expect(result).toEqual({ ok: true, backups: [] });
  });

  it("readBackup invokes backup_read with the given name", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValueOnce({ ok: true, content: "{}" });
    const install = await loadShim();
    install();

    const result = await window.electronAPI!.readBackup("backup-1.json");

    expect(invokeMock).toHaveBeenCalledWith("backup_read", { name: "backup-1.json" });
    expect(result).toEqual({ ok: true, content: "{}" });
  });

  it("requestFlushBeforeQuit listens for before-quit-flush and acks via before_quit_flush_done", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};
    let capturedHandler: (() => Promise<void>) | undefined;
    listenMock.mockImplementation((_event: string, handler: () => Promise<void>) => {
      capturedHandler = handler;
      return Promise.resolve(() => undefined);
    });
    const install = await loadShim();
    install();

    const callback = vi.fn().mockResolvedValue(undefined);
    window.electronAPI!.requestFlushBeforeQuit(callback);
    await capturedHandler?.();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("before_quit_flush_done");
  });

  it("onMenuAction forwards regular actions but intercepts check-updates", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};
    let capturedHandler: ((event: { payload: string }) => void) | undefined;
    listenMock.mockImplementation((_event: string, handler: (event: { payload: string }) => void) => {
      capturedHandler = handler;
      return Promise.resolve(() => undefined);
    });
    const install = await loadShim();
    install();

    const callback = vi.fn();
    window.electronAPI!.onMenuAction(callback);

    capturedHandler?.({ payload: "new-task" });
    expect(callback).toHaveBeenCalledWith("new-task");

    capturedHandler?.({ payload: "check-updates" });
    expect(checkForUpdatesManualMock).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1); // not forwarded
  });

  it("onMenuAction unsubscribe race: cancels pending listen before it resolves", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};
    let resolveListenPromise: ((fn: () => void) => void) | undefined;
    const unlistenMock = vi.fn();
    listenMock.mockImplementation(
      (_event: string, _handler: (event: { payload: string }) => void) =>
        new Promise((resolve) => {
          resolveListenPromise = () => resolve(unlistenMock);
        }),
    );
    const install = await loadShim();
    install();

    const callback = vi.fn();
    const unsubscribe = window.electronAPI!.onMenuAction(callback);

    // Unsubscribe before listen() resolves (the race condition)
    unsubscribe();

    // Now let the listen() promise resolve and wait for the then() to run
    resolveListenPromise?.();
    await new Promise((r) => setImmediate(r));

    // The real Tauri unlisten function should have been called immediately
    // to clean up the listener before it was even stored
    expect(unlistenMock).toHaveBeenCalledTimes(1);
  });
});
