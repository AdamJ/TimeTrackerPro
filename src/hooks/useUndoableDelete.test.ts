import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/hooks/use-toast", () => ({
	toast: vi.fn()
}));

import { toast } from "@/hooks/use-toast";
import { useUndoableDelete } from "./useUndoableDelete";

describe("useUndoableDelete", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("shows a toast with the given title and description immediately", () => {
		const { result } = renderHook(() => useUndoableDelete<{ id: string }>());

		act(() => {
			result.current.confirmDelete({ id: "1" }, vi.fn(), {
				title: "Item deleted",
				description: "\"Item\" has been removed."
			});
		});

		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Item deleted",
				description: "\"Item\" has been removed."
			})
		);
	});

	it("calls onUndo with the deleted item when Undo is clicked within the grace period", () => {
		const { result } = renderHook(() => useUndoableDelete<{ id: string }>());
		const item = { id: "1" };
		const onUndo = vi.fn();

		act(() => {
			result.current.confirmDelete(item, onUndo, { title: "Item deleted" });
		});

		const call = (toast as ReturnType<typeof vi.fn>).mock.calls[0][0];
		act(() => {
			call.action.props.onClick();
		});

		expect(onUndo).toHaveBeenCalledWith(item);
	});

	it("does not call onUndo if Undo is clicked after the grace period has expired", () => {
		const { result } = renderHook(() => useUndoableDelete<{ id: string }>());
		const item = { id: "1" };
		const onUndo = vi.fn();

		act(() => {
			result.current.confirmDelete(item, onUndo, { title: "Item deleted" });
		});

		act(() => {
			vi.advanceTimersByTime(9000);
		});

		const call = (toast as ReturnType<typeof vi.fn>).mock.calls[0][0];
		act(() => {
			call.action.props.onClick();
		});

		expect(onUndo).not.toHaveBeenCalled();
	});

	it("only calls onUndo once even if Undo is clicked multiple times", () => {
		const { result } = renderHook(() => useUndoableDelete<{ id: string }>());
		const item = { id: "1" };
		const onUndo = vi.fn();

		act(() => {
			result.current.confirmDelete(item, onUndo, { title: "Item deleted" });
		});

		const call = (toast as ReturnType<typeof vi.fn>).mock.calls[0][0];
		act(() => {
			call.action.props.onClick();
			call.action.props.onClick();
		});

		expect(onUndo).toHaveBeenCalledTimes(1);
	});
});
