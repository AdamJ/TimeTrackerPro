export function useHaptics() {
	const vibrate = (pattern: number | number[]) => {
		navigator.vibrate?.(pattern);
	};
	return {
		lightImpact: () => vibrate(10),
		mediumImpact: () => vibrate(20),
		heavyImpact: () => vibrate(50),
		successNotify: () => vibrate([10, 50, 10]),
		errorNotify: () => vibrate([50, 50, 50]),
		warnNotify: () => vibrate(30),
	};
}
