import { describe, it, expect, vi, beforeEach } from "vitest";

type Handler = (...args: unknown[]) => unknown;

const exposeInMainWorldMock = vi.fn();
const invokeMock = vi.fn();
const onMock = vi.fn();
const sendMock = vi.fn();
const removeListenerMock = vi.fn();

vi.mock("electron", () => ({
	contextBridge: { exposeInMainWorld: exposeInMainWorldMock },
	ipcRenderer: {
		invoke: invokeMock,
		on: onMock,
		send: sendMock,
		removeListener: removeListenerMock,
	},
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElectronAPI = Record<string, any>;

async function loadElectronAPI(): Promise<ElectronAPI> {
	vi.resetModules();
	exposeInMainWorldMock.mockClear();
	invokeMock.mockClear();
	onMock.mockClear();
	sendMock.mockClear();
	removeListenerMock.mockClear();
	await import("./preload");
	expect(exposeInMainWorldMock).toHaveBeenCalledWith("electronAPI", expect.any(Object));
	return exposeInMainWorldMock.mock.calls[0][1] as ElectronAPI;
}

describe("electron/preload electronAPI bridge", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("exposes electronAPI on the main world via contextBridge", async () => {
		const api = await loadElectronAPI();
		expect(Object.keys(api).sort()).toEqual(
			["listBackups", "onMenuAction", "readBackup", "requestFlushBeforeQuit", "writeBackup"].sort(),
		);
	});

	it("writeBackup invokes 'backup:write' with the given JSON payload", async () => {
		invokeMock.mockResolvedValueOnce({ ok: true });
		const api = await loadElectronAPI();

		const result = await api.writeBackup("{\"foo\":1}");

		expect(invokeMock).toHaveBeenCalledWith("backup:write", "{\"foo\":1}");
		expect(result).toEqual({ ok: true });
	});

	it("listBackups invokes 'backup:list'", async () => {
		invokeMock.mockResolvedValueOnce({ ok: true, backups: [] });
		const api = await loadElectronAPI();

		const result = await api.listBackups();

		expect(invokeMock).toHaveBeenCalledWith("backup:list");
		expect(result).toEqual({ ok: true, backups: [] });
	});

	it("readBackup invokes 'backup:read' with the given name", async () => {
		invokeMock.mockResolvedValueOnce({ ok: true, content: "{}" });
		const api = await loadElectronAPI();

		const result = await api.readBackup("backup-1.json");

		expect(invokeMock).toHaveBeenCalledWith("backup:read", "backup-1.json");
		expect(result).toEqual({ ok: true, content: "{}" });
	});

	it("requestFlushBeforeQuit registers a before-quit-flush listener that awaits the callback then acks", async () => {
		const api = await loadElectronAPI();
		const callback = vi.fn().mockResolvedValue(undefined);

		api.requestFlushBeforeQuit(callback);

		expect(onMock).toHaveBeenCalledWith("before-quit-flush", expect.any(Function));
		const listener = onMock.mock.calls[0][1] as Handler;

		await listener();

		expect(callback).toHaveBeenCalledTimes(1);
		expect(sendMock).toHaveBeenCalledWith("before-quit-flush-done");
	});

	it("requestFlushBeforeQuit still acks even when the callback throws", async () => {
		const api = await loadElectronAPI();
		const callback = vi.fn().mockRejectedValue(new Error("flush failed"));

		api.requestFlushBeforeQuit(callback);
		const listener = onMock.mock.calls[0][1] as Handler;

		await expect(listener()).rejects.toThrow("flush failed");

		expect(sendMock).toHaveBeenCalledWith("before-quit-flush-done");
	});

	it("onMenuAction registers a menu:action listener, forwards the action, and returns an unsubscribe function", async () => {
		const api = await loadElectronAPI();
		const callback = vi.fn();

		const unsubscribe = api.onMenuAction(callback);

		expect(onMock).toHaveBeenCalledWith("menu:action", expect.any(Function));
		const listener = onMock.mock.calls[0][1] as Handler;

		listener({}, "new-task");
		expect(callback).toHaveBeenCalledWith("new-task");

		unsubscribe();
		expect(removeListenerMock).toHaveBeenCalledWith("menu:action", listener);
	});
});
