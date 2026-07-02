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

const ACTION_EVENT = "timetracker:menu-action";

// Complements consumePendingMenuAction for callers that already know the
// destination page is mounted (e.g. a keyboard shortcut fired while already
// on the Dashboard) — consumePendingMenuAction only fires for a page that's
// mounting *because of* the navigation the action triggered, so it never
// reaches a listener that was already there before the event was sent.
export function notifyMenuAction(action: ElectronMenuAction): void {
	window.dispatchEvent(new CustomEvent<ElectronMenuAction>(ACTION_EVENT, { detail: action }));
}

export function addMenuActionListener(action: ElectronMenuAction, listener: () => void): () => void {
	const handler = (event: Event) => {
		if ((event as CustomEvent<ElectronMenuAction>).detail === action) listener();
	};
	window.addEventListener(ACTION_EVENT, handler);
	return () => window.removeEventListener(ACTION_EVENT, handler);
}
