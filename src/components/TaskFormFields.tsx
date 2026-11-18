import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownDisplay } from "@/components/MarkdownDisplay";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import type { TaskTitleField } from "@/hooks/useTaskTitleField";

/** Value used by the category and project selects for "nothing chosen". */
export const NO_SELECTION = "none";

interface TaskFormFieldsProps {
  /** Prefix for element ids, so two forms on a page never share one. */
  idPrefix: string;
  titleField: TaskTitleField;
  titlePlaceholder: string;
  description: string;
  onDescriptionChange: (value: string) => void;
  descriptionPlaceholder: string;
  category: string;
  onCategoryChange: (value: string) => void;
  project: string;
  onProjectChange: (value: string) => void;
  /** Extra fields (for example status), shown between the description and the category. */
  children?: React.ReactNode;
}

/**
 * The fields every task form shares: title, description with a Markdown preview,
 * category, and project. Used by "Start New Task" and by the planned-task
 * create/edit form, so both behave and read the same.
 */
export const TaskFormFields: React.FC<TaskFormFieldsProps> = ({
  idPrefix,
  titleField,
  titlePlaceholder,
  description,
  onDescriptionChange,
  descriptionPlaceholder,
  category,
  onCategoryChange,
  project,
  onProjectChange,
  children,
}) => {
  const { projects, categories } = useTimeTracking();
  const titleId = `${idPrefix}-title`;
  const titleErrorId = `${titleId}-error`;
  const descriptionId = `${idPrefix}-description`;
  const descriptionHintId = `${descriptionId}-hint`;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor={titleId}>
          Task Title <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          id={titleId}
          ref={titleField.ref}
          type="text"
          autoComplete="off"
          value={titleField.title}
          onChange={(e) => titleField.setTitle(e.target.value)}
          onBlur={titleField.markTouched}
          placeholder={titlePlaceholder}
          required
          aria-invalid={!!titleField.error}
          aria-describedby={titleField.error ? titleErrorId : undefined}
          autoFocus
        />
        {titleField.error && (
          <p id={titleErrorId} className="text-sm text-destructive" role="alert">
            {titleField.error}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor={descriptionId}>Description</Label>
          <span id={descriptionHintId} className="text-xs text-muted-foreground">
            Markdown supported
          </span>
        </div>
        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="grid w-full grid-cols-2" aria-label="Description view">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea
              id={descriptionId}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={descriptionPlaceholder}
              aria-describedby={descriptionHintId}
              // rows, not min-height: public/pwa.css sets an unlayered min-height on mobile textareas that beats Tailwind
              rows={4}
              className="w-full min-h-[120px] resize-y"
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="w-full min-h-[120px] p-3 border rounded-md bg-background">
              {description.trim() ? (
                <MarkdownDisplay content={description} />
              ) : (
                <p className="text-sm text-muted-foreground">No description to preview</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {children}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-category`}>Category</Label>
          <ResponsiveSelect
            id={`${idPrefix}-category`}
            className="w-full"
            value={category}
            onValueChange={onCategoryChange}
            options={[
              { value: NO_SELECTION, label: "No category" },
              ...categories.map((c) => ({
                value: c.id,
                textLabel: c.name,
                label: (
                  <div className="flex items-center space-x-2">
                    <div
                      aria-hidden="true"
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <span>{c.name}</span>
                  </div>
                ),
              })),
            ]}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-project`}>Project</Label>
          <ResponsiveSelect
            id={`${idPrefix}-project`}
            className="w-full"
            value={project}
            onValueChange={onProjectChange}
            options={[
              { value: NO_SELECTION, label: "No project" },
              ...projects.map((p) => ({
                value: p.id,
                textLabel: `${p.name} (${p.client})`,
                label: (
                  <div className="flex flex-col">
                    <span>{p.name}</span>
                    <span className="text-sm text-muted-foreground">{p.client}</span>
                  </div>
                ),
              })),
            ]}
          />
        </div>
      </div>
    </div>
  );
};
