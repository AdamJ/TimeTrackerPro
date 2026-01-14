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
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="inline-flex size-[35px] items-center justify-center rounded-full bg-white text-violet11 shadow-[0_2px_10px] shadow-violet-200 focus:shadow-[0_0_0_2px] p-0">
                <CloudOff className="h-4 w-4 text-violet-900" />
              </button>
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
      className={`flex items-center gap-2 transition-opacity duration-300 ${isSyncing || hasUnsavedChanges || showStatus ? 'opacity-100' : 'opacity-70'
        }`}
    >
      <Button
        variant="outline"
        onClick={handleRefresh}
        disabled={isSyncing}
        className="flex items-center space-x-2"
        aria-label={hasUnsavedChanges ? "Save changes" : "Changes saved"}
      >
        {isSyncing ? (
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
        ) : hasUnsavedChanges ? (
          <>
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <span className="hidden lg:block">Save</span>
          </>
        ) : (
          <>
            <Save className="h-4 w-4 text-green-600" />
            <span className="hidden lg:block">Save</span>
          </>
        )}
      </Button>
    </div>
  );
});
