import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useElectronBackup } from "./useElectronBackup";

afterEach(() => {
	delete (window as { electronAPI?: unknown }).electronAPI;
	vi.clearAllMocks();
});

describe("useElectronBackup", () => {
	it("no-ops writeBackup without throwing when window.electronAPI is absent", () => {
		const { result } = renderHook(() => useElectronBackup());

		expect(() => {
			act(() => {
				result.current.writeBackup({ foo: "bar" });
			});
		}).not.toThrow();
	});

	it("no-ops registerQuitFlush without throwing when window.electronAPI is absent", () => {
		const { result } = renderHook(() => useElectronBackup());

		expect(() => {
			act(() => {
				result.current.registerQuitFlush(vi.fn());
			});
		}).not.toThrow();
	});

	it("calls window.electronAPI.writeBackup with the JSON-stringified snapshot", () => {
		const writeBackup = vi.fn();
		window.electronAPI = { writeBackup, requestFlushBeforeQuit: vi.fn() };

		const { result } = renderHook(() => useElectronBackup());

		act(() => {
			result.current.writeBackup({ foo: "bar" });
		});

		expect(writeBackup).toHaveBeenCalledWith(JSON.stringify({ foo: "bar" }));
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
});
