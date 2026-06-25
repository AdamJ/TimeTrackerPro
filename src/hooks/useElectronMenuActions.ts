import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setPendingMenuAction, type ElectronMenuAction } from "@/lib/electronMenuActions";

const ROUTE_BY_ACTION: Record<ElectronMenuAction, string> = {
	"new-task": "/",
	export: "/settings",
	settings: "/settings",
};

// No-ops entirely when window.electronAPI is absent (web/PWA builds).
export function useElectronMenuActions(): void {
	const navigate = useNavigate();

	useEffect(() => {
		if (!window.electronAPI) return;

		return window.electronAPI.onMenuAction((action) => {
			if (action !== "new-task" && action !== "export" && action !== "settings") return;
			setPendingMenuAction(action);
			navigate(ROUTE_BY_ACTION[action]);
		});
	}, [navigate]);
}
