import React, { useState } from "react";
import { PlannedTask, PlannedTaskStatus } from "@/contexts/TimeTrackingContext";
import { PlannedTaskCard } from "@/components/PlannedTaskCard";
import { PlannedTaskDialog } from "@/components/PlannedTaskDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface KanbanColumnProps {
  status: PlannedTaskStatus;
  title: string;
  tasks: PlannedTask[];
  isDayStarted: boolean;
  isDayStale: boolean;
}

const COLUMN_BADGE_COLORS: Record<PlannedTaskStatus, string> = {
  todo: "bg-brown-3 text-brown-11 border-brown-6",
  in_progress: "bg-blue-3 text-blue-11 border-blue-6",
  done: "bg-green-3 text-green-11 border-green-6",
  blocked: "bg-red-3 text-red-11 border-red-6",
};

const COLUMN_BG_COLOR: Record<PlannedTaskStatus, string> = {
  todo: "bg-brown-2",
  in_progress: "bg-blue-2",
  done: "bg-green-2",
  blocked: "bg-red-2",
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  title,
  tasks,
  isDayStarted,
  isDayStale,
}) => {
  const [showAddSheet, setShowAddSheet] = useState(false);

  return (
    <>
      <Card className={`flex flex-col h-full ${COLUMN_BG_COLOR[status]}`}>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="flex items-center justify-between text-sm font-semibold">
            <span className="text-foreground">{title}</span>
            <Badge
              variant="outline"
              aria-label={`${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`}
              className={COLUMN_BADGE_COLORS[status]}
            >
              {tasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 space-y-2 px-3 pb-3 overflow-y-auto">
          {tasks.map((task) => (
            <PlannedTaskCard
              key={task.id}
              task={task}
              isDayStarted={isDayStarted}
              isDayStale={isDayStale}
            />
          ))}

          {status === "todo" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddSheet(true)}
              className="w-full text-muted-foreground hover:text-foreground border border-dashed border-border"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add task
            </Button>
          )}

          {tasks.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No tasks
            </p>
          )}
        </CardContent>
      </Card>

      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Task</SheetTitle>
          </SheetHeader>
          <PlannedTaskDialog
            isOpen={showAddSheet}
            onClose={() => setShowAddSheet(false)}
            defaultStatus={status}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};
