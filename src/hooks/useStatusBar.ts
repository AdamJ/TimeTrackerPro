import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Syncs the iOS status bar text colour with the app's light/dark theme.
 * Style.Dark = white text (for dark backgrounds).
 * Style.Light = black text (for light backgrounds).
 * No-op on web.
 */
export function useStatusBar(isDark: boolean) {
	useEffect(() => {
		if (!Capacitor.isNativePlatform()) return;

		import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
			StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
		});
	}, [isDark]);
}
