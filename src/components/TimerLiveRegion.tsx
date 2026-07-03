// src/components/TimerLiveRegion.tsx
// No UI — mounted once at the app shell. Announces timer state transitions
// (task started/stopped, day started/ended) via a visually-hidden aria-live
// region, so screen reader users watching a focused tab get the same live
// indication that sighted users get from the on-page UI change.
import { useEffect, useRef, useState } from "react";
import { useTimeTracking } from "@/hooks/useTimeTracking";

export const TimerLiveRegion = () => {
	const { currentTask, isDayStarted } = useTimeTracking();
	const [message, setMessage] = useState("");
	const prevIsDayStartedRef = useRef(isDayStarted);
	const prevTaskIdRef = useRef(currentTask?.id ?? null);
	const isFirstRunRef = useRef(true);

	useEffect(() => {
		const prevIsDayStarted = prevIsDayStartedRef.current;
		const prevTaskId = prevTaskIdRef.current;
		const taskId = currentTask?.id ?? null;

		if (!isFirstRunRef.current) {
			if (!prevIsDayStarted && isDayStarted) {
				setMessage("Work day started");
			} else if (prevIsDayStarted && !isDayStarted) {
				setMessage("Work day ended");
			} else if (taskId && taskId !== prevTaskId) {
				setMessage(`Timer started: ${currentTask?.title}`);
			} else if (!taskId && prevTaskId) {
				setMessage("Timer stopped");
			}
		}

		isFirstRunRef.current = false;
		prevIsDayStartedRef.current = isDayStarted;
		prevTaskIdRef.current = taskId;
	}, [isDayStarted, currentTask]);

	return (
		<span className="sr-only" aria-live="polite" aria-atomic="true">
			{message}
		</span>
	);
};
