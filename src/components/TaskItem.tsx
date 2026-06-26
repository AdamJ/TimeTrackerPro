import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { Task } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Button } from "@/components/ui/button";
import { useLongPress } from "@/hooks/useLongPress";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Badge } from "@/components/ui/badge";

const MotionCard = motion.create(Card);

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
  const contextMenuTriggerRef = useRef<HTMLDivElement>(null);

  const longPressHandlers = useLongPress(() => {
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
          <div
            ref={contextMenuTriggerRef}
            tabIndex={0}
            className="focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            {...longPressHandlers}
          >
      <MotionCard
        variants={{ active: { scale: 1.005 }, inactive: { scale: 1 } }}
        animate={isActive ? "active" : "inactive"}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={`transition-shadow duration-200 ${
          isActive ? "ring-2 ring-blue-8 shadow-md shadow-blue-4 bg-white" : "hover:shadow-md"
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
                  <Badge variant="outline" className="bg-indigo-9 text-white border-transparent">
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
                <span className="sr-only" aria-live="polite" aria-atomic="true">
                  {isActive ? "Timer running" : "Timer stopped"}
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-2 mt-3">
                {category && (
                  <Badge
                    variant="outline"
                    className="border-transparent"
                    style={{ backgroundColor: category.color, color: "#fff" }}
                  >
                    {category.name}
                  </Badge>
                )}
                {task.project && (
                  <Badge variant="outline" className="border-mauve-7 text-mauve-11">
                    {task.project}
                  </Badge>
                )}
                {task.client && (
                  <Badge variant="outline" className="bg-cyan-3 text-cyan-11 border-cyan-6">
                    <ClipboardCheck className="w-3 h-3 inline-flex" />
                    {task.client}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex space-x-2 ml-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    size="sm"
                    variant="outline"
                    aria-label={`Delete task: ${task.title}`}
                    className="flex items-center space-x-1 min-h-[44px] min-w-[44px] text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span className="hidden sm:block">Delete</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete task</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setShowEditDialog(true)}
                    size="sm"
                    variant="outline"
                    aria-label={`Edit task: ${task.title}`}
                    className="flex items-center space-x-1 min-h-[44px] min-w-[44px]"
                  >
                    <Edit className="w-3 h-3" />
                    <span className="hidden sm:block">Edit</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit task</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </MotionCard>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => setShowEditDialog(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Task
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => setShowDeleteDialog(true)}
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
