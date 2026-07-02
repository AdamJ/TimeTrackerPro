import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setPendingMenuAction, type ElectronMenuAction } from "@/lib/electronMenuActions";

const ROUTE_BY_ACTION: Record<ElectronMenuAction, string> = {
	"new-task": "/",
	export: "/settings",
	settings: "/settings",
};

interface UseElectronMenuActionsOptions {
	onSave?: () => void;
	onOpenCommandPalette?: () => void;
	onOpenShortcutsHelp?: () => void;
}

// No-ops entirely when window.electronAPI is absent (web/PWA builds). "save",
// "command-palette", and "shortcuts-help" aren't page-specific, so they're
// handled directly via callback rather than the navigate + pending-action
// pattern used by new-task/export/settings.
export function useElectronMenuActions(options: UseElectronMenuActionsOptions = {}): void {
	const navigate = useNavigate();
	const { onSave, onOpenCommandPalette, onOpenShortcutsHelp } = options;

	useEffect(() => {
		if (!window.electronAPI) return;

		return window.electronAPI.onMenuAction((action) => {
			if (action === "save") {
				onSave?.();
				return;
			}
			if (action === "command-palette") {
				onOpenCommandPalette?.();
				return;
			}
			if (action === "shortcuts-help") {
				onOpenShortcutsHelp?.();
				return;
			}
			if (action !== "new-task" && action !== "export" && action !== "settings") return;
			setPendingMenuAction(action);
			navigate(ROUTE_BY_ACTION[action]);
		});
	}, [navigate, onSave, onOpenCommandPalette, onOpenShortcutsHelp]);
}
