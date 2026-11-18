import React from "react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveSelect,
  ResponsiveSelectOption,
} from "@/components/ui/responsive-select";
import { X } from "lucide-react";
import {
  DoneRange,
  TaskBoardFilters,
  TaskSortOption,
} from "@/hooks/useTaskBoardView";

const SORT_OPTIONS: ResponsiveSelectOption[] = [
  { value: "oldest", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
  { value: "title", label: "Title (A–Z)" },
];

const DONE_RANGE_OPTIONS: ResponsiveSelectOption[] = [
  { value: "7d", label: "Done: last 7 days" },
  { value: "30d", label: "Done: last 30 days" },
  { value: "all", label: "Done: all" },
  { value: "hide", label: "Done: hidden" },
];

export interface FilterOption {
  value: string;
  label: string;
}

interface KanbanBoardControlsProps {
  sortBy: TaskSortOption;
  doneRange: DoneRange;
  filters: TaskBoardFilters;
  projectOptions: FilterOption[];
  clientOptions: FilterOption[];
  categoryOptions: FilterOption[];
  hasActiveFilters: boolean;
  visibleCount: number;
  totalCount: number;
  onSortChange: (value: TaskSortOption) => void;
  onDoneRangeChange: (value: DoneRange) => void;
  onFilterChange: (key: keyof TaskBoardFilters, value: string) => void;
  onClearFilters: () => void;
}

function withAll(options: FilterOption[], allLabel: string): ResponsiveSelectOption[] {
  return [{ value: "all", label: allLabel }, ...options];
}

export const KanbanBoardControls: React.FC<KanbanBoardControlsProps> = ({
  sortBy,
  doneRange,
  filters,
  projectOptions,
  clientOptions,
  categoryOptions,
  hasActiveFilters,
  visibleCount,
  totalCount,
  onSortChange,
  onDoneRangeChange,
  onFilterChange,
  onClearFilters,
}) => {
  return (
    <div className="mb-4 grid grid-cols-2 items-center gap-2 md:flex md:flex-wrap">
      <ResponsiveSelect
        value={sortBy}
        onValueChange={(value) => onSortChange(value as TaskSortOption)}
        options={SORT_OPTIONS}
        aria-label="Sort tasks by"
        className="w-full md:w-[160px]"
      />
      <ResponsiveSelect
        value={filters.project}
        onValueChange={(value) => onFilterChange("project", value)}
        options={withAll(projectOptions, "All projects")}
        aria-label="Filter by project"
        className="w-full md:w-[160px]"
      />
      <ResponsiveSelect
        value={filters.client}
        onValueChange={(value) => onFilterChange("client", value)}
        options={withAll(clientOptions, "All clients")}
        aria-label="Filter by client"
        className="w-full md:w-[160px]"
      />
      <ResponsiveSelect
        value={filters.category}
        onValueChange={(value) => onFilterChange("category", value)}
        options={withAll(categoryOptions, "All categories")}
        aria-label="Filter by category"
        className="w-full md:w-[160px]"
      />
      <ResponsiveSelect
        value={doneRange}
        onValueChange={(value) => onDoneRangeChange(value as DoneRange)}
        options={DONE_RANGE_OPTIONS}
        aria-label="Show completed tasks"
        className="w-full md:w-[180px]"
      />
      {hasActiveFilters && (
        <>
          <span className="col-span-2 text-sm text-muted-foreground md:col-span-1" aria-live="polite">
            Showing {visibleCount} of {totalCount}
          </span>
          <Button variant="ghost" size="sm" className="col-span-2 md:col-span-1" onClick={onClearFilters}>
            <X className="w-3 h-3 mr-1" />
            Clear filters
          </Button>
        </>
      )}
    </div>
  );
};
