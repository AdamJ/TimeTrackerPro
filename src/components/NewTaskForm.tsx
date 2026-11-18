import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useTaskTitleField } from "@/hooks/useTaskTitleField";
import { FormDialog } from "@/components/FormDialog";
import { NO_SELECTION, TaskFormFields } from "@/components/TaskFormFields";

interface NewTaskFormProps {
  onSubmit: (
    title: string,
    description?: string,
    project?: string,
    client?: string,
    category?: string
  ) => void;
  onCancel?: () => void;
  defaultOpen?: boolean;
}

export const NewTaskForm: React.FC<NewTaskFormProps> = ({ onSubmit, onCancel, defaultOpen = false }) => {
  const { projects, categories } = useTimeTracking();
  const titleField = useTaskTitleField();
  const [description, setDescription] = useState("");
  const [selectedProject, setSelectedProject] = useState(NO_SELECTION);
  const [selectedCategory, setSelectedCategory] = useState(NO_SELECTION);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const resetForm = () => {
    titleField.reset();
    setDescription("");
    setSelectedProject(NO_SELECTION);
    setSelectedCategory(NO_SELECTION);
  };

  const handleSubmit = () => {
    if (!titleField.validate()) return;
    const project = projects.find((p) => p.id === selectedProject);
    const category = categories.find((c) => c.id === selectedCategory);
    onSubmit(
      titleField.title.trim(),
      description.trim() || undefined,
      project?.name,
      project?.client,
      category?.id
    );
    resetForm();
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
    resetForm();
    onCancel?.();
  };

  return (
    <>
      {!isOpen && (
        <Button
          variant="default"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 md:right-6 w-16 h-16 rounded-full text-white text-md shadow-2xl hover:shadow-3xl transition-all duration-200 flex items-center justify-center z-50 hover:scale-110"
          aria-label="New Task"
        >
          <Plus style={{ fontSize: "1.5rem", width: "1.5rem", height: "1.5rem" }} />
        </Button>
      )}

      <FormDialog
        open={isOpen}
        onClose={handleCancel}
        title="Start New Task"
        description="Start the timer on a new task now."
        submitLabel="Start Task"
        onSubmit={handleSubmit}
      >
        <TaskFormFields
          idPrefix="new-task"
          titleField={titleField}
          titlePlaceholder="What are you working on?"
          description={description}
          onDescriptionChange={setDescription}
          descriptionPlaceholder="Optional details, links, checklist items..."
          category={selectedCategory}
          onCategoryChange={setSelectedCategory}
          project={selectedProject}
          onProjectChange={setSelectedProject}
        />
      </FormDialog>
    </>
  );
};
