import React, { useState } from "react";
import { PlannedTask, PlannedTaskStatus } from "@/contexts/TimeTrackingContext";
import { PlannedTaskCard } from "@/components/PlannedTaskCard";
import { PlannedTaskDialog } from "@/components/PlannedTaskDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@radix-ui/themes";
import { Plus } from "lucide-react";

interface KanbanColumnProps {
  status: PlannedTaskStatus;
  title: string;
  tasks: PlannedTask[];
  isDayStarted: boolean;
  isDayStale: boolean;
}

const COLUMN_BADGE_COLORS: Record<
  PlannedTaskStatus,
  React.ComponentProps<typeof Badge>["color"]
> = {
  todo: undefined,
  in_progress: "indigo",
  done: "green",
  blocked: "red",
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  title,
  tasks,
  isDayStarted,
  isDayStale,
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <>
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="flex items-center justify-between text-sm font-semibold">
            <span className="text-foreground">{title}</span>
            <Badge
              color={COLUMN_BADGE_COLORS[status]}
              variant="soft"
              radius="full"
              size="1"
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

          {tasks.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No tasks
            </p>
          )}

          {status === "todo" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="w-full text-muted-foreground hover:text-foreground border border-dashed border-border"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add task
            </Button>
          )}
        </CardContent>
      </Card>

      <PlannedTaskDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        defaultStatus={status}
      />
    </>
  );
};
