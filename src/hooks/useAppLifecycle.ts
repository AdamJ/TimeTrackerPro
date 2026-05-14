import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Calls onBackground when the app is suspended (native) or hidden (web).
 * On iOS/Capacitor, uses @capacitor/app's appStateChange which fires at the
 * Swift layer before WKWebView freezes — more reliable than visibilitychange.
 * Falls back to visibilitychange on web.
 */
export function useAppLifecycle(onBackground: () => void) {
	useEffect(() => {
		if (Capacitor.isNativePlatform()) {
			// Dynamic import avoids a hard dependency when running as a PWA
			// (the plugin is present but the runtime only activates on native)
			import("@capacitor/app").then(({ App }) => {
				const listenerPromise = App.addListener("appStateChange", ({ isActive }) => {
					if (!isActive) {
						onBackground();
					}
				});
				return () => {
					listenerPromise.then((handle) => handle.remove());
				};
			});
		} else {
			const handleVisibilityChange = () => {
				if (document.visibilityState === "hidden") {
					onBackground();
				}
			};
			document.addEventListener("visibilitychange", handleVisibilityChange);
			return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
		}
	// onBackground is intentionally excluded — callers should memoize with useCallback
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
}
