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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { TaskCategory } from "@/config/categories";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { toast } from "@/hooks/use-toast";

interface CategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  category?: TaskCategory;
}

const predefinedColors = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6B7280",
  "#EC4899",
];

const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  description: z.string().trim(),
  color: z.string().min(1, "Color is required"),
  isBillable: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

const defaultFormValues: CategoryFormValues = {
  name: "",
  description: "",
  color: "#3B82F6",
  isBillable: true,
};

export const CategorySheet: React.FC<CategorySheetProps> = ({
  open,
  onOpenChange,
  mode,
  category,
}) => {
  const { addCategory, updateCategory, forceSyncToDatabase } = useTimeTracking();

  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    mode: "onBlur",
    defaultValues: defaultFormValues,
  });

  const colorValue = form.watch("color");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && category) {
      form.reset({
        name: category.name,
        description: category.description || "",
        color: category.color,
        isBillable: category.isBillable !== false,
      });
    } else {
      form.reset(defaultFormValues);
    }
    setIsSaving(false);
  }, [open, mode, category, form]);

  const onSubmit = async (values: CategoryFormValues) => {
    const data = {
      name: values.name,
      description: values.description || undefined,
      color: values.color,
      isBillable: values.isBillable,
    };

    setIsSaving(true);
    try {
      if (mode === "add") {
        addCategory(data);
        toast({
          title: "Category added",
          description: `"${values.name}" has been added.`,
        });
      } else if (mode === "edit" && category) {
        updateCategory(category.id, data);
        toast({
          title: "Category updated",
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
            {mode === "add" ? "Add Category" : "Edit Category"}
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
                    Category Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter category name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter category description (optional)"
                      className="min-h-[80px] resize-none"
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
                  <FormLabel>Category Color</FormLabel>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <FormControl>
                        <Input
                          type="color"
                          className="w-16 h-10"
                          {...field}
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">{colorValue}</span>
                      <div
                        className="w-8 h-8 rounded-full border-2 border-border"
                        style={{ backgroundColor: colorValue }}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground w-full">
                        Quick colors:
                      </span>
                      {predefinedColors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => field.onChange(c)}
                          aria-label={`Set color to ${c}`}
                          aria-pressed={colorValue === c}
                          className="w-11 h-11 flex items-center justify-center rounded-full"
                        >
                          <span
                            aria-hidden="true"
                            className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${
                              colorValue === c ? "border-foreground" : "border-border"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isBillable"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        id="category-billable"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        aria-describedby="category-billable-hint"
                      />
                    </FormControl>
                    <Label htmlFor="category-billable" className="text-sm font-medium">
                      Billable category
                    </Label>
                    <span id="category-billable-hint" className="text-xs text-muted-foreground">
                      (Tasks in this category can generate revenue)
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
