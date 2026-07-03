import { useEffect, useState, memo } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { RefreshCw, X } from 'lucide-react';

export const UpdateNotification = memo(function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [showOfflineReady, setShowOfflineReady] = useState(true);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for updates every hour
      if (registration) {
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        ); // 1 hour
      }
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    }
  });

  useEffect(() => {
    if (needRefresh) {
      setShowUpdate(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
    setShowUpdate(false);
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    setNeedRefresh(false);
  };

  if (offlineReady && !needRefresh && showOfflineReady) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-20 md:bottom-4 left-4 z-50 animate-in slide-in-from-bottom-4"
      >
        <Card className="shadow-lg">
          <CardContent className="p-4 pr-10 relative">
            <button
              onClick={() => setShowOfflineReady(false)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-accent transition-colors"
              aria-label="Dismiss offline ready notification"
            >
              <X aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            </button>
            <p className="text-sm text-green-11 font-medium">
              ✓ App is ready to work offline
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!showUpdate || !needRefresh) {
    return null;
  }

  return (
    <Card
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 w-80 shadow-lg z-50 animate-in slide-in-from-top-4"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-mauve-3 transition-colors"
        aria-label="Dismiss update notification"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
      <CardHeader>
        <CardTitle className="text-lg">Update Available</CardTitle>
        <CardDescription>
          A new version of Timetraked is available. Update now to get the latest
          features and improvements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleUpdate} className="w-full">
          <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
          Update Now
        </Button>
      </CardContent>
    </Card>
  );
});
