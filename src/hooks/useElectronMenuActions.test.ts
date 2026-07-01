import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useElectronMenuActions } from "@/hooks/useElectronMenuActions";
import { consumePendingMenuAction } from "@/lib/electronMenuActions";

const navigateMock = vi.fn();

vi.mock("react-router-dom", () => ({
	useNavigate: () => navigateMock,
}));

describe("useElectronMenuActions", () => {
	beforeEach(() => {
		navigateMock.mockClear();
	});

	afterEach(() => {
		delete (window as { electronAPI?: unknown }).electronAPI;
	});

	it("no-ops when window.electronAPI is absent", () => {
		renderHook(() => useElectronMenuActions());
		expect(navigateMock).not.toHaveBeenCalled();
	});

	it("navigates and stashes the pending action on a known menu action", () => {
		let listener: ((action: string) => void) | undefined;
		const unsubscribe = vi.fn();
		window.electronAPI = {
			writeBackup: vi.fn(),
			requestFlushBeforeQuit: vi.fn(),
			onMenuAction: (callback) => {
				listener = callback;
				return unsubscribe;
			},
		};

		renderHook(() => useElectronMenuActions());
		listener?.("export");

		expect(navigateMock).toHaveBeenCalledWith("/settings");
		expect(consumePendingMenuAction("export")).toBe(true);
	});

	it("ignores unknown menu actions", () => {
		let listener: ((action: string) => void) | undefined;
		window.electronAPI = {
			writeBackup: vi.fn(),
			requestFlushBeforeQuit: vi.fn(),
			onMenuAction: (callback) => {
				listener = callback;
				return vi.fn();
			},
		};

		renderHook(() => useElectronMenuActions());
		listener?.("unknown-action");

		expect(navigateMock).not.toHaveBeenCalled();
	});

	it("unsubscribes on unmount", () => {
		const unsubscribe = vi.fn();
		window.electronAPI = {
			writeBackup: vi.fn(),
			requestFlushBeforeQuit: vi.fn(),
			onMenuAction: () => unsubscribe,
		};

		const { unmount } = renderHook(() => useElectronMenuActions());
		unmount();

		expect(unsubscribe).toHaveBeenCalledTimes(1);
	});

	it("invokes onSave for the save action without navigating", () => {
		let listener: ((action: string) => void) | undefined;
		window.electronAPI = {
			writeBackup: vi.fn(),
			requestFlushBeforeQuit: vi.fn(),
			onMenuAction: (callback) => {
				listener = callback;
				return vi.fn();
			},
		};
		const onSave = vi.fn();

		renderHook(() => useElectronMenuActions({ onSave }));
		listener?.("save");

		expect(onSave).toHaveBeenCalledTimes(1);
		expect(navigateMock).not.toHaveBeenCalled();
	});

	it("invokes onOpenCommandPalette for the command-palette action", () => {
		let listener: ((action: string) => void) | undefined;
		window.electronAPI = {
			writeBackup: vi.fn(),
			requestFlushBeforeQuit: vi.fn(),
			onMenuAction: (callback) => {
				listener = callback;
				return vi.fn();
			},
		};
		const onOpenCommandPalette = vi.fn();

		renderHook(() => useElectronMenuActions({ onOpenCommandPalette }));
		listener?.("command-palette");

		expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);
		expect(navigateMock).not.toHaveBeenCalled();
	});

	it("invokes onOpenShortcutsHelp for the shortcuts-help action", () => {
		let listener: ((action: string) => void) | undefined;
		window.electronAPI = {
			writeBackup: vi.fn(),
			requestFlushBeforeQuit: vi.fn(),
			onMenuAction: (callback) => {
				listener = callback;
				return vi.fn();
			},
		};
		const onOpenShortcutsHelp = vi.fn();

		renderHook(() => useElectronMenuActions({ onOpenShortcutsHelp }));
		listener?.("shortcuts-help");

		expect(onOpenShortcutsHelp).toHaveBeenCalledTimes(1);
		expect(navigateMock).not.toHaveBeenCalled();
	});
});
