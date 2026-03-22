import {
	createContext,
	useState,
	useEffect,
	ReactNode
} from 'react';
import { useToast } from '@/hooks/use-toast';

interface OfflineContextType {
	isOnline: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const OfflineContext = createContext<OfflineContextType>({
	isOnline: true,
});

interface OfflineProviderProps {
	children: ReactNode;
}

export const OfflineProvider = ({ children }: OfflineProviderProps) => {
	const [isOnline, setIsOnline] = useState(navigator.onLine);
	const { toast } = useToast();

	useEffect(() => {
		const handleOnline = () => {
			setIsOnline(true);
			toast({
				title: "Back Online",
				description: "Your connection has been restored.",
				duration: 3000
			});
		};

		const handleOffline = () => {
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
	}, [toast]);

	return (
		<OfflineContext.Provider value={{ isOnline }}>
			{children}
		</OfflineContext.Provider>
	);
};
