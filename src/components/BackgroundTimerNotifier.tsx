// src/components/BackgroundTimerNotifier.tsx
// No UI — mounted once at the app shell. While a task timer is running and
// the tab/PWA is hidden, keeps the document title live with the elapsed time
// and (when the user has opted in via Settings) fires an OS notification
// reminding them the timer is still running.
import { useEffect, useRef } from "react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useBackgroundNotificationSetting } from "@/hooks/useBackgroundNotificationSetting";
import { formatDurationLong } from "@/utils/timeUtil";

const NOTIFY_AFTER_HIDDEN_MS = 5 * 60 * 1000;
const TITLE_TICK_MS = 1000;

export const BackgroundTimerNotifier = () => {
	const { currentTask } = useTimeTracking();
	const [notificationsEnabled] = useBackgroundNotificationSetting();
	const originalTitleRef = useRef(document.title);
	const hiddenSinceRef = useRef<number | null>(null);
	const notifiedRef = useRef(false);
	const intervalRef = useRef<number | null>(null);

	useEffect(() => {
		const stopTicking = () => {
			if (intervalRef.current !== null) {
				window.clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};

		const restoreTitle = () => {
			document.title = originalTitleRef.current;
		};

		const tick = () => {
			if (!currentTask) return;

			const elapsedMs = Date.now() - currentTask.startTime.getTime();
			document.title = `${formatDurationLong(elapsedMs)} · ${currentTask.title}`;

			const hiddenSince = hiddenSinceRef.current;
			if (
				notificationsEnabled &&
				!notifiedRef.current &&
				hiddenSince !== null &&
				Date.now() - hiddenSince >= NOTIFY_AFTER_HIDDEN_MS &&
				"Notification" in window &&
				Notification.permission === "granted"
			) {
				notifiedRef.current = true;
				new Notification("Timer still running", {
					body: `"${currentTask.title}" has been tracking for ${formatDurationLong(elapsedMs)}.`,
					tag: "timetracker-background-timer",
				});
			}
		};

		const handleVisibilityChange = () => {
			if (document.hidden) {
				hiddenSinceRef.current = Date.now();
				notifiedRef.current = false;
				if (currentTask) {
					tick();
					intervalRef.current = window.setInterval(tick, TITLE_TICK_MS);
				}
			} else {
				hiddenSinceRef.current = null;
				stopTicking();
				restoreTitle();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			stopTicking();
			restoreTitle();
		};
	}, [currentTask, notificationsEnabled]);

	return null;
};
