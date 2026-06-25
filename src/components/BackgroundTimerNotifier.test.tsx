import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { act } from "react";
import { BackgroundTimerNotifier } from "./BackgroundTimerNotifier";

let mockCurrentTask: { title: string; startTime: Date } | null = null;
let mockNotificationsEnabled = false;

vi.mock("@/hooks/useTimeTracking", () => ({
	useTimeTracking: () => ({ currentTask: mockCurrentTask }),
}));

vi.mock("@/hooks/useBackgroundNotificationSetting", () => ({
	useBackgroundNotificationSetting: () => [mockNotificationsEnabled, vi.fn()],
}));

function setHidden(hidden: boolean) {
	Object.defineProperty(document, "hidden", {
		configurable: true,
		get: () => hidden,
	});
	document.dispatchEvent(new Event("visibilitychange"));
}

describe("BackgroundTimerNotifier", () => {
	let originalTitle: string;
	let notificationSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.useRealTimers();
		vi.useFakeTimers();
		originalTitle = document.title;
		document.title = "Timetraked";
		mockCurrentTask = null;
		mockNotificationsEnabled = false;

		notificationSpy = vi.fn();
		class MockNotification {
			static permission = "granted";
			static requestPermission = vi.fn();
			constructor(title: string, options?: NotificationOptions) {
				notificationSpy(title, options);
			}
		}
		vi.stubGlobal("Notification", MockNotification);
	});

	afterEach(() => {
		setHidden(false);
		document.title = originalTitle;
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("renders nothing", () => {
		const { container } = render(<BackgroundTimerNotifier />);
		expect(container).toBeEmptyDOMElement();
	});

	it("does not touch the title while the tab stays visible", () => {
		mockCurrentTask = { title: "Write report", startTime: new Date() };
		render(<BackgroundTimerNotifier />);
		expect(document.title).toBe("Timetraked");
	});

	it("updates the document title with elapsed time once the tab is hidden", () => {
		mockCurrentTask = { title: "Write report", startTime: new Date() };
		render(<BackgroundTimerNotifier />);

		act(() => {
			setHidden(true);
		});

		expect(document.title).toContain("Write report");
	});

	it("restores the original title once the tab becomes visible again", () => {
		mockCurrentTask = { title: "Write report", startTime: new Date() };
		render(<BackgroundTimerNotifier />);

		act(() => {
			setHidden(true);
		});
		act(() => {
			setHidden(false);
		});

		expect(document.title).toBe("Timetraked");
	});

	it("does not fire a notification when the setting is disabled", () => {
		mockCurrentTask = { title: "Write report", startTime: new Date() };
		mockNotificationsEnabled = false;
		render(<BackgroundTimerNotifier />);

		act(() => {
			setHidden(true);
		});
		act(() => {
			vi.advanceTimersByTime(6 * 60 * 1000);
		});

		expect(notificationSpy).not.toHaveBeenCalled();
	});

	it("fires a notification after the threshold once the setting is enabled", () => {
		mockCurrentTask = { title: "Write report", startTime: new Date() };
		mockNotificationsEnabled = true;
		render(<BackgroundTimerNotifier />);

		act(() => {
			setHidden(true);
		});
		act(() => {
			vi.advanceTimersByTime(5 * 60 * 1000);
		});

		expect(notificationSpy).toHaveBeenCalledTimes(1);
		expect(notificationSpy.mock.calls[0][0]).toBe("Timer still running");
	});

	it("does not fire more than one notification per hidden session", () => {
		mockCurrentTask = { title: "Write report", startTime: new Date() };
		mockNotificationsEnabled = true;
		render(<BackgroundTimerNotifier />);

		act(() => {
			setHidden(true);
		});
		act(() => {
			vi.advanceTimersByTime(10 * 60 * 1000);
		});

		expect(notificationSpy).toHaveBeenCalledTimes(1);
	});
});
