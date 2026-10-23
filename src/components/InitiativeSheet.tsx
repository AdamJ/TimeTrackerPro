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
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2 } from "lucide-react";
import { Initiative, InitiativeStatus, InitiativeDeadlineType } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import { getQuarterEndDate, isDeadlineBeforeCreation, parseLocalDate } from "@/utils/initiativeUtils";

interface InitiativeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  projectId: string;
  initiative?: Initiative;
}

const STATUS_OPTIONS: { value: InitiativeStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const QUARTER_OPTIONS = [1, 2, 3, 4].map((q) => ({ value: String(q), label: `Q${q}` }));

export const InitiativeSheet: React.FC<InitiativeSheetProps> = ({
  open,
  onOpenChange,
  mode,
  projectId,
  initiative,
}) => {
  const { addInitiative, updateInitiative, deleteInitiative, restoreDeletedInitiative } = useTimeTracking();
  const { confirmDelete } = useUndoableDelete<Initiative>();

  const [isSaving, setIsSaving] = React.useState(false);

  const initiativeFormSchema = z
    .object({
      name: z.string().trim().min(1, "Name is required."),
      goal: z.string().trim(),
      status: z.enum(["not_started", "in_progress", "done", "blocked"]),
      deadlineType: z.enum(["date", "quarter"]),
      deadlineDate: z.string().trim(),
      deadlineQuarter: z.string().trim(),
      deadlineYear: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      if (values.deadlineType === "date") {
        if (!values.deadlineDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Deadline date is required.",
            path: ["deadlineDate"],
          });
        }
      } else {
        if (!values.deadlineQuarter || !values.deadlineYear) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Choose a quarter and a year.",
            path: ["deadlineQuarter"],
          });
        }
        if (values.deadlineYear && !/^\d{4}$/.test(values.deadlineYear)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter a 4-digit year.",
            path: ["deadlineYear"],
          });
        }
      }

      const createdAt = initiative?.createdAt ?? new Date().toISOString();
      let deadline: Date | null = null;
      if (values.deadlineType === "date") {
        deadline = values.deadlineDate ? parseLocalDate(values.deadlineDate) : null;
      } else {
        const quarter = Number(values.deadlineQuarter);
        const year = Number(values.deadlineYear);
        const validYear = /^\d{4}$/.test(values.deadlineYear);
        deadline = quarter && validYear ? getQuarterEndDate(quarter, year) : null;
      }
      if (deadline && isDeadlineBeforeCreation(createdAt, deadline)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deadline must be on or after the initiative's creation date.",
          path: [values.deadlineType === "date" ? "deadlineDate" : "deadlineYear"],
        });
      }
    });

  type InitiativeFormValues = z.infer<typeof initiativeFormSchema>;

  const defaultFormValues: InitiativeFormValues = {
    name: "",
    goal: "",
    status: "not_started",
    deadlineType: "date",
    deadlineDate: "",
    deadlineQuarter: "",
    deadlineYear: "",
  };

  const form = useForm<InitiativeFormValues>({
    resolver: zodResolver(initiativeFormSchema),
    mode: "onSubmit",
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initiative) {
      form.reset({
        name: initiative.name,
        goal: initiative.goal,
        status: initiative.status,
        deadlineType: initiative.deadlineType,
        deadlineDate: initiative.deadlineDate ?? "",
        deadlineQuarter: initiative.deadlineQuarter ? String(initiative.deadlineQuarter) : "",
        deadlineYear: initiative.deadlineYear ? String(initiative.deadlineYear) : "",
      });
    } else {
      form.reset(defaultFormValues);
    }
    setIsSaving(false);
    // defaultFormValues is a fresh object literal each render; only `open`/`mode`/`initiative` should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initiative, form]);

  const deadlineType = form.watch("deadlineType");

  const handleDelete = () => {
    if (!initiative) return;
    deleteInitiative(initiative.id);
    confirmDelete(initiative, restoreDeletedInitiative, {
      title: "Initiative deleted",
      description: `"${initiative.name}" has been deleted.`,
    });
    onOpenChange(false);
  };

  const onSubmit = async (values: InitiativeFormValues) => {
    const deadlineFields: Pick<Initiative, "deadlineType" | "deadlineDate" | "deadlineQuarter" | "deadlineYear"> =
      values.deadlineType === "date"
        ? { deadlineType: "date", deadlineDate: values.deadlineDate || undefined, deadlineQuarter: undefined, deadlineYear: undefined }
        : {
            deadlineType: "quarter",
            deadlineDate: undefined,
            deadlineQuarter: values.deadlineQuarter ? Number(values.deadlineQuarter) : undefined,
            deadlineYear: values.deadlineYear ? Number(values.deadlineYear) : undefined,
          };

    setIsSaving(true);
    try {
      if (mode === "add") {
        addInitiative({
          projectId,
          name: values.name,
          goal: values.goal,
          ...deadlineFields,
        });
      } else if (mode === "edit" && initiative) {
        updateInitiative(initiative.id, {
          name: values.name,
          goal: values.goal,
          status: values.status,
          ...deadlineFields,
        });
      }
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
            {mode === "add" ? "Add Initiative" : "Edit Initiative"}
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
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Redesign onboarding" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What outcome does this initiative commit to?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <ResponsiveSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={STATUS_OPTIONS}
                      disabled={mode === "add"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant={deadlineType === "date" ? "default" : "outline"}
                aria-pressed={deadlineType === "date"}
                onClick={() => form.setValue("deadlineType", "date" as InitiativeDeadlineType)}
              >
                Specific date
              </Button>
              <Button
                type="button"
                variant={deadlineType === "quarter" ? "default" : "outline"}
                aria-pressed={deadlineType === "quarter"}
                onClick={() => form.setValue("deadlineType", "quarter" as InitiativeDeadlineType)}
              >
                Quarter
              </Button>
            </div>

            {deadlineType === "date" ? (
              <FormField
                control={form.control}
                name="deadlineDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="deadlineQuarter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline quarter</FormLabel>
                      <FormControl>
                        <ResponsiveSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          options={QUARTER_OPTIONS}
                          placeholder="Quarter"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deadlineYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline year</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="2027" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <SheetFooter className="flex gap-2 pt-2">
              {mode === "edit" && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:text-secondary bg-transparent hover:bg-destructive mr-auto"
                  onClick={handleDelete}
                  disabled={isSaving}
                >
                  Delete
                </Button>
              )}
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
