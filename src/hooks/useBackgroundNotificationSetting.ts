import { useCallback, useEffect, useState } from "react";

export const BACKGROUND_NOTIFICATIONS_KEY = "timetracker_background_notifications_enabled";
const SETTING_CHANGED_EVENT = "timetracker:background-notifications-changed";

function readSetting(): boolean {
	try {
		return localStorage.getItem(BACKGROUND_NOTIFICATIONS_KEY) === "true";
	} catch {
		return false;
	}
}

// Local-storage-backed toggle shared between the Settings page and the
// background notifier — a same-tab custom event keeps both in sync since
// the native "storage" event never fires for writes made in the same tab.
export function useBackgroundNotificationSetting() {
	const [enabled, setEnabledState] = useState(readSetting);

	useEffect(() => {
		const sync = () => setEnabledState(readSetting());
		window.addEventListener("storage", sync);
		window.addEventListener(SETTING_CHANGED_EVENT, sync);
		return () => {
			window.removeEventListener("storage", sync);
			window.removeEventListener(SETTING_CHANGED_EVENT, sync);
		};
	}, []);

	const setEnabled = useCallback((value: boolean) => {
		try {
			localStorage.setItem(BACKGROUND_NOTIFICATIONS_KEY, value ? "true" : "false");
		} catch {
			// localStorage unavailable; setting won't persist across reloads
		}
		setEnabledState(value);
		window.dispatchEvent(new Event(SETTING_CHANGED_EVENT));
	}, []);

	return [enabled, setEnabled] as const;
}
