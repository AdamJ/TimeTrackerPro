import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Callout } from "@/components/ui/callout";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownDisplay } from "@/components/MarkdownDisplay";
import { TimePicker } from "@/components/ui/scroll-time-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Clock,
  Save,
  Loader2,
  Trash2,
  Edit,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import {
  formatDuration,
  formatDate,
  roundToNearest15Minutes,
  formatTimeForInput,
} from "@/utils/timeUtil";
import { DayRecord, Task } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { ArchivedTaskRow } from "@/components/ArchivedTaskRow";
import { useToast } from "@/hooks/use-toast";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";

interface ArchiveEditDialogProps {
  day: DayRecord;
  isOpen: boolean;
  onClose: () => void;
}

// Helper functions
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime12Hour(date: Date | undefined): string {
  if (!date) return "-";
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;
  return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

const dayFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time"),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time"),
  notes: z.string().optional(),
});

type DayFormValues = z.infer<typeof dayFormSchema>;

export const ArchiveEditDialog: React.FC<ArchiveEditDialogProps> = ({
  day,
  isOpen,
  onClose,
}) => {
  const {
    updateArchivedDay,
    deleteArchivedDay,
    restoreArchivedDay,
    restoreDeletedArchivedDay,
    categories,
    projects,
    isDayStarted,
  } = useTimeTracking();
  const { toast } = useToast();
  const { confirmDelete } = useUndoableDelete<DayRecord>();
  const [isSummaryEditing, setIsSummaryEditing] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const dayForm = useForm<DayFormValues>({
    resolver: zodResolver(dayFormSchema),
    mode: "onBlur",
    defaultValues: { date: "", startTime: "", endTime: "", notes: "" },
  });
  const { isDirty: dayFormIsDirty } = dayForm.formState;

  const [tasks, setTasks] = useState<Task[]>([]);

  // Finds the task whose endTime is latest — i.e. the last task worked in the
  // day — so its end time can be kept in sync with the day's rounded end time.
  const findLastTask = (taskList: Task[]): Task | undefined =>
    taskList.reduce<Task | undefined>((latest, t) => {
      if (!t.endTime) return latest;
      if (!latest || !latest.endTime || t.endTime > latest.endTime) return t;
      return latest;
    }, undefined);

  // Applies the same last-task-end-time rounding used for the day-form's own
  // end time, so both land on the same value. This is the resting baseline
  // tasks are compared against for dirty-checking — matching how dayForm's
  // reset() below makes the rounded day time the new baseline rather than
  // something that shows as an unsaved change on its own.
  const getRoundedTasks = (taskList: Task[]): Task[] => {
    const lastTask = findLastTask(taskList);
    return taskList.map((t) =>
      lastTask && t.id === lastTask.id && t.endTime
        ? { ...t, endTime: roundToNearest15Minutes(t.endTime) }
        : t,
    );
  };

  // Resets the form/tasks back to the saved day. Only the displayed/staged
  // last-task end time is rounded — its duration is left untouched (no
  // silent recompute).
  const resetFormState = () => {
    dayForm.reset({
      date: formatDateForInput(day.startTime),
      startTime: formatTimeForInput(day.startTime),
      endTime: formatTimeForInput(day.endTime),
      notes: day.notes || "",
    });
    setTasks(getRoundedTasks(day.tasks));
    setIsSummaryEditing(false);
    setExpandedTaskId(null);
    setShowDeleteConfirm(false);
  };

  // Initialize form data when dialog opens
  useEffect(() => {
    if (isOpen && day) {
      resetFormState();
    }
    // dayForm/resetFormState are stable across renders; only re-run when the dialog/day changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, isOpen]);

  // Any staged edit — day form or task rows — enables Save Changes, regardless
  // of whether the day-summary editor was ever opened. Tasks are compared
  // against the rounded baseline (not the raw day.tasks) so the automatic
  // last-task rounding alone doesn't look like an unsaved change.
  const tasksChanged =
    JSON.stringify(tasks) !== JSON.stringify(getRoundedTasks(day.tasks));
  const hasChanges = dayFormIsDirty || tasksChanged;

  const parseTimeInput = (timeStr: string, baseDate: Date): Date => {
    if (!timeStr || !timeStr.includes(":")) {
      return baseDate;
    }

    const [hoursStr, minutesStr] = timeStr.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) {
      return baseDate;
    }

    const newDate = new Date(baseDate);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  const calculateTotalDuration = (taskList: Task[]): number => {
    return taskList.reduce((total, task) => total + (task.duration || 0), 0);
  };

  const handleSaveDay = async (dayData: DayFormValues) => {
    // Parse the new date from the input (same as StartDayDialog)
    const [year, month, dayOfMonth] = dayData.date.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, dayOfMonth);

    // Create new start/end times with the selected date but original times
    const newStartTime = parseTimeInput(dayData.startTime, day.startTime);
    newStartTime.setFullYear(selectedDate.getFullYear());
    newStartTime.setMonth(selectedDate.getMonth());
    newStartTime.setDate(selectedDate.getDate());

    const newEndTime = parseTimeInput(dayData.endTime, day.endTime);
    newEndTime.setFullYear(selectedDate.getFullYear());
    newEndTime.setMonth(selectedDate.getMonth());
    newEndTime.setDate(selectedDate.getDate());

    // Re-stamp every task's date to match the day (a no-op for Y/M/D when the
    // date hasn't changed) and always send the full staged tasks array — the
    // currently-staged tasks include the last task's rounded end time, which
    // must persist together with the day even if only the day fields changed.
    const updatedTasks = tasks.map((task) => {
      const newTaskStartTime = new Date(task.startTime);
      newTaskStartTime.setFullYear(selectedDate.getFullYear());
      newTaskStartTime.setMonth(selectedDate.getMonth());
      newTaskStartTime.setDate(selectedDate.getDate());

      const newTaskEndTime = task.endTime ? new Date(task.endTime) : undefined;
      if (newTaskEndTime) {
        newTaskEndTime.setFullYear(selectedDate.getFullYear());
        newTaskEndTime.setMonth(selectedDate.getMonth());
        newTaskEndTime.setDate(selectedDate.getDate());
      }

      return {
        ...task,
        startTime: newTaskStartTime,
        endTime: newTaskEndTime,
      };
    });

    const updatedDay: Partial<DayRecord> = {
      date: newStartTime.toDateString(),
      startTime: newStartTime,
      endTime: newEndTime,
      notes: dayData.notes || undefined,
      totalDuration: calculateTotalDuration(updatedTasks),
      tasks: updatedTasks,
    };

    setIsSaving(true);
    try {
      await updateArchivedDay(day.id, updatedDay);
      setIsSummaryEditing(false);
      setExpandedTaskId(null);
    } catch (error) {
      console.error("Failed to save archived day:", error);
      toast({
        title: "Save failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDay = () => {
    deleteArchivedDay(day.id);
    confirmDelete(day, restoreDeletedArchivedDay, {
      title: "Archived day deleted",
      description: `"${formatDate(day.startTime)}" has been removed.`,
    });
    onClose();
  };

  const handleRestoreDay = () => {
    if (isDayStarted) {
      setShowRestoreDialog(true);
    } else {
      restoreArchivedDay(day.id);
      onClose();
    }
  };

  const handleRestoreConfirm = () => {
    restoreArchivedDay(day.id);
    setShowRestoreDialog(false);
    onClose();
  };

  const handleTaskSave = (updatedTask: Task) => {
    const updatedTasks = tasks.map((t) =>
      t.id === updatedTask.id ? updatedTask : t,
    );
    setTasks(updatedTasks);
    setExpandedTaskId(null);
  };

  const handleTaskDelete = (taskId: string) => {
    const updatedTasks = tasks.filter((t) => t.id !== taskId);
    setTasks(updatedTasks);
  };

  const handleCancel = () => {
    resetFormState();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90dvw] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Calendar aria-hidden="true" className="w-5 h-5 text-blue-9" />
              <span>{formatDate(day.startTime)}</span>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 overflow-x-hidden">
          <div className="flex flex-wrap justify-center sm:justify-end items-center gap-3 my-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleRestoreDay}
                  variant="outline"
                  size="sm"
                  aria-label="Restore this day"
                  className="text-blue-11 hover:text-blue-12"
                  autoFocus
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden md:block md:ml-2">Restore</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restore this day</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="destructive"
                  size="sm"
                  aria-label="Delete this day"
                  className="text-white"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden md:block md:ml-2">Delete</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete this day</TooltipContent>
            </Tooltip>
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
              disabled={!hasChanges}
            >
              Cancel
            </Button>
            <Button
              onClick={dayForm.handleSubmit(handleSaveDay)}
              size="sm"
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving
                ? "Saving..."
                : hasChanges
                  ? "Save Changes"
                  : "No Changes"}
            </Button>
          </div>
          {(isSummaryEditing || expandedTaskId !== null) && (
            <Callout.Root size="1" variant="soft">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                Only administrators can edit archived days. Changes will be
                saved immediately and cannot be undone, so please review your
                changes before saving.
              </Callout.Text>
            </Callout.Root>
          )}
          {hasChanges && (
            <Callout.Root size="1" variant="warning">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                You have unsaved changes. Click "Save Changes" to persist
                them, or "Cancel" to discard.
              </Callout.Text>
            </Callout.Root>
          )}
          <Card className="mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Summary of Day</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setIsSummaryEditing((prev) => !prev)}
                      variant="outline"
                      size="sm"
                      aria-label={
                        isSummaryEditing
                          ? "Close day summary editor"
                          : "Edit day summary"
                      }
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isSummaryEditing ? "Close" : "Edit day summary"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              {isSummaryEditing ? (
                <Form {...dayForm}>
                  <div className="space-y-4">
                    <FormField
                      control={dayForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" className="w-full" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={dayForm.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time</FormLabel>
                            <FormControl>
                              <TimePicker
                                value={field.value}
                                onValueChange={field.onChange}
                                aria-label="Day start time"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={dayForm.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Time</FormLabel>
                            <FormControl>
                              <TimePicker
                                value={field.value}
                                onValueChange={field.onChange}
                                aria-label="Day end time"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={dayForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <Tabs defaultValue="edit" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="edit">Edit</TabsTrigger>
                              <TabsTrigger value="preview">Preview</TabsTrigger>
                            </TabsList>
                            <TabsContent value="edit">
                              <FormControl>
                                <Textarea
                                  placeholder="Add notes about this day (optional, supports Markdown)"
                                  className="min-h-[80px] resize-none"
                                  {...field}
                                />
                              </FormControl>
                            </TabsContent>
                            <TabsContent value="preview">
                              <div className="w-full min-h-[80px] p-3 border rounded-md bg-background">
                                {field.value ? (
                                  <MarkdownDisplay content={field.value} />
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    No notes to preview
                                  </p>
                                )}
                              </div>
                            </TabsContent>
                          </Tabs>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                  <div>
                    <span className="font-medium text-foreground">
                      Start Time:
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {formatTime12Hour(day.startTime)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      End Time:
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {formatTime12Hour(day.endTime)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Total Duration:
                    </span>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock aria-hidden="true" className="w-4 h-4 text-green-9" />
                      <span className="font-semibold text-green-11">
                        {formatDuration(calculateTotalDuration(tasks))}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Tasks:</span>
                    <span className="ml-2 text-muted-foreground">
                      {tasks.length} total
                    </span>
                  </div>
                  {day.notes && (
                    <div className="col-span-2">
                      <span className="font-medium text-foreground">
                        Notes:
                      </span>
                      <div className="mt-1 text-muted-foreground">
                        <MarkdownDisplay content={day.notes} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          {/* Tasks Detail */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tasks ({tasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Project/Client</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <ArchivedTaskRow
                        key={task.id}
                        task={task}
                        isExpanded={expandedTaskId === task.id}
                        onToggleExpand={(id) =>
                          setExpandedTaskId((cur) => (cur === id ? null : id))
                        }
                        onSave={handleTaskSave}
                        onDelete={handleTaskDelete}
                        categories={categories}
                        projects={projects}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <div className="flex-1">
                    <h4 className="font-medium text-destructive">
                      Delete Archived Day
                    </h4>
                    <p className="text-sm text-destructive mt-1">
                      Are you sure you want to delete this archived day?
                      You'll have a few seconds to undo this from the
                      confirmation toast.
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleDeleteDay}
                      size="sm"
                      variant="destructive"
                    >
                      Delete
                    </Button>
                    <Button
                      onClick={() => setShowDeleteConfirm(false)}
                      size="sm"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <AlertDialog
          open={showRestoreDialog}
          onOpenChange={setShowRestoreDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Replace active day?</AlertDialogTitle>
              <AlertDialogDescription>
                You currently have an active day. Restoring to this archived day
                will replace your current work.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRestoreConfirm}>
                Restore anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
