import { useEffect } from "react";

export function useAppLifecycle(onBackground: () => void) {
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				onBackground();
			}
		};
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
	// onBackground is intentionally excluded — callers should memoize with useCallback
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
}
