import { useState, useMemo, useCallback } from "react";
import { PageLayout } from "@/components/PageLayout";
import { KanbanBoard } from "@/components/KanbanBoard";
import { PlannedTaskDialog } from "@/components/PlannedTaskDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";

const TaskList = () => {
  const [showNewTaskSheet, setShowNewTaskSheet] = useState(false);
  const { plannedTasks } = useTimeTracking();
  const pageBadge = useMemo(
    () => <Badge variant="outline">{plannedTasks.length}</Badge>,
    [plannedTasks.length]
  );
  const openNewTaskSheet = useCallback(() => setShowNewTaskSheet(true), []);
  const pageActions = useMemo(
    () => (
      <Button onClick={openNewTaskSheet} size="sm">
        <Plus className="w-4 h-4 mr-1" />
        New Task
      </Button>
    ),
    [openNewTaskSheet]
  );
  return (
    <PageLayout
      title="Tasks"
      badge={pageBadge}
      actions={pageActions}
    >
      <div className="max-w-7xl mx-auto pt-4 pb-6 px-4 md:p-6">
        <KanbanBoard />
      </div>
      <Sheet open={showNewTaskSheet} onOpenChange={setShowNewTaskSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Task</SheetTitle>
          </SheetHeader>
          <PlannedTaskDialog
            isOpen={showNewTaskSheet}
            onClose={() => setShowNewTaskSheet(false)}
          />
        </SheetContent>
      </Sheet>
    </PageLayout>
  );
};

export default TaskList;
