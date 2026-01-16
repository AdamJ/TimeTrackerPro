import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownDisplay } from "@/components/MarkdownDisplay";
import { Clock, Save } from "lucide-react";
import { Task } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { formatTime, formatDate } from "@/utils/timeUtil";

interface TaskEditDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

// Helper functions
function formatTimeForInput(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export const TaskEditDialog: React.FC<TaskEditDialogProps> = ({
  task,
  isOpen,
  onClose
}) => {
  const { updateTask, adjustTaskTime, projects, categories } =
    useTimeTracking();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: '',
    category: ''
  });

  const [timeData, setTimeData] = useState({
    startTime: '',
    endTime: ''
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Reset form when task changes or dialog opens
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

      setHasChanges(false);
    }
  }, [task, projects, isOpen]);

  // Track changes
  useEffect(() => {
    if (task && isOpen) {
      const projectId =
        projects.find((p) => p.name === task.project)?.id || 'none';
      const originalData = {
        title: task.title || '',
        description: task.description || '',
        project: projectId,
        category: task.category || 'none'
      };

      const originalTimeData = {
        startTime: formatTimeForInput(task.startTime),
        endTime: task.endTime ? formatTimeForInput(task.endTime) : ''
      };

      const dataChanged =
        JSON.stringify(formData) !== JSON.stringify(originalData);
      const timeChanged =
        JSON.stringify(timeData) !== JSON.stringify(originalTimeData);

      setHasChanges(dataChanged || timeChanged);
    }
  }, [formData, timeData, task, projects, isOpen]);

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

  type TimeOption = { value: string; label: string };
  function formatTime12Hour(date: Date | undefined): string {
    if (!date) return '-';
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;
    return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }
  const generateTimeOptions = (): TimeOption[] => {
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
  };

  const timeOptions: TimeOption[] = generateTimeOptions();

  const handleCancel = () => {
    // Reset form to original values
    if (task) {
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
    onClose();
  };

  const handleSave = () => {
    // Validate required fields
    if (!formData.title.trim()) {
      alert('Task title is required');
      return;
    }

    const selectedProject =
      formData.project !== 'none'
        ? projects.find((p) => p.id === formData.project)
        : undefined;
    const selectedCategory =
      formData.category !== 'none'
        ? categories.find((c) => c.id === formData.category)
        : undefined;

    // Update task details
    const taskUpdates: Partial<Task> = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      project: selectedProject?.name || undefined,
      client: selectedProject?.client || undefined,
      category: selectedCategory?.id || undefined
    };

    updateTask(task.id, taskUpdates);

    // Update times if they've changed
    if (timeData.startTime) {
      const newStartTime = parseTimeInput(timeData.startTime, task.startTime);
      const newEndTime = timeData.endTime
        ? parseTimeInput(timeData.endTime, task.startTime)
        : undefined;

      // Check if times have actually changed
      const startTimeChanged =
        newStartTime.getTime() !== task.startTime.getTime();
      const endTimeChanged =
        (newEndTime &&
          task.endTime &&
          newEndTime.getTime() !== task.endTime.getTime()) ||
        (newEndTime && !task.endTime) ||
        (!newEndTime && task.endTime);

      if (startTimeChanged || endTimeChanged) {
        adjustTaskTime(task.id, newStartTime, newEndTime);
      }
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Edit Task</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="time">Time</TabsTrigger>
            </TabsList>

            {/* Task Details */}
            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Task Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">
                      Task Title <span className="text-red-700">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Enter task title"
                    />
                  </div>

									<div>
										<Label htmlFor="description">Description</Label>
										<Tabs defaultValue="edit" className="w-full">
											<TabsList className="grid w-full grid-cols-2">
												<TabsTrigger value="edit">Edit</TabsTrigger>
												<TabsTrigger value="preview">Preview</TabsTrigger>
											</TabsList>
											<TabsContent value="edit">
												<Textarea
													id="description"
													value={formData.description}
													onChange={(e) =>
														setFormData((prev) => ({
															...prev,
															description: e.target.value
														}))
													}
													placeholder="Enter task description (optional, supports Markdown)"
													className="min-h-[80px] resize-none"
												/>
											</TabsContent>
											<TabsContent value="preview">
												<div className="w-full min-h-[80px] p-3 border rounded-md bg-background">
													{formData.description ? (
														<MarkdownDisplay content={formData.description} />
													) : (
														<p className="text-sm text-muted-foreground">No description to preview</p>
													)}
												</div>
											</TabsContent>
										</Tabs>
									</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category">
                            {formData.category && formData.category !== 'none' ? (
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-3 h-3 rounded-full border"
                                  style={{
                                    backgroundColor:
                                      categories.find(
                                        (c) => c.id === formData.category
                                      )?.color || '#gray'
                                  }}
                                />
                                <span>
                                  {
                                    categories.find(
                                      (c) => c.id === formData.category
                                    )?.name
                                  }
                                </span>
                              </div>
                            ) : (
                              'Select category'
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-3 h-3 rounded-full border"
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
                          <SelectValue placeholder="Select project">
                            {formData.project && formData.project !== 'none' ? (
                              <div className="flex flex-col">
                                <span>
                                  {
                                    projects.find((p) => p.id === formData.project)
                                      ?.name
                                  }
                                </span>
                                <span className="text-sm text-gray-500">
                                  {
                                    projects.find((p) => p.id === formData.project)
                                      ?.client
                                  }
                                </span>
                              </div>
                            ) : (
                              'Select project'
                            )}
                          </SelectValue>
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
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="time">
              {/* Time Adjustment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Time Adjustment</CardTitle>
                  <p className="text-sm text-gray-600">
                    Times are automatically rounded to the nearest 15-minute
                    interval
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    <p>Date: {formatDate(task.startTime)}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Select
                        value={timeData.startTime}
                        onValueChange={(value) =>
                          setTimeData((prev) => ({ ...prev, startTime: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select start time" />
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
                      <Label>
                        End Time {!task.endTime && '(Currently Active)'}
                      </Label>
                      <Select
                        value={timeData.endTime}
                        onValueChange={(value) =>
                          setTimeData((prev) => ({ ...prev, endTime: value }))
                        }
                        disabled={!task.endTime}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              task.endTime ? 'Select end time' : 'Task is active'
                            }
                          />
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

                  {/* Current Values Display */}
                  <div className="bg-gray-50 p-3 rounded-md text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Current Start:</span>{' '}
                        {formatTime(task.startTime)}
                      </div>
                      <div>
                        <span className="font-medium">Current End:</span>{' '}
                        {task.endTime ? formatTime(task.endTime) : 'Active'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.title.trim() || !hasChanges}
            >
              <Save className="w-4 h-4 mr-2" />
              {hasChanges ? 'Save Changes' : 'No Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
