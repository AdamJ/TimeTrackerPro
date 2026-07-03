import { describe, it, expect, vi, beforeEach } from "vitest";

type Handler = (...args: unknown[]) => unknown;

const listeners = new Map<string, Set<Handler>>();
const onceListeners = new Map<string, Set<Handler>>();

function emit(event: string, ...args: unknown[]): void {
	listeners.get(event)?.forEach((handler) => handler(...args));
	const once = onceListeners.get(event);
	if (once) {
		const handlers = [...once];
		once.clear();
		handlers.forEach((handler) => handler(...args));
	}
}

const fakeAutoUpdater = {
	autoDownload: true,
	autoInstallOnAppQuit: false,
	on: vi.fn((event: string, handler: Handler) => {
		if (!listeners.has(event)) listeners.set(event, new Set());
		listeners.get(event)!.add(handler);
	}),
	once: vi.fn((event: string, handler: Handler) => {
		if (!onceListeners.has(event)) onceListeners.set(event, new Set());
		onceListeners.get(event)!.add(handler);
	}),
	removeListener: vi.fn((event: string, handler: Handler) => {
		listeners.get(event)?.delete(handler);
		onceListeners.get(event)?.delete(handler);
	}),
	checkForUpdates: vi.fn().mockResolvedValue({}),
	downloadUpdate: vi.fn().mockResolvedValue(undefined),
	quitAndInstall: vi.fn()
};

const showMessageBoxMock = vi.fn().mockResolvedValue({ response: 1 });
const openExternalMock = vi.fn().mockResolvedValue(undefined);

vi.mock("electron-updater", () => ({ autoUpdater: fakeAutoUpdater }));

vi.mock("electron", () => ({
	app: { getPath: vi.fn(() => "/tmp/userData") },
	BrowserWindow: { getFocusedWindow: vi.fn(() => undefined), getAllWindows: vi.fn(() => []) },
	dialog: { showMessageBox: showMessageBoxMock },
	shell: { openExternal: openExternalMock }
}));

vi.mock("fs/promises", () => ({
	default: {
		readFile: vi.fn().mockRejectedValue(new Error("ENOENT")),
		writeFile: vi.fn().mockResolvedValue(undefined)
	}
}));

const fsPromises = await import("fs/promises");

describe("electron/updater", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		listeners.clear();
		onceListeners.clear();
		fakeAutoUpdater.autoDownload = true;
		fakeAutoUpdater.checkForUpdates.mockResolvedValue({});
		showMessageBoxMock.mockResolvedValue({ response: 1 });
		openExternalMock.mockResolvedValue(undefined);
		(fsPromises.default.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ENOENT"));
		vi.resetModules();
	});

	it("disables autoDownload so unsigned builds require explicit consent before fetching", async () => {
		const { initAutoUpdater } = await import("./updater");
		initAutoUpdater();

		expect(fakeAutoUpdater.autoDownload).toBe(false);
	});

	it("only downloads an available update once the user accepts the consent dialog", async () => {
		const { initAutoUpdater } = await import("./updater");
		initAutoUpdater();

		showMessageBoxMock.mockResolvedValueOnce({ response: 0 }); // "Download"
		emit("update-available", { version: "9.9.9" });
		await new Promise((resolve) => setImmediate(resolve));

		expect(fakeAutoUpdater.downloadUpdate).toHaveBeenCalledTimes(1);
	});

	it("does not download when the user declines the consent dialog", async () => {
		const { initAutoUpdater } = await import("./updater");
		initAutoUpdater();

		showMessageBoxMock.mockResolvedValueOnce({ response: 1 }); // "Later"
		emit("update-available", { version: "9.9.9" });
		await new Promise((resolve) => setImmediate(resolve));

		expect(fakeAutoUpdater.downloadUpdate).not.toHaveBeenCalled();
	});

	it("persists an incremented failure count when a check errors", async () => {
		const { initAutoUpdater } = await import("./updater");
		initAutoUpdater();

		emit("error", new Error("network down"));
		await new Promise((resolve) => setImmediate(resolve));

		const writeFileMock = fsPromises.default.writeFile as ReturnType<typeof vi.fn>;
		const persisted = writeFileMock.mock.calls
			.map(([, payload]) => JSON.parse(payload as string))
			.some((state) => state.consecutiveFailures === 1);
		expect(persisted).toBe(true);
	});

	it("shows an install-failed dialog (not the silent backoff path) when quitAndInstall errors, e.g. unsigned macOS builds", async () => {
		const { initAutoUpdater } = await import("./updater");
		initAutoUpdater();

		showMessageBoxMock.mockResolvedValueOnce({ response: 0 }); // "Restart Now"
		emit("update-downloaded", { version: "9.9.9" });
		await new Promise((resolve) => setImmediate(resolve));

		expect(fakeAutoUpdater.quitAndInstall).toHaveBeenCalledTimes(1);

		showMessageBoxMock.mockResolvedValueOnce({ response: 1 }); // dialog response, don't care which yet
		emit("error", new Error("Could not get code signature for running application"));
		await new Promise((resolve) => setImmediate(resolve));

		expect(showMessageBoxMock).toHaveBeenCalledWith(
			expect.objectContaining({ title: "Update install failed" })
		);

		const writeFileMock = fsPromises.default.writeFile as ReturnType<typeof vi.fn>;
		const persistedFailure = writeFileMock.mock.calls
			.map(([, payload]) => JSON.parse(payload as string))
			.some((state) => state.consecutiveFailures === 1);
		expect(persistedFailure).toBe(false);
	});

	it("opens the releases page when the user picks that option from the install-failed dialog", async () => {
		const { initAutoUpdater } = await import("./updater");
		initAutoUpdater();

		showMessageBoxMock.mockResolvedValueOnce({ response: 0 }); // "Restart Now"
		emit("update-downloaded", { version: "9.9.9" });
		await new Promise((resolve) => setImmediate(resolve));

		showMessageBoxMock.mockResolvedValueOnce({ response: 0 }); // "Open Releases Page"
		emit("error", new Error("Could not get code signature for running application"));
		await new Promise((resolve) => setImmediate(resolve));

		expect(openExternalMock).toHaveBeenCalledWith("https://github.com/AdamJ/TimeTrackerPro/releases/latest");
	});

	it("falls back to the silent backoff path for a plain background check error (no pending install)", async () => {
		const { initAutoUpdater } = await import("./updater");
		initAutoUpdater();

		emit("error", new Error("network down"));
		await new Promise((resolve) => setImmediate(resolve));

		expect(showMessageBoxMock).not.toHaveBeenCalledWith(
			expect.objectContaining({ title: "Update install failed" })
		);
	});

	it("skips the startup check when still within the backoff window from a recent failure", async () => {
		(fsPromises.default.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
			JSON.stringify({ consecutiveFailures: 1, lastFailureAt: Date.now() })
		);

		const { initAutoUpdater } = await import("./updater");
		initAutoUpdater();
		await new Promise((resolve) => setImmediate(resolve));

		expect(fakeAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
	});

	it("runs the startup check once the backoff window has elapsed", async () => {
		(fsPromises.default.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
			JSON.stringify({ consecutiveFailures: 1, lastFailureAt: Date.now() - 2 * 60 * 60 * 1000 })
		);

		const { initAutoUpdater } = await import("./updater");
		initAutoUpdater();
		await new Promise((resolve) => setImmediate(resolve));

		expect(fakeAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
	});

	it("shows a dialog when a manual check finds no update available", async () => {
		const { checkForUpdates } = await import("./updater");
		checkForUpdates();
		emit("update-not-available");
		await new Promise((resolve) => setImmediate(resolve));

		expect(showMessageBoxMock).toHaveBeenCalledWith(
			expect.objectContaining({ title: "No updates available" })
		);
	});
});
