import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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

export const CategorySheet: React.FC<CategorySheetProps> = ({
  open,
  onOpenChange,
  mode,
  category,
}) => {
  const { addCategory, updateCategory, forceSyncToDatabase } = useTimeTracking();

  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [isBillable, setIsBillable] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && category) {
      setName(category.name);
      setDescription(category.description || "");
      setColor(category.color);
      setIsBillable(category.isBillable !== false);
    } else {
      setName("");
      setDescription("");
      setColor("#3B82F6");
      setIsBillable(true);
    }
    setIsSaving(false);
  }, [open, mode, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const data = {
      name: trimmed,
      description: description.trim() || undefined,
      color,
      isBillable,
    };

    setIsSaving(true);
    try {
      if (mode === "add") {
        addCategory(data);
        toast({
          title: "Category added",
          description: `"${trimmed}" has been added.`,
        });
      } else if (mode === "edit" && category) {
        updateCategory(category.id, data);
        toast({
          title: "Category updated",
          description: `"${trimmed}" has been updated.`,
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

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div>
            <Label htmlFor="category-name">
              Category Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter category name"
              required
            />
          </div>

          <div>
            <Label htmlFor="category-description">Description</Label>
            <Textarea
              id="category-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter category description (optional)"
              className="min-h-[80px] resize-none"
            />
          </div>

          <div>
            <Label htmlFor="category-color">Category Color</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Input
                  id="category-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-16 h-10"
                />
                <span className="text-sm text-muted-foreground">{color}</span>
                <div
                  className="w-8 h-8 rounded-full border-2 border-border"
                  style={{ backgroundColor: color }}
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
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${
                      color === c ? "border-foreground" : "border-border"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="category-billable"
              checked={isBillable}
              onCheckedChange={(checked) => setIsBillable(checked === true)}
            />
            <Label htmlFor="category-billable" className="text-sm font-medium">
              Billable category
            </Label>
            <span className="text-xs text-muted-foreground">
              (Tasks in this category can generate revenue)
            </span>
          </div>

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
      </SheetContent>
    </Sheet>
  );
};
