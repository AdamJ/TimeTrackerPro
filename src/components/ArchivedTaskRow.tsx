import React, { useState, useEffect } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownDisplay } from "@/components/MarkdownDisplay";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { TimePicker } from "@/components/ui/scroll-time-picker";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit, Trash2, X } from "lucide-react";
import { formatDuration, formatTimeForInput } from "@/utils/timeUtil";
import { Task, Project } from "@/contexts/TimeTrackingContext";
import { TaskCategory } from "@/config/categories";

interface ArchivedTaskRowProps {
  task: Task;
  isExpanded: boolean;
  onToggleExpand: (taskId: string) => void;
  onSave: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
  categories: TaskCategory[];
  projects: Project[];
}

function parseTimeInput(timeStr: string, baseDate: Date): Date {
  if (!timeStr || !timeStr.includes(":")) return baseDate;

  const [hoursStr, minutesStr] = timeStr.split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) return baseDate;

  const newDate = new Date(baseDate);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
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

export const ArchivedTaskRow: React.FC<ArchivedTaskRowProps> = ({
  task,
  isExpanded,
  onToggleExpand,
  onSave,
  onDelete,
  categories,
  projects,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project: "none",
    category: "none",
  });
  const [timeData, setTimeData] = useState({ startTime: "", endTime: "" });

  useEffect(() => {
    if (isExpanded) {
      const projectId = projects.find((p) => p.name === task.project)?.id || "none";

      setFormData({
        title: task.title || "",
        description: task.description || "",
        project: projectId,
        category: task.category || "none",
      });

      setTimeData({
        startTime: formatTimeForInput(task.startTime),
        endTime: task.endTime ? formatTimeForInput(task.endTime) : "",
      });
    }
  }, [task, projects, isExpanded]);

  const category = categories.find((c) => c.id === task.category);

  const handleSave = () => {
    const selectedProject =
      formData.project !== "none"
        ? projects.find((p) => p.id === formData.project)
        : undefined;
    const selectedCategory =
      formData.category !== "none"
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
        : task.duration,
    };

    onSave(updatedTask);
  };

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          <div className="min-w-[150px]">
            <div>{task.title}</div>
            <span className="hidden lg:block">
              {task.description && (
                <div className="text-sm text-muted-foreground mt-1">
                  <MarkdownDisplay content={task.description} />
                </div>
              )}
            </span>
          </div>
        </TableCell>
        <TableCell>
          {category && (
            <div className="flex items-center space-x-2 min-w-[120px]">
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
            <div className="min-w-[120px]">
              <div className="text-sm font-medium">{task.project}</div>
              {task.client && (
                <div className="text-xs text-muted-foreground">{task.client}</div>
              )}
            </div>
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap">
          {formatTime12Hour(task.startTime)}
        </TableCell>
        <TableCell className="whitespace-nowrap">
          {task.endTime ? formatTime12Hour(task.endTime) : "-"}
        </TableCell>
        <TableCell className="whitespace-nowrap">
          {formatDuration(task.duration || 0)}
        </TableCell>
        <TableCell>
          <div className="flex space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onToggleExpand(task.id)}
                  size="sm"
                  variant="outline"
                  aria-label={isExpanded ? "Close task editor" : "Edit task"}
                >
                  {isExpanded ? (
                    <X className="w-3 h-3" />
                  ) : (
                    <Edit className="w-3 h-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isExpanded ? "Close" : "Edit task"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onDelete(task.id)}
                  size="sm"
                  variant="destructive"
                  aria-label="Delete task"
                  className="text-white"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete task</TooltipContent>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7}>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor={`archive-task-title-${task.id}`}>
                  Task Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`archive-task-title-${task.id}`}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <Label htmlFor={`archive-task-description-${task.id}`}>
                  Description
                </Label>
                <Tabs defaultValue="edit" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="edit">Edit</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="edit">
                    <Textarea
                      id={`archive-task-description-${task.id}`}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
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
                        <p className="text-sm text-muted-foreground">
                          No description to preview
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`archive-task-category-${task.id}`}>
                    Category
                  </Label>
                  <ResponsiveSelect
                    id={`archive-task-category-${task.id}`}
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, category: value }))
                    }
                    placeholder="Select category"
                    options={[
                      { value: "none", label: "No category" },
                      ...categories.map((c) => ({
                        value: c.id,
                        textLabel: c.name,
                        label: (
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: c.color }}
                            />
                            <span>{c.name}</span>
                          </div>
                        ),
                      })),
                    ]}
                  />
                </div>

                <div>
                  <Label htmlFor={`archive-task-project-${task.id}`}>Project</Label>
                  <ResponsiveSelect
                    id={`archive-task-project-${task.id}`}
                    value={formData.project}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, project: value }))
                    }
                    placeholder="Select project"
                    options={[
                      { value: "none", label: "No project" },
                      ...projects.map((p) => ({
                        value: p.id,
                        textLabel: `${p.name} (${p.client})`,
                        label: (
                          <div className="flex flex-col">
                            <span>{p.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {p.client}
                            </span>
                          </div>
                        ),
                      })),
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`archive-task-start-time-${task.id}`}>
                    Start Time
                  </Label>
                  <TimePicker
                    id={`archive-task-start-time-${task.id}`}
                    value={timeData.startTime}
                    onValueChange={(value) =>
                      setTimeData((prev) => ({ ...prev, startTime: value }))
                    }
                    aria-label="Task start time"
                  />
                </div>

                <div>
                  <Label htmlFor={`archive-task-end-time-${task.id}`}>
                    End Time
                  </Label>
                  <TimePicker
                    id={`archive-task-end-time-${task.id}`}
                    value={timeData.endTime}
                    onValueChange={(value) =>
                      setTimeData((prev) => ({ ...prev, endTime: value }))
                    }
                    aria-label="Task end time"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleExpand(task.id)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!formData.title.trim()}
                  variant="default"
                  size="sm"
                >
                  Save
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};
