import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useElectronBackup } from "./useElectronBackup";
import { toast } from "@/hooks/use-toast";

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

afterEach(() => {
	delete (window as { electronAPI?: unknown }).electronAPI;
	vi.clearAllMocks();
});

describe("useElectronBackup", () => {
	it("no-ops writeBackup without throwing when window.electronAPI is absent", async () => {
		const { result } = renderHook(() => useElectronBackup());

		await expect(
			act(async () => {
				await result.current.writeBackup({ foo: "bar" });
			})
		).resolves.not.toThrow();
	});

	it("no-ops registerQuitFlush without throwing when window.electronAPI is absent", () => {
		const { result } = renderHook(() => useElectronBackup());

		expect(() => {
			act(() => {
				result.current.registerQuitFlush(vi.fn());
			});
		}).not.toThrow();
	});

	it("calls window.electronAPI.writeBackup with the JSON-stringified snapshot", async () => {
		const writeBackup = vi.fn().mockResolvedValue({ ok: true });
		window.electronAPI = { writeBackup, requestFlushBeforeQuit: vi.fn() };

		const { result } = renderHook(() => useElectronBackup());

		await act(async () => {
			await result.current.writeBackup({ foo: "bar" });
		});

		expect(writeBackup).toHaveBeenCalledWith(JSON.stringify({ foo: "bar" }));
	});

	it("resolves with the write result and does not throw when the disk write fails", async () => {
		const writeBackup = vi.fn().mockResolvedValue({ ok: false, error: "ENOSPC: disk full" });
		window.electronAPI = { writeBackup, requestFlushBeforeQuit: vi.fn() };

		const { result } = renderHook(() => useElectronBackup());

		let writeResult: { ok: boolean; error?: string } | undefined;
		await act(async () => {
			writeResult = await result.current.writeBackup({ foo: "bar" });
		});

		expect(writeResult).toEqual({ ok: false, error: "ENOSPC: disk full" });
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ variant: "destructive", title: "Backup failed" })
		);
	});

	it("registers a single IPC listener that always calls the latest registered quit-flush callback", () => {
		let registeredCallback: (() => void) | undefined;
		window.electronAPI = {
			writeBackup: vi.fn(),
			requestFlushBeforeQuit: vi.fn((cb: () => void) => {
				registeredCallback = cb;
			})
		};

		const { result, rerender } = renderHook(() => useElectronBackup());

		const firstCallback = vi.fn();
		act(() => {
			result.current.registerQuitFlush(firstCallback);
		});
		rerender();

		const secondCallback = vi.fn();
		act(() => {
			result.current.registerQuitFlush(secondCallback);
		});
		rerender();

		expect(window.electronAPI.requestFlushBeforeQuit).toHaveBeenCalledTimes(1);

		registeredCallback?.();

		expect(firstCallback).not.toHaveBeenCalled();
		expect(secondCallback).toHaveBeenCalledTimes(1);
	});

	it("lets a quit-flush callback await a failed writeBackup without throwing, so the done-ack still fires", async () => {
		const writeBackup = vi.fn().mockResolvedValue({ ok: false, error: "EACCES: permission denied" });
		let registeredCallback: (() => void | Promise<void>) | undefined;
		window.electronAPI = {
			writeBackup,
			requestFlushBeforeQuit: vi.fn((cb: () => void | Promise<void>) => {
				registeredCallback = cb;
			})
		};

		const { result } = renderHook(() => useElectronBackup());

		const quitFlushCallback = vi.fn(async () => {
			await result.current.writeBackup({ foo: "bar" });
		});
		act(() => {
			result.current.registerQuitFlush(quitFlushCallback);
		});

		await expect(registeredCallback?.()).resolves.not.toThrow();
		expect(quitFlushCallback).toHaveBeenCalledTimes(1);
	});
});
