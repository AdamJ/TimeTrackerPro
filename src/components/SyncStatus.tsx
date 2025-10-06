import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, Tooltip } from "radix-ui";
import { Cross2Icon } from "@radix-ui/react-icons";

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
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button className="inline-flex size-[35px] items-center justify-center rounded-full bg-white text-violet11 shadow-[0_2px_10px] shadow-violet-200 focus:shadow-[0_0_0_2px]">
              <CloudOff className="h-4 w-4 text-violet-900" />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="select-none rounded bg-white px-[15px] py-2.5 text-[15px] leading-none text-violet11 shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity] data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade"
              sideOffset={5}
            >
              Data saved to local storage only
              <Tooltip.Arrow className="fill-white" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
      {/* <button
          className="transition-all duration-200 flex items-center space-x-2 px-4 rounded-md h-10 bg-violet-50 border border-violet-200 hover:bg-accent hover:accent-foreground hover:border-input"
          aria-label="Data is syncing"
          disabled
        >
          <CloudOff className="h-4 w-4 text-violet-900" /> */}
          {/* <span className="hidden md:block text-blue-600">Syncing...</span> */}
        {/* </button> */}

        {/* <span className="hidden sm:block">Local storage only</span> */}
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
          <button
            className="transition-all duration-200 flex items-center space-x-2 px-4 rounded-md h-10 bg-white border border-gray-200 hover:bg-accent hover:accent-foreground hover:border-input"
            aria-label="Data is syncing"
            disabled
          >
            <RefreshCw className="h-4 w-4 animate-spin" />
            {/* <span className="hidden md:block text-blue-600">Syncing...</span> */}
          </button>
        </>
      ) : (
        <>
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                className="transition-all duration-200 flex items-center space-x-2 px-4 rounded-md h-10 bg-white border border-gray-200 hover:bg-accent hover:accent-foreground hover:border-input"
                aria-label="Data is synced"
              >
                <Cloud className="h-4 w-4 text-green-600" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="w-[260px] rounded bg-white p-5 shadow-[0_10px_38px_-10px_hsla(206,22%,7%,.35),0_10px_20px_-15px_hsla(206,22%,7%,.2)] will-change-[transform,opacity] focus:shadow-[0_10px_38px_-10px_hsla(206,22%,7%,.35),0_10px_20px_-15px_hsla(206,22%,7%,.2),0_0_0_2px_theme(colors.violet7)] data-[state=open]:data-[side=bottom]:animate-slideUpAndFade data-[state=open]:data-[side=left]:animate-slideRightAndFade data-[state=open]:data-[side=right]:animate-slideLeftAndFade data-[state=open]:data-[side=top]:animate-slideDownAndFade"
                sideOffset={5}
              >
                <div className="flex flex-col gap-2.5">
                  <span className="hidden md:block text-green-600">
                    Last synced with database at {' '}
                    {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'now'}
                  </span>
                  {onRefresh && (
                    <Button
                      variant="outline"
                      onClick={onRefresh}
                      disabled={isSyncing}
                      className="transition-all duration-200 flex items-center space-x-2 px-4 rounded-md h-10 bg-white border border-gray-200 hover:bg-accent hover:accent-foreground hover:border-input"
                    >
                      Sync <RefreshCw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Popover.Close
                  className="absolute right-[5px] top-[5px] inline-flex size-[25px] cursor-default items-center justify-center rounded-full text-violet11 outline-none hover:bg-violet4 focus:shadow-[0_0_0_2px] focus:shadow-violet7"
                  aria-label="Close"
                >
                  <Cross2Icon />
                </Popover.Close>
                <Popover.Arrow className="fill-white" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </>
      )}
    </div>
  );
}
