import React from "react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveSelect,
  ResponsiveSelectOption,
} from "@/components/ui/responsive-select";
import { X } from "lucide-react";
import {
  TaskBoardFilters,
  TaskSortOption,
} from "@/hooks/useTaskBoardView";

const SORT_OPTIONS: ResponsiveSelectOption[] = [
  { value: "priority", label: "Priority" },
  { value: "title", label: "Title (A–Z)" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

interface KanbanBoardControlsProps {
  sortBy: TaskSortOption;
  filters: TaskBoardFilters;
  projectOptions: string[];
  clientOptions: string[];
  categoryOptions: string[];
  hasActiveFilters: boolean;
  onSortChange: (value: TaskSortOption) => void;
  onFilterChange: (key: keyof TaskBoardFilters, value: string) => void;
  onClearFilters: () => void;
}

function toOptions(values: string[], allLabel: string): ResponsiveSelectOption[] {
  return [
    { value: "all", label: allLabel },
    ...values.map((value) => ({ value, label: value })),
  ];
}

export const KanbanBoardControls: React.FC<KanbanBoardControlsProps> = ({
  sortBy,
  filters,
  projectOptions,
  clientOptions,
  categoryOptions,
  hasActiveFilters,
  onSortChange,
  onFilterChange,
  onClearFilters,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <ResponsiveSelect
        value={sortBy}
        onValueChange={(value) => onSortChange(value as TaskSortOption)}
        options={SORT_OPTIONS}
        aria-label="Sort tasks by"
        className="w-[160px]"
      />
      <ResponsiveSelect
        value={filters.project}
        onValueChange={(value) => onFilterChange("project", value)}
        options={toOptions(projectOptions, "All projects")}
        aria-label="Filter by project"
        className="w-[160px]"
      />
      <ResponsiveSelect
        value={filters.client}
        onValueChange={(value) => onFilterChange("client", value)}
        options={toOptions(clientOptions, "All clients")}
        aria-label="Filter by client"
        className="w-[160px]"
      />
      <ResponsiveSelect
        value={filters.category}
        onValueChange={(value) => onFilterChange("category", value)}
        options={toOptions(categoryOptions, "All categories")}
        aria-label="Filter by category"
        className="w-[160px]"
      />
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="w-3 h-3 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
};
