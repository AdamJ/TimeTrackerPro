import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2 } from "lucide-react";
import { Project } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { toast } from "@/hooks/use-toast";

interface ProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  project?: Project;
}

const projectFormSchema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
  client: z.string().trim().min(1, "Client name is required"),
  hourlyRate: z
    .string()
    .trim()
    .refine((val) => !val || !isNaN(parseFloat(val)), {
      message: "Enter a valid number",
    })
    .refine((val) => !val || parseFloat(val) >= 0, {
      message: "Hourly rate cannot be negative",
    }),
  color: z.string().min(1, "Color is required"),
  isBillable: z.boolean(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

const defaultFormValues: ProjectFormValues = {
  name: "",
  client: "",
  hourlyRate: "",
  color: "#3B82F6",
  isBillable: true,
};

export const ProjectSheet: React.FC<ProjectSheetProps> = ({
  open,
  onOpenChange,
  mode,
  project,
}) => {
  const {
    clients,
    addClient,
    persistClient,
    addProject,
    updateProject,
    forceSyncToDatabase,
  } = useTimeTracking();

  const [isSaving, setIsSaving] = React.useState(false);
  const [isAddingClient, setIsAddingClient] = React.useState(false);
  const [newClientName, setNewClientName] = React.useState("");

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    mode: "onBlur",
    defaultValues: defaultFormValues,
  });

  const activeClients = clients.filter((c) => !c.archived);
  const clientValue = form.watch("client");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && project) {
      form.reset({
        name: project.name,
        client: project.client,
        hourlyRate: project.hourlyRate?.toString() ?? "",
        color: project.color || "#3B82F6",
        isBillable: project.isBillable !== false,
      });
    } else {
      form.reset(defaultFormValues);
    }
    setIsAddingClient(false);
    setNewClientName("");
    setIsSaving(false);
  }, [open, mode, project, form]);

  const handleAddClientInline = async () => {
    const trimmed = newClientName.trim();
    if (!trimmed) return;
    const created = addClient(trimmed);
    if (created) await persistClient(created);
    form.setValue("client", trimmed, { shouldValidate: true, shouldDirty: true });
    setNewClientName("");
    setIsAddingClient(false);
  };

  const onSubmit = async (values: ProjectFormValues) => {
    const data = {
      name: values.name,
      client: values.client,
      hourlyRate: values.hourlyRate ? parseFloat(values.hourlyRate) : undefined,
      color: values.color,
      isBillable: values.isBillable,
    };

    setIsSaving(true);
    try {
      if (mode === "add") {
        addProject(data);
        toast({
          title: "Project added",
          description: `"${values.name}" has been added.`,
        });
      } else if (mode === "edit" && project) {
        updateProject(project.id, data);
        toast({
          title: "Project updated",
          description: `"${values.name}" has been updated.`,
        });
      }

      await forceSyncToDatabase();
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "add" ? "Add Project" : "Edit Project"}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Project Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Client Name <span className="text-destructive">*</span>
                  </FormLabel>
                  {isAddingClient ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        autoFocus
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="New client name"
                      />
                      <Button type="button" size="sm" onClick={handleAddClientInline}>
                        Add
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsAddingClient(false);
                          setNewClientName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <FormControl>
                      <ResponsiveSelect
                        value={field.value}
                        onValueChange={(value) => {
                          if (value === "__add_new__") {
                            setIsAddingClient(true);
                            return;
                          }
                          field.onChange(value);
                        }}
                        placeholder="Select a client"
                        options={[
                          ...activeClients.map((c) => ({ value: c.name, label: c.name })),
                          ...(clientValue && !clients.some((c) => c.name === clientValue)
                            ? [{ value: clientValue, label: `${clientValue} (unmanaged)`, disabled: true }]
                            : []),
                          { value: "__add_new__", label: "+ Add new client" },
                        ]}
                      />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly Rate ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Color</FormLabel>
                    <div className="flex items-center space-x-2">
                      <FormControl>
                        <Input
                          type="color"
                          className="w-16 h-10"
                          {...field}
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">
                        {field.value}
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isBillable"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        id="project-billable"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <Label htmlFor="project-billable" className="text-sm font-medium">
                      Billable project
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      (Tasks in this project can generate revenue)
                    </span>
                  </div>
                </FormItem>
              )}
            />

            <SheetFooter className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSaving ? "Saving..." : mode === "add" ? "Add" : "Save"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
