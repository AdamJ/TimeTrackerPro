import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export const PwaUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around gap-4 bg-primary/90 px-4 py-2 text-primary-foreground">
      <div className="flex items-center gap-3">
      <p className="text-sm font-bold">A new version of Timetraked is available.</p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => updateServiceWorker(true)}
          aria-label="Reload"
        >
          Reload
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss update notification"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
};
