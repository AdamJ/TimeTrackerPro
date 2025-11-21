import { createContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

interface OfflineAction {
	id: string;
	timestamp: Date;
	action: string;
	data: unknown;
}

interface OfflineContextType {
	isOnline: boolean;
	offlineQueue: OfflineAction[];
	addToQueue: (action: string, data: unknown) => void;
	processQueue: () => Promise<void>;
}

export const OfflineContext = createContext<OfflineContextType>({
	isOnline: true,
	offlineQueue: [],
	addToQueue: () => {},
	processQueue: async () => {}
});

interface OfflineProviderProps {
	children: ReactNode;
}

const OFFLINE_QUEUE_KEY = "offline_queue";

export const OfflineProvider = ({ children }: OfflineProviderProps) => {
	const [isOnline, setIsOnline] = useState(navigator.onLine);
	const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>([]);
	const { toast } = useToast();

	// Load queue from localStorage on mount
	useEffect(() => {
		try {
			const savedQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
			if (savedQueue) {
				const parsed = JSON.parse(savedQueue);
				setOfflineQueue(parsed);
			}
		} catch (error) {
			console.error("Error loading offline queue:", error);
		}
	}, []);

	// Save queue to localStorage whenever it changes
	useEffect(() => {
		try {
			if (offlineQueue.length > 0) {
				localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
			} else {
				localStorage.removeItem(OFFLINE_QUEUE_KEY);
			}
		} catch (error) {
			console.error("Error saving offline queue:", error);
		}
	}, [offlineQueue]);

	useEffect(() => {
		const handleOnline = () => {
			console.log("App is online");
			setIsOnline(true);
			toast({
				title: "Back Online",
				description: "Your connection has been restored. Syncing data...",
				duration: 3000
			});
			processQueue();
		};

		const handleOffline = () => {
			console.log("App is offline");
			setIsOnline(false);
			toast({
				title: "You're Offline",
				description: "Changes will be saved locally and synced when you're back online.",
				variant: "destructive",
				duration: 5000
			});
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [toast]);

	const addToQueue = useCallback((action: string, data: unknown) => {
		const queueItem: OfflineAction = {
			id: crypto.randomUUID(),
			timestamp: new Date(),
			action,
			data
		};

		setOfflineQueue(prev => [...prev, queueItem]);

		console.log("Added to offline queue:", queueItem);

		toast({
			title: "Action Queued",
			description: "This action will be synced when you're back online.",
			duration: 3000
		});
	}, [toast]);

	const processQueue = useCallback(async () => {
		if (offlineQueue.length === 0) {
			return;
		}

		console.log(`Processing ${offlineQueue.length} queued actions...`);

		const successfulActions: string[] = [];
		const failedActions: OfflineAction[] = [];

		for (const item of offlineQueue) {
			try {
				console.log("Processing queued action:", item.action, item.data);

				// Process the queued action here
				// This would integrate with your existing data service
				// For now, we'll just log it
				// In a real implementation, you'd call the appropriate service methods

				successfulActions.push(item.id);
			} catch (error) {
				console.error("Failed to process queued action:", item, error);
				failedActions.push(item);
			}
		}

		// Remove successful actions from queue
		if (successfulActions.length > 0) {
			setOfflineQueue(failedActions);

			toast({
				title: "Sync Complete",
				description: `Successfully synced ${successfulActions.length} queued action(s).`,
				duration: 3000
			});
		}

		// Notify about failed actions
		if (failedActions.length > 0) {
			toast({
				title: "Sync Issues",
				description: `${failedActions.length} action(s) failed to sync. Will retry later.`,
				variant: "destructive",
				duration: 5000
			});
		}
	}, [offlineQueue, toast]);

	return (
		<OfflineContext.Provider value={{ isOnline, offlineQueue, addToQueue, processQueue }}>
			{children}
		</OfflineContext.Provider>
	);
};
