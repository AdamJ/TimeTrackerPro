import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { act } from "react";
import { TimerLiveRegion } from "./TimerLiveRegion";

let mockCurrentTask: { id: string; title: string } | null = null;
let mockIsDayStarted = false;

vi.mock("@/hooks/useTimeTracking", () => ({
	useTimeTracking: () => ({
		currentTask: mockCurrentTask,
		isDayStarted: mockIsDayStarted,
	}),
}));

describe("TimerLiveRegion", () => {
	beforeEach(() => {
		mockCurrentTask = null;
		mockIsDayStarted = false;
	});

	it("renders an empty aria-live region on mount, even if a day/task is already in progress", () => {
		mockCurrentTask = { id: "1", title: "Write report" };
		mockIsDayStarted = true;
		const { container } = render(<TimerLiveRegion />);

		const region = container.querySelector('[aria-live="polite"]');
		expect(region).not.toBeNull();
		expect(region?.textContent).toBe("");
	});

	it("announces when the day starts", () => {
		const { rerender, container } = render(<TimerLiveRegion />);

		mockIsDayStarted = true;
		act(() => {
			rerender(<TimerLiveRegion />);
		});

		expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe(
			"Work day started",
		);
	});

	it("announces when the day ends", () => {
		mockIsDayStarted = true;
		const { rerender, container } = render(<TimerLiveRegion />);

		mockIsDayStarted = false;
		act(() => {
			rerender(<TimerLiveRegion />);
		});

		expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe(
			"Work day ended",
		);
	});

	it("announces when a task starts", () => {
		mockIsDayStarted = true;
		const { rerender, container } = render(<TimerLiveRegion />);

		mockCurrentTask = { id: "1", title: "Write report" };
		act(() => {
			rerender(<TimerLiveRegion />);
		});

		expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe(
			"Timer started: Write report",
		);
	});

	it("announces the new task when switching between tasks, not a stop message", () => {
		mockIsDayStarted = true;
		mockCurrentTask = { id: "1", title: "Write report" };
		const { rerender, container } = render(<TimerLiveRegion />);

		mockCurrentTask = { id: "2", title: "Review PR" };
		act(() => {
			rerender(<TimerLiveRegion />);
		});

		expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe(
			"Timer started: Review PR",
		);
	});

	it("announces when a task stops without the day ending", () => {
		mockIsDayStarted = true;
		mockCurrentTask = { id: "1", title: "Write report" };
		const { rerender, container } = render(<TimerLiveRegion />);

		mockCurrentTask = null;
		act(() => {
			rerender(<TimerLiveRegion />);
		});

		expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe(
			"Timer stopped",
		);
	});

	it("only announces the day ending, not a separate stop, when the active task's day ends", () => {
		mockIsDayStarted = true;
		mockCurrentTask = { id: "1", title: "Write report" };
		const { rerender, container } = render(<TimerLiveRegion />);

		mockCurrentTask = null;
		mockIsDayStarted = false;
		act(() => {
			rerender(<TimerLiveRegion />);
		});

		expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe(
			"Work day ended",
		);
	});
});
