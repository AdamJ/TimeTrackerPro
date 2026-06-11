import React, { useState } from "react";
import { PlannedTaskStatus } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { KanbanColumn } from "@/components/KanbanColumn";
import { PlannedTaskDialog } from "@/components/PlannedTaskDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const COLUMNS: { status: PlannedTaskStatus; title: string }[] = [
  { status: "todo", title: "To Do" },
  { status: "in_progress", title: "In Progress" },
  { status: "blocked", title: "Blocked" },
  { status: "done", title: "Done" },
];

export const KanbanBoard: React.FC = () => {
  const { plannedTasks, isDayStarted, isDayStale } = useTimeTracking();
  const [showNewTaskSheet, setShowNewTaskSheet] = useState(false);

  const tasksByStatus = (status: PlannedTaskStatus) =>
    [...plannedTasks]
      .filter((t) => t.status === status)
      .sort(
        (a, b) =>
          a.priority - b.priority || a.createdAt.localeCompare(b.createdAt),
      );

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowNewTaskSheet(true)}>
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(({ status, title }) => (
          <KanbanColumn
            key={status}
            status={status}
            title={title}
            tasks={tasksByStatus(status)}
            isDayStarted={isDayStarted}
            isDayStale={isDayStale}
          />
        ))}
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
    </>
  );
};
