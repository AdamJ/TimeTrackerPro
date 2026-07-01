import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type Handler = (...args: unknown[]) => unknown;

const ipcHandlers = new Map<string, Handler>();
const onceHandlers = new Map<string, Handler>();
const winEventHandlers = new Map<string, Handler>();
const appEventHandlers = new Map<string, Handler>();

const closeMock = vi.fn();
const sendMock = vi.fn();
const appQuitMock = vi.fn();

vi.mock("fs/promises", () => ({
	default: {
		mkdir: vi.fn().mockResolvedValue(undefined),
		writeFile: vi.fn().mockResolvedValue(undefined),
		readdir: vi.fn().mockResolvedValue([]),
		unlink: vi.fn().mockResolvedValue(undefined),
		stat: vi.fn().mockResolvedValue({ mtime: new Date(), size: 0 }),
		readFile: vi.fn().mockResolvedValue("{}")
	}
}));

vi.mock("electron", () => ({
	app: {
		getPath: vi.fn(() => "/tmp/userData"),
		whenReady: vi.fn(() => Promise.resolve()),
		on: vi.fn((event: string, handler: Handler) => {
			appEventHandlers.set(event, handler);
		}),
		quit: appQuitMock,
		isPackaged: false
	},
	BrowserWindow: Object.assign(
		vi.fn().mockImplementation(() => ({
			on: vi.fn((event: string, handler: Handler) => {
				winEventHandlers.set(event, handler);
			}),
			webContents: { send: sendMock },
			close: closeMock,
			loadURL: vi.fn().mockResolvedValue(undefined)
		})),
		{ getAllWindows: vi.fn(() => []) }
	),
	session: { defaultSession: { webRequest: { onHeadersReceived: vi.fn() } } },
	protocol: { registerSchemesAsPrivileged: vi.fn(), handle: vi.fn() },
	net: { fetch: vi.fn() },
	ipcMain: {
		handle: vi.fn((name: string, handler: Handler) => ipcHandlers.set(name, handler)),
		once: vi.fn((name: string, handler: Handler) => onceHandlers.set(name, handler))
	}
}));

vi.mock("./menu", () => ({ buildApplicationMenu: vi.fn() }));
vi.mock("./updater", () => ({ initAutoUpdater: vi.fn() }));

const fsPromises = await import("fs/promises");

describe("electron/main backup:write IPC handler", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		ipcHandlers.clear();
		onceHandlers.clear();
		winEventHandlers.clear();
		appEventHandlers.clear();
		vi.resetModules();
		await import("./main");
		await new Promise((resolve) => setImmediate(resolve));
	});

	it("resolves with { ok: false, error } instead of throwing when the disk write fails", async () => {
		const writeFileMock = fsPromises.default.writeFile as ReturnType<typeof vi.fn>;
		writeFileMock.mockRejectedValueOnce(new Error("ENOSPC: no space left on device"));

		const handler = ipcHandlers.get("backup:write");
		expect(handler).toBeDefined();

		const result = await handler?.(undefined, JSON.stringify({ foo: "bar" }));

		expect(result).toEqual({ ok: false, error: "ENOSPC: no space left on device" });
	});

	it("resolves with { ok: true } when the disk write succeeds", async () => {
		const handler = ipcHandlers.get("backup:write");

		const result = await handler?.(undefined, JSON.stringify({ foo: "bar" }));

		expect(result).toEqual({ ok: true });
	});

	it("only prunes (readdir) every 5th write, not on every single write", async () => {
		const readdirMock = fsPromises.default.readdir as ReturnType<typeof vi.fn>;
		const handler = ipcHandlers.get("backup:write");

		for (let i = 0; i < 4; i++) {
			await handler?.(undefined, JSON.stringify({ foo: "bar" }));
		}
		expect(readdirMock).not.toHaveBeenCalled();

		await handler?.(undefined, JSON.stringify({ foo: "bar" }));
		expect(readdirMock).toHaveBeenCalledTimes(1);

		for (let i = 0; i < 4; i++) {
			await handler?.(undefined, JSON.stringify({ foo: "bar" }));
		}
		expect(readdirMock).toHaveBeenCalledTimes(1);

		await handler?.(undefined, JSON.stringify({ foo: "bar" }));
		expect(readdirMock).toHaveBeenCalledTimes(2);
	});
});

describe("electron/main quit-flush timeout fallback", () => {
	// The global test-setup.ts already calls vi.setSystemTime(), which puts
	// vitest's fake-timer machinery in a state where a second vi.useFakeTimers()
	// call throws — so the real setTimeout/clearTimeout are spied on directly
	// instead, with the scheduled callback invoked manually to simulate elapsed time.
	let timeoutCallback: (() => void) | undefined;
	let setTimeoutSpy: ReturnType<typeof vi.spyOn>;
	let clearTimeoutSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		ipcHandlers.clear();
		onceHandlers.clear();
		winEventHandlers.clear();
		appEventHandlers.clear();
		vi.resetModules();
		timeoutCallback = undefined;
		setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((cb: () => void) => {
			timeoutCallback = cb;
			return 1 as unknown as NodeJS.Timeout;
		}) as typeof setTimeout);
		clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout").mockImplementation(() => undefined);
		await import("./main");
		await new Promise((resolve) => setImmediate(resolve));
	});

	afterEach(() => {
		// Restore only the two real-timer spies — vi.restoreAllMocks() would also
		// wipe the mockImplementation on the plain vi.fn()-based "electron" mock
		// (BrowserWindow etc.), since restore on a non-spy vi.fn() clears its impl.
		setTimeoutSpy.mockRestore();
		clearTimeoutSpy.mockRestore();
	});

	it("still closes the window once the timeout elapses, even if the renderer's flush ack never arrives (e.g. disk write hangs/fails)", () => {
		const closeHandler = winEventHandlers.get("close");
		expect(closeHandler).toBeDefined();

		const preventDefault = vi.fn();
		closeHandler?.({ preventDefault });

		// Quit flush requested from the renderer, but it never sends
		// "before-quit-flush-done" back (simulating a hung/failed disk write).
		expect(preventDefault).toHaveBeenCalled();
		expect(sendMock).toHaveBeenCalledWith("before-quit-flush");
		expect(closeMock).not.toHaveBeenCalled();
		expect(timeoutCallback).toBeDefined();

		timeoutCallback?.();

		expect(closeMock).toHaveBeenCalledTimes(1);
	});

	it("closes the window as soon as before-quit-flush-done arrives, without waiting for the timeout", () => {
		const closeHandler = winEventHandlers.get("close");
		closeHandler?.({ preventDefault: vi.fn() });

		const doneHandler = onceHandlers.get("before-quit-flush-done");
		expect(doneHandler).toBeDefined();
		doneHandler?.();

		expect(clearTimeoutSpy).toHaveBeenCalled();
		expect(closeMock).toHaveBeenCalledTimes(1);

		// Firing the (already-cleared) timeout callback afterward must not close it again.
		timeoutCallback?.();
		expect(closeMock).toHaveBeenCalledTimes(1);
	});

	it("resumes app.quit() after the flush when the close was triggered by a real quit request (Cmd+Q/menu Quit), instead of only closing the window", () => {
		const beforeQuitHandler = appEventHandlers.get("before-quit");
		expect(beforeQuitHandler).toBeDefined();
		beforeQuitHandler?.();

		const closeHandler = winEventHandlers.get("close");
		closeHandler?.({ preventDefault: vi.fn() });

		const doneHandler = onceHandlers.get("before-quit-flush-done");
		doneHandler?.();

		expect(appQuitMock).toHaveBeenCalledTimes(1);
		expect(closeMock).not.toHaveBeenCalled();
	});

	it("just closes the window (without forcing a full app.quit()) when the close was a plain window-close, not a real quit request", () => {
		const closeHandler = winEventHandlers.get("close");
		closeHandler?.({ preventDefault: vi.fn() });

		const doneHandler = onceHandlers.get("before-quit-flush-done");
		doneHandler?.();

		expect(closeMock).toHaveBeenCalledTimes(1);
		expect(appQuitMock).not.toHaveBeenCalled();
	});
});
