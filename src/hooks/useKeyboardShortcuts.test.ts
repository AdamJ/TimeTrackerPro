import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { consumePendingMenuAction } from "@/lib/electronMenuActions";

const navigateMock = vi.fn();

vi.mock("react-router-dom", () => ({
	useNavigate: () => navigateMock,
}));

function dispatchKeyDown(init: KeyboardEventInit & { target?: EventTarget }) {
	const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
	(init.target ?? window).dispatchEvent(event);
	return event;
}

describe("useKeyboardShortcuts", () => {
	beforeEach(() => {
		navigateMock.mockClear();
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

	it("navigates home and stashes the new-task pending action on plain N", () => {
		renderHook(() =>
			useKeyboardShortcuts({ onSave: vi.fn(), onOpenCommandPalette: vi.fn(), onOpenShortcutsHelp: vi.fn() })
		);

		dispatchKeyDown({ key: "n" });

		expect(navigateMock).toHaveBeenCalledWith("/");
		expect(consumePendingMenuAction("new-task")).toBe(true);
	});

	it("ignores Cmd/Ctrl+N (reserved by the browser for a new window) so it doesn't double-fire", () => {
		renderHook(() =>
			useKeyboardShortcuts({ onSave: vi.fn(), onOpenCommandPalette: vi.fn(), onOpenShortcutsHelp: vi.fn() })
		);

		dispatchKeyDown({ key: "n", ctrlKey: true });

		expect(navigateMock).not.toHaveBeenCalled();
	});

	it("ignores plain N while typing in a field", () => {
		renderHook(() =>
			useKeyboardShortcuts({ onSave: vi.fn(), onOpenCommandPalette: vi.fn(), onOpenShortcutsHelp: vi.fn() })
		);

		const input = document.createElement("input");
		document.body.appendChild(input);
		dispatchKeyDown({ key: "n", target: input });

		expect(navigateMock).not.toHaveBeenCalled();
		document.body.removeChild(input);
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
