import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "com.adamjolicoeur.timetrackerpro",
	appName: "TimeTracker Pro",
	webDir: "dist",

	ios: {
		// Respect safe-area insets (notch, home indicator) automatically
		contentInset: "always",
		// Match the app's background so there is no flash during launch
		backgroundColor: "#ffffff",
		// Prevent the WKWebView itself from scrolling — the app manages scroll internally
		scrollEnabled: false,
		// Restricts navigation to the app bundle; blocks accidental external loads
		limitsNavigationsToAppBoundDomains: true,
	},

	plugins: {
		// Placeholder — native plugin config goes here in Phase 4 (widget bridge)
	},
};

export default config;
