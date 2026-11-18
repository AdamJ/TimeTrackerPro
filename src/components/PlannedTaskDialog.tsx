import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { PlannedTask, PlannedTaskStatus } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useTaskTitleField } from "@/hooks/useTaskTitleField";
import { formatDuration } from "@/utils/reportUtils";
import { FormDialog } from "@/components/FormDialog";
import { NO_SELECTION, TaskFormFields } from "@/components/TaskFormFields";

interface PlannedTaskDialogProps {
  task?: PlannedTask;
  isOpen: boolean;
  onClose: () => void;
  defaultStatus?: PlannedTaskStatus;
}

const STATUS_LABELS: Record<PlannedTaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

/** Create or edit a planned task (a card on the Task board). Same shell and fields as "Start New Task". */
export const PlannedTaskDialog: React.FC<PlannedTaskDialogProps> = ({
  task,
  isOpen,
  onClose,
  defaultStatus = "todo",
}) => {
  const { addPlannedTask, updatePlannedTask, projects } = useTimeTracking();

  const titleField = useTaskTitleField();
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<PlannedTaskStatus>(defaultStatus);
  const [project, setProject] = useState(NO_SELECTION);
  const [category, setCategory] = useState(NO_SELECTION);
  const [hasChanges, setHasChanges] = useState(false);

  const isEditMode = !!task;
  const { reset: resetTitle } = titleField;

  useEffect(() => {
    if (isOpen) {
      if (task) {
        resetTitle(task.title);
        setDescription(task.description ?? "");
        setStatus(task.status);
        setProject(projects.find((p) => p.name === task.project)?.id ?? NO_SELECTION);
        setCategory(task.category ?? NO_SELECTION);
      } else {
        resetTitle();
        setDescription("");
        setStatus(defaultStatus);
        setProject(NO_SELECTION);
        setCategory(NO_SELECTION);
      }
      setHasChanges(false);
    }
  }, [isOpen, task, projects, defaultStatus, resetTitle]);

  useEffect(() => {
    if (!isOpen || !task) return;
    const originalProject =
      projects.find((p) => p.name === task.project)?.id ?? NO_SELECTION;
    const changed =
      titleField.title !== task.title ||
      description !== (task.description ?? "") ||
      status !== task.status ||
      project !== originalProject ||
      category !== (task.category ?? NO_SELECTION);
    setHasChanges(changed);
  }, [titleField.title, description, status, project, category, task, projects, isOpen]);

  const handleSave = () => {
    if (!titleField.validate()) return;

    const selectedProject = projects.find((p) => p.id === project);
    const data = {
      title: titleField.title.trim(),
      description: description.trim() || undefined,
      project: selectedProject?.name,
      client: selectedProject?.client,
      category: category === NO_SELECTION ? undefined : category,
      priority: task?.priority ?? 0,
      linkedTaskId: task?.linkedTaskId,
    };

    if (isEditMode && task) {
      updatePlannedTask(task.id, { ...data, status });
    } else {
      addPlannedTask({ ...data, status: defaultStatus });
    }
    onClose();
  };

  return (
    <FormDialog
      open={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Task" : "New Task"}
      description={isEditMode ? "Update this task." : "Add a task to your board to work on later."}
      submitLabel={isEditMode ? "Save Changes" : "Add Task"}
      submitDisabled={isEditMode && !hasChanges}
      onSubmit={handleSave}
    >
      <TaskFormFields
        idPrefix="planned"
        titleField={titleField}
        titlePlaceholder="What needs to be done?"
        description={description}
        onDescriptionChange={setDescription}
        descriptionPlaceholder="Optional details, links, checklist items..."
        category={category}
        onCategoryChange={setCategory}
        project={project}
        onProjectChange={setProject}
      >
        {isEditMode && task && (
          <>
            <div className="space-y-1">
              <Label htmlFor="planned-status">Status</Label>
              <ResponsiveSelect
                id="planned-status"
                className="w-full"
                value={status}
                onValueChange={(v) => setStatus(v as PlannedTaskStatus)}
                options={(Object.keys(STATUS_LABELS) as PlannedTaskStatus[]).map((s) => ({
                  value: s,
                  label: STATUS_LABELS[s],
                }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="planned-time-spent">Time Spent</Label>
              <Input
                id="planned-time-spent"
                name="planned-time-spent"
                readOnly
                aria-readonly="true"
                value={formatDuration(task.timeSpent)}
              />
            </div>
          </>
        )}
      </TaskFormFields>
    </FormDialog>
  );
};
