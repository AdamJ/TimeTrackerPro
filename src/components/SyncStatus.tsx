import { useState, useEffect, memo, useCallback } from 'react';
import { Cloud, CloudOff, RefreshCw, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SyncStatusProps {
  isAuthenticated: boolean;
  lastSyncTime?: Date | null;
  isSyncing?: boolean;
  onRefresh?: () => void;
  hasUnsavedChanges?: boolean;
}

export const SyncStatus = memo(function SyncStatus({
  isAuthenticated,
  lastSyncTime,
  isSyncing = false,
  onRefresh,
  hasUnsavedChanges = false
}: SyncStatusProps) {
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    if (isSyncing) {
      setShowStatus(true);
      const timer = setTimeout(() => setShowStatus(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing]);

  const handleRefresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  if (!isAuthenticated) {
    return (
      <div className="flex gap-2 w-full">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="default"
                className="w-full"
                aria-label="Offline">
                <CloudOff className="h-4 w-4 text-violet-900" />
                Local Storage Only
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Data saved to local storage only
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-2 w-full transition-opacity duration-300 ${isSyncing || hasUnsavedChanges || showStatus ? 'opacity-100' : 'opacity-70'
        }`}
    >
      <Button
        variant="outline"
        size="default"
        onClick={handleRefresh}
        disabled={isSyncing}
        className="w-full hover:cursor-pointer"
        aria-label={hasUnsavedChanges ? "Save changes" : "Changes saved"}
      >
        {isSyncing ? (
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
        ) : hasUnsavedChanges ? (
          <>
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <span>Save</span>
          </>
        ) : (
          <>
            <Save className="h-4 w-4 text-green-600" />
            <span>Save</span>
          </>
        )}
      </Button>
    </div>
  );
});
