import React, { useRef, useState } from "react";
import { PlannedTask, PlannedTaskStatus } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useLongPress } from "@/hooks/useLongPress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import { PlannedTaskDialog } from "@/components/PlannedTaskDialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MarkdownDisplay } from "@/components/MarkdownDisplay";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Play, MoveRight, MoreVertical, PencilIcon, Briefcase, Tag, Users, PlusCircle, Clock } from "lucide-react";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

interface PlannedTaskCardProps {
  task: PlannedTask;
  isDayStarted: boolean;
  isDayStale: boolean;
}

const STATUS_LABELS: Record<PlannedTaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

const OTHER_STATUSES = (current: PlannedTaskStatus): PlannedTaskStatus[] =>
  (["todo", "in_progress", "done", "blocked"] as PlannedTaskStatus[]).filter(
    (s) => s !== current,
  );

const formatDuration = (ms: number): string => {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
};

export const PlannedTaskCard: React.FC<PlannedTaskCardProps> = ({
  task,
  isDayStarted,
  isDayStale,
}) => {
  const {
    categories,
    deletePlannedTask,
    restoreDeletedPlannedTask,
    movePlannedTask,
    pullPlannedTaskToDay,
    addPlannedTaskToDay,
  } = useTimeTracking();
  const { confirmDelete } = useUndoableDelete<PlannedTask>();
  const contextMenuTriggerRef = useRef<HTMLDivElement>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const longPressHandlers = useLongPress(() => {
    if (contextMenuTriggerRef.current) {
      contextMenuTriggerRef.current.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
      );
    }
  });

  const category = categories.find((c) => c.id === task.category);
  const canPull = isDayStarted && !isDayStale && task.status !== "done" && task.status !== "in_progress";
  const canAddToDay = isDayStarted && !isDayStale && task.status === "in_progress";

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div ref={contextMenuTriggerRef} {...longPressHandlers}>
            <Card className="border ring-0 hover:shadow-md transition-all duration-200">
              <CardContent>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm leading-snug">
                      {task.title}
                    </h3>

                    {task.description && (
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        <MarkdownDisplay content={task.description} />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1 mt-2">
                      {category && (
                        <Badge
                          variant="outline"
                          className="border-transparent"
                          style={{
                            backgroundColor: category.color,
                            color: "#fff",
                          }}
                        >
                          <Tag className="w-2.5 h-2.5 inline mr-0.5" />
                          {category.name}
                        </Badge>
                      )}
                      {task.project && (
                        <Badge
                          variant="outline"
                          className="border-mauve-7 text-mauve-11"
                        >
                          <Briefcase className="w-2.5 h-2.5 inline mr-0.5" />
                          {task.project}
                        </Badge>
                      )}
                      {task.client && (
                        <Badge
                          variant="outline"
                          className="bg-cyan-3 text-cyan-11 border-cyan-6"
                        >
                          <Users className="w-2.5 h-2.5 inline mr-0.5" />
                          {task.client}
                        </Badge>
                      )}
                      {task.timeSpent > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-violet-3 text-violet-11 border-violet-6"
                        >
                          <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                          {formatDuration(task.timeSpent)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canPull && (
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() => pullPlannedTaskToDay(task.id)}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Pull to Active Day
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </DropdownMenuGroup>
                        )}
                        {canAddToDay && (
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() => addPlannedTaskToDay(task.id)}
                            >
                              <PlusCircle className="w-3 h-3 mr-1" />
                              Add to Active Day
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </DropdownMenuGroup>
                        )}
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => setShowEditDialog(true)}
                          >
                            <PencilIcon className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuGroup>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <MoveRight className="w-4 h-4 mr-2" />
                              Move to
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                {OTHER_STATUSES(task.status).map((s) => (
                                  <DropdownMenuItem
                                    key={s}
                                    onClick={() => movePlannedTask(task.id, s)}
                                  >
                                    {STATUS_LABELS[s]}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => setShowDeleteDialog(true)}
                            variant="destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Task
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          {canPull && (
            <>
              <ContextMenuItem onClick={() => pullPlannedTaskToDay(task.id)}>
                <Play className="w-4 h-4 mr-2" />
                Pull to Active Day
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          {canAddToDay && (
            <>
              <ContextMenuItem onClick={() => addPlannedTaskToDay(task.id)}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Add to Active Day
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem
            onClick={() => setShowEditDialog(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Task
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <MoveRight className="w-4 h-4 mr-2" />
              Move to
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {OTHER_STATUSES(task.status).map((s) => (
                <ContextMenuItem
                  key={s}
                  onClick={() => movePlannedTask(task.id, s)}
                >
                  {STATUS_LABELS[s]}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => setShowDeleteDialog(true)}
            variant="destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Task
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Sheet open={showEditDialog} onOpenChange={setShowEditDialog}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Task</SheetTitle>
          </SheetHeader>
          <PlannedTaskDialog
            task={task}
            isOpen={showEditDialog}
            onClose={() => setShowEditDialog(false)}
          />
        </SheetContent>
      </Sheet>

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => {
          deletePlannedTask(task.id);
          confirmDelete(task, restoreDeletedPlannedTask, {
            title: "Planned task deleted",
            description: `"${task.title}" has been removed.`,
          });
          setShowDeleteDialog(false);
        }}
        taskTitle={task.title}
      />
    </>
  );
};
