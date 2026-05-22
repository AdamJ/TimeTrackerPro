import React, { useState, useRef } from "react";
import { Task } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Button } from "@/components/ui/button";
import { useHaptics } from "@/hooks/useHaptics";
import { useLongPress } from "@/hooks/useLongPress";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Card, CardContent } from "@/components/ui/card";
import { TaskEditDialog } from "@/components/TaskEditDialog";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { MarkdownDisplay } from "@/components/MarkdownDisplay";
import {
  Edit,
  Trash2,
  ClockPlus,
  ClockFading,
  ClipboardCheck
} from "lucide-react";
import { formatDuration, formatTime } from "@/utils/timeUtil";
import { Badge } from "@radix-ui/themes";

interface TaskItemProps {
  task: Task;
  isActive: boolean;
  currentDuration?: number;
  onDelete: (taskId: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isActive,
  currentDuration = 0,
  onDelete
}) => {
  const { categories } = useTimeTracking();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { lightImpact, mediumImpact } = useHaptics();
  const contextMenuTriggerRef = useRef<HTMLDivElement>(null);

  const longPressHandlers = useLongPress(() => {
    mediumImpact();
    if (contextMenuTriggerRef.current) {
      contextMenuTriggerRef.current.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
      );
    }
  });

  const duration = task.duration || (isActive ? currentDuration : 0);
  const category = categories.find((c) => c.id === task.category);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div ref={contextMenuTriggerRef} {...longPressHandlers}>
      <Card
        className={`transition-all duration-200 ${
          isActive ? "ring-2 ring-blue-500 hover:shadow-md hover:shadow-blue-300 bg-white" : "hover:shadow-md"
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="font-bold text-foreground">
                  {task.title}
                </h3>
                {isActive && (
                  <Badge variant="solid" color="indigo">
                    Active
                  </Badge>
                )}
              </div>

              {task.description && (
                <div className="mb-2">
                  <MarkdownDisplay content={task.description} />
                </div>
              )}

              <div className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="flex items-center space-x-1">
                  <ClockPlus className="w-3 h-3" />
                  <span>Started: {formatTime(task.startTime)}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <ClockFading className="w-3 h-3" />
                  <span>Duration: {formatDuration(duration)}</span>
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-2 mt-3">
                {category && (
                  <Badge
                    radius="full"
                    style={{ backgroundColor: category.color, color: "#fff" }}
                  >
                    {category.name}
                  </Badge>
                )}
                {task.project && (
                  <Badge color="gray" variant="outline" radius="full">
                    {task.project}
                  </Badge>
                )}
                {task.client && (
                  <Badge color="cyan" radius="full">
                    <ClipboardCheck className="w-3 h-3 inline-flex" />
                    {task.client}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex space-x-2 ml-4">
              <Button
                onClick={() => { mediumImpact(); setShowDeleteDialog(true); }}
                size="sm"
                variant="outline"
                aria-label={`Delete task: ${task.title}`}
                className="flex items-center space-x-1 min-h-[44px] min-w-[44px] text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:block">Delete</span>
              </Button>
              <Button
                onClick={() => { lightImpact(); setShowEditDialog(true); }}
                size="sm"
                variant="outline"
                aria-label={`Edit task: ${task.title}`}
                className="flex items-center space-x-1 min-h-[44px] min-w-[44px]"
              >
                <Edit className="w-3 h-3" />
                <span className="hidden sm:block">Edit</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => { lightImpact(); setShowEditDialog(true); }}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Task
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => { mediumImpact(); setShowDeleteDialog(true); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Task
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <TaskEditDialog
        task={task}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
      />

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => {
          onDelete(task.id);
          setShowDeleteDialog(false);
        }}
        taskTitle={task.title}
      />
    </>
  );
};
