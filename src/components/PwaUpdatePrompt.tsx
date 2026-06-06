import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";

export const PwaUpdatePrompt = () => {
	const {
		needRefresh: [needRefresh, setNeedRefresh],
		updateServiceWorker,
	} = useRegisterSW();

	if (!needRefresh) return null;

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 bg-primary px-4 py-2 text-primary-foreground">
			<p className="text-sm">A new version of Timetraked is available.</p>
			<div className="flex shrink-0 items-center gap-3">
				<Button
					size="sm"
					variant="secondary"
					onClick={() => updateServiceWorker(true)}
				>
					Reload
				</Button>
				<button
					onClick={() => setNeedRefresh(false)}
					className="text-sm opacity-70 hover:opacity-100"
					aria-label="Dismiss update notification"
				>
					✕
				</button>
			</div>
		</div>
	);
};
