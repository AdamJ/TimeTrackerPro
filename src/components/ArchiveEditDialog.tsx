import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Callout } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Calendar,
  Clock,
  X,
  Save,
  Trash2,
  Edit,
  Plus,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { formatDuration, formatDate } from '@/utils/timeUtil';
import { DayRecord, Task } from '@/contexts/TimeTrackingContext';
import { useTimeTracking } from '@/hooks/useTimeTracking';

interface ArchiveEditDialogProps {
  day: DayRecord;
  isOpen: boolean;
  onClose: () => void;
}

// Helper functions
function roundToNearest15Minutes(date: Date): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const roundedMinutes = Math.round(minutes / 15) * 15;
  rounded.setMinutes(roundedMinutes);
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  return rounded;
}

function formatTimeForInput(date: Date): string {
  const rounded = roundToNearest15Minutes(date);
  const hours = rounded.getHours().toString().padStart(2, '0');
  const minutes = rounded.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime12Hour(date: Date | undefined): string {
  if (!date) return '-';
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;
  return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

type TimeOption = { value: string; label: string };
function generateTimeOptions(): TimeOption[] {
  const options: TimeOption[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const value = `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`;
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      const label = formatTime12Hour(date);
      options.push({ value, label });
    }
  }
  return options;
}

export const ArchiveEditDialog: React.FC<ArchiveEditDialogProps> = ({
  day,
  isOpen,
  onClose
}) => {
  const {
    updateArchivedDay,
    deleteArchivedDay,
    restoreArchivedDay,
    categories,
    isDayStarted
  } = useTimeTracking();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [dayData, setDayData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    notes: ''
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const timeOptions = generateTimeOptions();

  // Initialize form data when dialog opens
  useEffect(() => {
    if (isOpen && day) {
      setDayData({
        date: formatDateForInput(day.startTime),
        startTime: formatTimeForInput(day.startTime),
        endTime: formatTimeForInput(day.endTime),
        notes: day.notes || ''
      });
      setTasks([...day.tasks]);
      setIsEditing(false);
      setEditingTask(null);
      setShowDeleteConfirm(false);
    }
  }, [day, isOpen]);

  const parseTimeInput = (timeStr: string, baseDate: Date): Date => {
    if (!timeStr || !timeStr.includes(':')) {
      return baseDate;
    }

    const [hoursStr, minutesStr] = timeStr.split(':');
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

  const handleSaveDay = async () => {
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

    // Update all task timestamps to use the new date
    const updatedTasks = tasks.map(task => {
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
        endTime: newTaskEndTime
      };
    });

    const updatedDay: Partial<DayRecord> = {
      date: newStartTime.toDateString(),
      startTime: newStartTime,
      endTime: newEndTime,
      notes: dayData.notes || undefined,
      tasks: updatedTasks,
      totalDuration: calculateTotalDuration(updatedTasks)
    };

    try {
      await updateArchivedDay(day.id, updatedDay);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save archived day:", error);
      alert("Failed to save changes. Please try again.");
    }
  };

  const handleDeleteDay = () => {
    deleteArchivedDay(day.id);
    onClose();
  };

  const handleRestoreDay = () => {
    if (isDayStarted) {
      if (
        !confirm(
          'You currently have an active day. Restoring to this day will replace your current work. Continue restoring?'
        )
      ) {
        return;
      }
    }
    restoreArchivedDay(day.id);
    onClose();
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
  };

  const handleTaskSave = (updatedTask: Task) => {
    const updatedTasks = tasks.map((t) =>
      t.id === updatedTask.id ? updatedTask : t
    );
    setTasks(updatedTasks);
    setEditingTask(null);
  };

  const handleTaskDelete = (taskId: string) => {
    const updatedTasks = tasks.filter((t) => t.id !== taskId);
    setTasks(updatedTasks);
  };

  const handleCancel = () => {
    // Reset to original values
    setDayData({
      date: formatDateForInput(day.startTime),
      startTime: formatTimeForInput(day.startTime),
      endTime: formatTimeForInput(day.endTime),
      notes: day.notes || ''
    });
    setTasks([...day.tasks]);
    setIsEditing(false);
    setEditingTask(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>{formatDate(day.startTime)}</span>
            </DialogTitle>
            <div className="flex items-center space-x-2 my-4">
              {!isEditing ? (
                <>
                  <Button
                    onClick={handleRestoreDay}
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="default"
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveDay} size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Day Summary */}
          {isEditing && (
            <Callout.Root size="1" variant="outline">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                You will need admin privileges to install and access this
                application.
              </Callout.Text>
            </Callout.Root>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary of Day</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={dayData.date}
                      onChange={(e) =>
                        setDayData((prev) => ({ ...prev, date: e.target.value }))
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Select
                        value={dayData.startTime}
                        onValueChange={(value) =>
                          setDayData((prev) => ({ ...prev, startTime: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {timeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Select
                        value={dayData.endTime}
                        onValueChange={(value) =>
                          setDayData((prev) => ({ ...prev, endTime: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {timeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={dayData.notes}
                      onChange={(e) =>
                        setDayData((prev) => ({
                          ...prev,
                          notes: e.target.value
                        }))
                      }
                      placeholder="Add notes about this day (optional)"
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">
                      Start Time:
                    </span>
                    <span className="ml-2 text-gray-600">
                      {formatTime12Hour(day.startTime)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">End Time:</span>
                    <span className="ml-2 text-gray-600">
                      {formatTime12Hour(day.endTime)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      Total Duration:
                    </span>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-green-600">
                        {formatDuration(calculateTotalDuration(tasks))}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Tasks:</span>
                    <span className="ml-2 text-gray-600">
                      {tasks.length} total
                    </span>
                  </div>
                  {day.notes && (
                    <div className="col-span-2">
                      <span className="font-medium text-gray-900">Notes:</span>
                      <p className="mt-1 text-gray-600">{day.notes}</p>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Duration</TableHead>
                    {isEditing && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => {
                    const category = categories.find(
                      (c) => c.id === task.category
                    );
                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{task.title}</div>
                            {task.description && (
                              <div className="text-sm text-gray-500 mt-1">
                                {task.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {category && (
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <span className="text-sm">{category.name}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.project && (
                            <div>
                              <div className="text-sm font-medium">
                                {task.project}
                              </div>
                              {task.client && (
                                <div className="text-xs text-gray-500">
                                  {task.client}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatTime12Hour(task.startTime)}
                        </TableCell>
                        <TableCell>
                          {task.endTime ? formatTime12Hour(task.endTime) : '-'}
                        </TableCell>
                        <TableCell>
                          {formatDuration(task.duration || 0)}
                        </TableCell>
                        {isEditing && (
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => handleTaskEdit(task)}
                                size="sm"
                                variant="outline"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={() => handleTaskDelete(task.id)}
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900">
                      Delete Archived Day
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      Are you sure you want to delete this archived day? This
                      action cannot be undone.
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleDeleteDay}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
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

        {/* Task Edit Dialog */}
        {editingTask && (
          <TaskEditInArchiveDialog
            task={editingTask}
            isOpen={!!editingTask}
            onClose={() => setEditingTask(null)}
            onSave={handleTaskSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

// Separate component for editing tasks within archived days
interface TaskEditInArchiveDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}

const TaskEditInArchiveDialog: React.FC<TaskEditInArchiveDialogProps> = ({
  task,
  isOpen,
  onClose,
  onSave
}) => {
  const { projects, categories } = useTimeTracking();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: 'none',
    category: 'none'
  });

  const [timeData, setTimeData] = useState({
    startTime: '',
    endTime: ''
  });

  const timeOptions = generateTimeOptions();

  useEffect(() => {
    if (isOpen && task) {
      const projectId =
        projects.find((p) => p.name === task.project)?.id || 'none';

      setFormData({
        title: task.title || '',
        description: task.description || '',
        project: projectId,
        category: task.category || 'none'
      });

      setTimeData({
        startTime: formatTimeForInput(task.startTime),
        endTime: task.endTime ? formatTimeForInput(task.endTime) : ''
      });
    }
  }, [task, projects, isOpen]);

  const parseTimeInput = (timeStr: string, baseDate: Date): Date => {
    if (!timeStr || !timeStr.includes(':')) {
      return baseDate;
    }

    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) {
      return baseDate;
    }

    const newDate = new Date(baseDate);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  const handleSave = () => {
    const selectedProject =
      formData.project !== 'none'
        ? projects.find((p) => p.id === formData.project)
        : undefined;
    const selectedCategory =
      formData.category !== 'none'
        ? categories.find((c) => c.id === formData.category)
        : undefined;

    const newStartTime = parseTimeInput(timeData.startTime, task.startTime);
    const newEndTime = timeData.endTime
      ? parseTimeInput(timeData.endTime, task.startTime)
      : undefined;

    const updatedTask: Task = {
      ...task,
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      project: selectedProject?.name || undefined,
      client: selectedProject?.client || undefined,
      category: selectedCategory?.id || undefined,
      startTime: newStartTime,
      endTime: newEndTime,
      duration: newEndTime
        ? newEndTime.getTime() - newStartTime.getTime()
        : task.duration
    };

    onSave(updatedTask);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>
              Task Title <span className="text-red-700">*</span>
            </Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter task title"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value
                }))
              }
              placeholder="Enter task description (optional)"
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Project</Label>
              <Select
                value={formData.project}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, project: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col">
                        <span>{project.name}</span>
                        <span className="text-sm text-gray-500">
                          {project.client}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time</Label>
              <Select
                value={timeData.startTime}
                onValueChange={(value) =>
                  setTimeData((prev) => ({ ...prev, startTime: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>End Time</Label>
              <Select
                value={timeData.endTime}
                onValueChange={(value) =>
                  setTimeData((prev) => ({ ...prev, endTime: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.title.trim()}
              variant="default"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
