import { useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

const UNDO_GRACE_PERIOD_MS = 8000;

interface UndoableDeleteOptions {
	title: string;
	description?: string;
}

// Shows a destructive-action toast with an Undo button after the caller has
// already performed the delete. Calls onUndo(item) if Undo is clicked within
// the grace period; a no-op after it expires.
export function useUndoableDelete<T>() {
	const confirmDelete = useCallback((item: T, onUndo: (item: T) => void, options: UndoableDeleteOptions) => {
		let settled = false;
		const timeoutId = setTimeout(() => {
			settled = true;
		}, UNDO_GRACE_PERIOD_MS);

		toast({
			title: options.title,
			description: options.description,
			duration: UNDO_GRACE_PERIOD_MS,
			action: (
				<ToastAction
					altText="Undo"
					onClick={() => {
						if (settled) return;
						settled = true;
						clearTimeout(timeoutId);
						onUndo(item);
					}}
				>
					Undo
				</ToastAction>
			)
		});
	}, []);

	return { confirmDelete };
}
