// Bridges Electron application-menu clicks (electron/menu.ts) to in-app
// navigation/state. Menu actions that target a specific page (export,
// settings) are stashed here so the destination page can pick them up on
// mount — a plain timeout-based dispatch would race the lazy-loaded route
// chunk and React Router's commit.
export type ElectronMenuAction = "new-task" | "export" | "settings";

let pendingAction: ElectronMenuAction | null = null;

export function setPendingMenuAction(action: ElectronMenuAction): void {
	pendingAction = action;
}

// Returns true (and clears the pending action) only if it matches `action`.
export function consumePendingMenuAction(action: ElectronMenuAction): boolean {
	if (pendingAction !== action) return false;
	pendingAction = null;
	return true;
}
