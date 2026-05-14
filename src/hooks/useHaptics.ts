import { Capacitor } from "@capacitor/core";

let hapticsModule: typeof import("@capacitor/haptics") | null = null;

async function getHaptics() {
	if (!Capacitor.isNativePlatform()) return null;
	if (!hapticsModule) {
		hapticsModule = await import("@capacitor/haptics");
	}
	return hapticsModule;
}

export function useHaptics() {
	const lightImpact = () => {
		getHaptics().then((h) => {
			if (h) h.Haptics.impact({ style: h.ImpactStyle.Light });
		});
	};

	const mediumImpact = () => {
		getHaptics().then((h) => {
			if (h) h.Haptics.impact({ style: h.ImpactStyle.Medium });
		});
	};

	const heavyImpact = () => {
		getHaptics().then((h) => {
			if (h) h.Haptics.impact({ style: h.ImpactStyle.Heavy });
		});
	};

	const successNotify = () => {
		getHaptics().then((h) => {
			if (h) h.Haptics.notification({ type: h.NotificationType.Success });
		});
	};

	const errorNotify = () => {
		getHaptics().then((h) => {
			if (h) h.Haptics.notification({ type: h.NotificationType.Error });
		});
	};

	const warnNotify = () => {
		getHaptics().then((h) => {
			if (h) h.Haptics.notification({ type: h.NotificationType.Warning });
		});
	};

	return { lightImpact, mediumImpact, heavyImpact, successNotify, errorNotify, warnNotify };
}
