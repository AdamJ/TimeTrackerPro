import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Returns the current on-screen keyboard height in px (0 when hidden).
 * Uses @capacitor/keyboard events on native; always returns 0 on web.
 */
export function useKeyboardHeight(): number {
	const [height, setHeight] = useState(0);

	useEffect(() => {
		if (!Capacitor.isNativePlatform()) return;

		let showHandle: { remove: () => void } | null = null;
		let hideHandle: { remove: () => void } | null = null;

		import("@capacitor/keyboard").then(({ Keyboard }) => {
			Keyboard.addListener("keyboardWillShow", (info) => {
				setHeight(info.keyboardHeight);
			}).then((handle) => { showHandle = handle; });

			Keyboard.addListener("keyboardWillHide", () => {
				setHeight(0);
			}).then((handle) => { hideHandle = handle; });
		});

		return () => {
			showHandle?.remove();
			hideHandle?.remove();
		};
	}, []);

	return height;
}
