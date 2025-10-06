import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SyncStatusProps {
  isAuthenticated: boolean;
  lastSyncTime?: Date | null;
  isSyncing?: boolean;
  onRefresh?: () => void;
}

export function SyncStatus({
  isAuthenticated,
  lastSyncTime,
  isSyncing,
  onRefresh
}: SyncStatusProps) {
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    if (isSyncing) {
      setShowStatus(true);
      const timer = setTimeout(() => setShowStatus(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <CloudOff className="h-4 w-4" />
        <span className="hidden sm:block">Local storage only</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 text-sm transition-opacity duration-300 ${
        showStatus ? 'opacity-100' : 'opacity-50'
      }`}
    >
      {isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="hidden md:block text-blue-600">Syncing...</span>
        </>
      ) : (
        <>
          <Cloud className="h-4 w-4 text-green-600" />
          <span className="hidden md:block text-green-600">
            Synced{' '}
            {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'now'}
          </span>
          {onRefresh && (
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={isSyncing}
              className="transition-all duration-200 flex items-center space-x-2 px-4 rounded-md h-10 bg-white border border-gray-200 hover:bg-accent hover:accent-foreground hover:border-input"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
