import React, { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Globe, HardDrive, RotateCcw } from "lucide-react";
import { useDataRecovery, RecoveryBackup } from "@/hooks/useDataRecovery";
import { BackupSummary } from "@/services/localStorageService/recovery";
import { toast } from "@/hooks/use-toast";

interface DataRecoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUMMARY_LABELS: Record<keyof BackupSummary, string> = {
  currentDayTasks: "Current day tasks",
  archivedDays: "Archived days",
  projects: "Projects",
  categories: "Categories",
  todos: "To-dos",
  plannedTasks: "Planned tasks",
  clients: "Clients"
};

const SUMMARY_ORDER: (keyof BackupSummary)[] = [
  "archivedDays",
  "currentDayTasks",
  "projects",
  "categories",
  "todos",
  "plannedTasks",
  "clients"
];

export const DataRecoveryDialog: React.FC<DataRecoveryDialogProps> = ({ isOpen, onClose }) => {
  const { listBackups, previewBackup, restoreBackup, currentStateSummary } = useDataRecovery();
  const [backups, setBackups] = useState<RecoveryBackup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<RecoveryBackup | null>(null);
  const [preview, setPreview] = useState<BackupSummary | null>(null);
  const [currentSummary, setCurrentSummary] = useState<BackupSummary | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelected(null);
    setPreview(null);
    setLoading(true);
    listBackups()
      .then(setBackups)
      .finally(() => setLoading(false));
  }, [isOpen, listBackups]);

  const handleSelect = useCallback(
    async (backup: RecoveryBackup) => {
      setSelected(backup);
      setPreview(null);
      setCurrentSummary(currentStateSummary());
      setPreview(await previewBackup(backup));
    },
    [previewBackup, currentStateSummary]
  );

  const handleRestore = useCallback(async () => {
    if (!selected) return;
    setRestoring(true);
    const ok = await restoreBackup(selected);
    setRestoring(false);
    setShowConfirm(false);

    if (!ok) {
      toast({
        variant: "destructive",
        title: "Restore failed",
        description: "Could not restore this backup. See the console for details."
      });
      return;
    }

    toast({ title: "Backup restored", description: "Reloading with the restored data..." });
    window.location.reload();
  }, [selected, restoreBackup]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Data recovery</DialogTitle>
            <DialogDescription>
              Restore a backup that was saved automatically before a schema upgrade or app quit.
              Restoring overwrites your current local data and reloads the app.
            </DialogDescription>
          </DialogHeader>

          {loading && <p className="text-sm text-muted-foreground">Looking for backups…</p>}

          {!loading && backups.length === 0 && (
            <p className="text-sm text-muted-foreground">No backups found yet.</p>
          )}

          {!loading && backups.length > 0 && (
            <ScrollArea className="max-h-64">
              <div className="flex flex-col gap-2 pr-2">
                {backups.map((backup) => (
                  <Item
                    key={backup.id}
                    asChild
                    variant={selected?.id === backup.id ? "muted" : "outline"}
                    className="cursor-pointer shadow-none"
                  >
                    <button type="button" onClick={() => handleSelect(backup)}>
                      <ItemMedia>
                        {backup.source === "desktop" ? (
                          <HardDrive className="w-4 h-4" />
                        ) : (
                          <Globe className="w-4 h-4" />
                        )}
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{new Date(backup.timestamp).toLocaleString()}</ItemTitle>
                        <ItemDescription>
                          {backup.source === "desktop" ? "Desktop disk backup" : "Browser storage backup"}
                        </ItemDescription>
                      </ItemContent>
                    </button>
                  </Item>
                ))}
              </div>
            </ScrollArea>
          )}

          {selected && (
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium mb-2">Preview</p>
              {preview === null ? (
                <p className="text-sm text-muted-foreground">Loading preview…</p>
              ) : (
                <div className="grid gap-1">
                  {SUMMARY_ORDER.filter((field) => preview[field] !== undefined).map((field) => (
                    <div key={field} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{SUMMARY_LABELS[field]}</span>
                      <span>
                        {currentSummary?.[field] ?? 0} <span className="text-muted-foreground">→</span>{" "}
                        <Badge variant="outline">{preview[field]}</Badge>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button disabled={!selected || preview === null} onClick={() => setShowConfirm(true)}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Restore
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces your current local data with the selected backup and reloads the app.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={restoring} onClick={handleRestore}>
              {restoring ? "Restoring…" : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
