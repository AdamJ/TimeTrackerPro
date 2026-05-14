import { useRef, useCallback } from "react";

/**
 * Returns pointer event handlers that fire `callback` after the pointer has
 * been held down for `delay` ms without moving.  Used to programmatically
 * open a context menu on touch devices (where right-click is unavailable).
 */
export function useLongPress(callback: () => void, delay = 500) {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const cancelledRef = useRef(false);

	const start = useCallback(() => {
		cancelledRef.current = false;
		timerRef.current = setTimeout(() => {
			if (!cancelledRef.current) callback();
		}, delay);
	}, [callback, delay]);

	const cancel = useCallback(() => {
		cancelledRef.current = true;
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	return {
		onPointerDown: start,
		onPointerUp: cancel,
		onPointerLeave: cancel,
		onPointerCancel: cancel,
	};
}
