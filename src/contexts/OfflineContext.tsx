import {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode
} from 'react';
import { useToast } from '@/hooks/use-toast';

export const SYNC_REQUIRED_EVENT = 'timetracker:sync-required';

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

// eslint-disable-next-line react-refresh/only-export-components
export const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  offlineQueue: [],
  addToQueue: () => {},
  processQueue: async () => {}
});

interface OfflineProviderProps {
  children: ReactNode;
}

const OFFLINE_QUEUE_KEY = 'offline_queue';

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
      console.error('Error loading offline queue:', error);
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
      console.error('Error saving offline queue:', error);
    }
  }, [offlineQueue]);

  const processQueue = useCallback(async () => {
    if (offlineQueue.length === 0) return;

    // Signal the data layer to push all current state to the backend.
    // TimeTrackingContext listens for this event and calls forceSyncToDatabase.
    window.dispatchEvent(new CustomEvent(SYNC_REQUIRED_EVENT, {
      detail: { queueLength: offlineQueue.length }
    }));

    // Clear the queue — sync outcome is handled by TimeTrackingContext
    setOfflineQueue([]);
  }, [offlineQueue]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Back Online',
        description: 'Your connection has been restored. Syncing data...',
        duration: 3000
      });
      processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're Offline",
        description:
          "Changes will be saved locally and synced when you're back online.",
        variant: 'destructive',
        duration: 5000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processQueue, toast]);

  const addToQueue = useCallback(
    (action: string, data: unknown) => {
      const queueItem: OfflineAction = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        action,
        data
      };

      setOfflineQueue(prev => [...prev, queueItem]);

      toast({
        title: 'Action Queued',
        description: "This action will be synced when you're back online.",
        duration: 3000
      });
    },
    [toast]
  );

  return (
    <OfflineContext.Provider
      value={{ isOnline, offlineQueue, addToQueue, processQueue }}
    >
      {children}
    </OfflineContext.Provider>
  );
};
