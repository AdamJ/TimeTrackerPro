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
  { value: "oldest", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
  { value: "title", label: "Title (A–Z)" },
];

export interface FilterOption {
  value: string;
  label: string;
}

interface KanbanBoardControlsProps {
  sortBy: TaskSortOption;
  filters: TaskBoardFilters;
  projectOptions: FilterOption[];
  clientOptions: FilterOption[];
  categoryOptions: FilterOption[];
  hasActiveFilters: boolean;
  visibleCount: number;
  totalCount: number;
  onSortChange: (value: TaskSortOption) => void;
  onFilterChange: (key: keyof TaskBoardFilters, value: string) => void;
  onClearFilters: () => void;
}

function withAll(options: FilterOption[], allLabel: string): ResponsiveSelectOption[] {
  return [{ value: "all", label: allLabel }, ...options];
}

export const KanbanBoardControls: React.FC<KanbanBoardControlsProps> = ({
  sortBy,
  filters,
  projectOptions,
  clientOptions,
  categoryOptions,
  hasActiveFilters,
  visibleCount,
  totalCount,
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
        options={withAll(projectOptions, "All projects")}
        aria-label="Filter by project"
        className="w-[160px]"
      />
      <ResponsiveSelect
        value={filters.client}
        onValueChange={(value) => onFilterChange("client", value)}
        options={withAll(clientOptions, "All clients")}
        aria-label="Filter by client"
        className="w-[160px]"
      />
      <ResponsiveSelect
        value={filters.category}
        onValueChange={(value) => onFilterChange("category", value)}
        options={withAll(categoryOptions, "All categories")}
        aria-label="Filter by category"
        className="w-[160px]"
      />
      {hasActiveFilters && (
        <>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            Showing {visibleCount} of {totalCount}
          </span>
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="w-3 h-3 mr-1" />
            Clear filters
          </Button>
        </>
      )}
    </div>
  );
};
