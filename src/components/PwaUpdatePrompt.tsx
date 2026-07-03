import { useRegisterSW } from "virtual:pwa-register/react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";

export const PwaUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around gap-4 bg-primary/90 px-4 py-2 text-primary-foreground"
        >
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};
