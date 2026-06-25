import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
	useBackgroundNotificationSetting,
	BACKGROUND_NOTIFICATIONS_KEY,
} from "./useBackgroundNotificationSetting";

describe("useBackgroundNotificationSetting", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("defaults to false when nothing is persisted", () => {
		const { result } = renderHook(() => useBackgroundNotificationSetting());
		expect(result.current[0]).toBe(false);
	});

	it("reads a previously persisted true value on mount", () => {
		localStorage.setItem(BACKGROUND_NOTIFICATIONS_KEY, "true");
		const { result } = renderHook(() => useBackgroundNotificationSetting());
		expect(result.current[0]).toBe(true);
	});

	it("persists the value to localStorage when toggled on", () => {
		const { result } = renderHook(() => useBackgroundNotificationSetting());

		act(() => {
			result.current[1](true);
		});

		expect(result.current[0]).toBe(true);
		expect(localStorage.getItem(BACKGROUND_NOTIFICATIONS_KEY)).toBe("true");
	});

	it("syncs the toggle across hook instances in the same tab", () => {
		const { result: a } = renderHook(() => useBackgroundNotificationSetting());
		const { result: b } = renderHook(() => useBackgroundNotificationSetting());

		act(() => {
			a.current[1](true);
		});

		expect(b.current[0]).toBe(true);
	});
});
