import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { addMenuActionListener } from "@/lib/electronMenuActions";

let mockPathname = "/";

vi.mock("react-router-dom", () => ({
	useLocation: () => ({ pathname: mockPathname }),
}));

function dispatchKeyDown(init: KeyboardEventInit & { target?: EventTarget }) {
	const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
	(init.target ?? window).dispatchEvent(event);
	return event;
}

describe("useKeyboardShortcuts", () => {
	beforeEach(() => {
		mockPathname = "/";
	});

	it("opens the command palette on Cmd/Ctrl+K", () => {
		const onOpenCommandPalette = vi.fn();
		renderHook(() =>
			useKeyboardShortcuts({ onSave: vi.fn(), onOpenCommandPalette, onOpenShortcutsHelp: vi.fn() })
		);

		dispatchKeyDown({ key: "k", ctrlKey: true });

		expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);
	});

	it("triggers save on Cmd/Ctrl+S even while typing in a field", () => {
		const onSave = vi.fn();
		renderHook(() => useKeyboardShortcuts({ onSave, onOpenCommandPalette: vi.fn(), onOpenShortcutsHelp: vi.fn() }));

		const input = document.createElement("input");
		document.body.appendChild(input);
		dispatchKeyDown({ key: "s", metaKey: true, target: input });

		expect(onSave).toHaveBeenCalledTimes(1);
		document.body.removeChild(input);
	});

	it("notifies the new-task listener on plain N while on the Dashboard", () => {
		mockPathname = "/";
		const onNewTask = vi.fn();
		const unsubscribe = addMenuActionListener("new-task", onNewTask);
		renderHook(() =>
			useKeyboardShortcuts({ onSave: vi.fn(), onOpenCommandPalette: vi.fn(), onOpenShortcutsHelp: vi.fn() })
		);

		dispatchKeyDown({ key: "n" });

		expect(onNewTask).toHaveBeenCalledTimes(1);
		unsubscribe();
	});

	it("does nothing for plain N off the Dashboard", () => {
		mockPathname = "/tasks";
		const onNewTask = vi.fn();
		const unsubscribe = addMenuActionListener("new-task", onNewTask);
		renderHook(() =>
			useKeyboardShortcuts({ onSave: vi.fn(), onOpenCommandPalette: vi.fn(), onOpenShortcutsHelp: vi.fn() })
		);

		dispatchKeyDown({ key: "n" });

		expect(onNewTask).not.toHaveBeenCalled();
		unsubscribe();
	});

	it("ignores Cmd/Ctrl+N (reserved by the browser for a new window) so it doesn't double-fire", () => {
		const onNewTask = vi.fn();
		const unsubscribe = addMenuActionListener("new-task", onNewTask);
		renderHook(() =>
			useKeyboardShortcuts({ onSave: vi.fn(), onOpenCommandPalette: vi.fn(), onOpenShortcutsHelp: vi.fn() })
		);

		dispatchKeyDown({ key: "n", ctrlKey: true });

		expect(onNewTask).not.toHaveBeenCalled();
		unsubscribe();
	});

	it("ignores plain N while typing in a field, even on the Dashboard", () => {
		const onNewTask = vi.fn();
		const unsubscribe = addMenuActionListener("new-task", onNewTask);
		renderHook(() =>
			useKeyboardShortcuts({ onSave: vi.fn(), onOpenCommandPalette: vi.fn(), onOpenShortcutsHelp: vi.fn() })
		);

		const input = document.createElement("input");
		document.body.appendChild(input);
		dispatchKeyDown({ key: "n", target: input });

		expect(onNewTask).not.toHaveBeenCalled();
		document.body.removeChild(input);
		unsubscribe();
	});

	it("opens the shortcuts help dialog on ?", () => {
		const onOpenShortcutsHelp = vi.fn();
		renderHook(() =>
			useKeyboardShortcuts({ onSave: vi.fn(), onOpenCommandPalette: vi.fn(), onOpenShortcutsHelp })
		);

		dispatchKeyDown({ key: "?" });

		expect(onOpenShortcutsHelp).toHaveBeenCalledTimes(1);
	});

	it("does not open shortcuts help for ? while typing in a field", () => {
		const onOpenShortcutsHelp = vi.fn();
		renderHook(() =>
			useKeyboardShortcuts({ onSave: vi.fn(), onOpenCommandPalette: vi.fn(), onOpenShortcutsHelp })
		);

		const textarea = document.createElement("textarea");
		document.body.appendChild(textarea);
		dispatchKeyDown({ key: "?", target: textarea });

		expect(onOpenShortcutsHelp).not.toHaveBeenCalled();
		document.body.removeChild(textarea);
	});

	it("removes the listener on unmount", () => {
		const onOpenCommandPalette = vi.fn();
		const { unmount } = renderHook(() =>
			useKeyboardShortcuts({ onSave: vi.fn(), onOpenCommandPalette, onOpenShortcutsHelp: vi.fn() })
		);

		unmount();
		dispatchKeyDown({ key: "k", ctrlKey: true });

		expect(onOpenCommandPalette).not.toHaveBeenCalled();
	});
});
