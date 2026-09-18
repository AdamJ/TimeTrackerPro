import { useState, useEffect, memo, useCallback } from 'react';
import { CloudOff, RefreshCw, Save, AlertCircle, DatabaseZap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SidebarMenuButton, SidebarMenuItem } from './ui/sidebar';

interface SyncStatusProps {
  isAuthenticated: boolean;
  lastSyncTime?: Date | null;
  isSyncing?: boolean;
  onRefresh?: () => void;
  hasUnsavedChanges?: boolean;
}

export const SyncStatus = memo(function SyncStatus({
  isAuthenticated,
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
      <SidebarMenuItem>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton
                size="default"
                className="w-full"
                aria-label="Offline">
                <CloudOff aria-hidden="true" className="h-4 w-4 text-violet-9" />
                Local Storage Only
              </SidebarMenuButton>
            </TooltipTrigger>
            <TooltipContent>
              Data saved to local storage only
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem
      role="status"
      aria-live="polite"
      className={`transition-opacity duration-300 ${isSyncing || hasUnsavedChanges || showStatus ? 'opacity-100' : 'opacity-70'
        }`}
    >
      <SidebarMenuButton
          onClick={handleRefresh}
          disabled={isSyncing}
          className="hover:cursor-pointer"
          aria-label={hasUnsavedChanges ? "Save changes" : "Changes saved"}
        >
          {isSyncing ? (
            <RefreshCw aria-hidden="true" className="animate-spin text-blue-9" />
          ) : hasUnsavedChanges ? (
            <>
              <AlertCircle aria-hidden="true" className="text-orange-9" />
            </>
          ) : (
            <>
                <Save aria-hidden="true" className="text-green-9" />
                Save changes
            </>
          )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});
