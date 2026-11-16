import React, { useEffect, useMemo } from "react";
import { PlannedTask, PlannedTaskStatus } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import {
  TaskBoardFilters,
  TaskSortOption,
  useTaskBoardView,
} from "@/hooks/useTaskBoardView";
import { KanbanColumn } from "@/components/KanbanColumn";
import {
  FilterOption,
  KanbanBoardControls,
} from "@/components/KanbanBoardControls";
import { Button } from "@/components/ui/button";

const COLUMNS: { status: PlannedTaskStatus; title: string }[] = [
  { status: "todo", title: "To Do" },
  { status: "in_progress", title: "In Progress" },
  { status: "blocked", title: "Blocked" },
  { status: "done", title: "Done" },
];

function uniqueValues(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v)));
}

function toFilterOptions(
  values: string[],
  getLabel: (value: string) => string = (value) => value,
): FilterOption[] {
  return values
    .map((value) => ({ value, label: getLabel(value) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function sortTasks(tasks: PlannedTask[], sortBy: TaskSortOption) {
  const sorted = [...tasks];
  switch (sortBy) {
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "newest":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default:
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

export const KanbanBoard: React.FC = () => {
  const { plannedTasks, categories, loading, isDayStarted, isDayStale } =
    useTimeTracking();
  const {
    sortBy,
    filters,
    hasActiveFilters,
    setSortBy,
    setFilter,
    setFilters,
    clearFilters,
  } = useTaskBoardView();

  const projectOptions = useMemo(
    () => toFilterOptions(uniqueValues(plannedTasks.map((t) => t.project))),
    [plannedTasks],
  );
  const clientOptions = useMemo(
    () => toFilterOptions(uniqueValues(plannedTasks.map((t) => t.client))),
    [plannedTasks],
  );
  const categoryOptions = useMemo(
    () =>
      toFilterOptions(
        uniqueValues(plannedTasks.map((t) => t.category)),
        (id) => categories.find((c) => c.id === id)?.name ?? id,
      ),
    [plannedTasks, categories],
  );

  // A saved filter can outlive the last task that matched it (task deleted,
  // project renamed). Drop it so the board doesn't silently show nothing.
  useEffect(() => {
    if (loading) return;
    const optionsByKey: Record<keyof TaskBoardFilters, FilterOption[]> = {
      project: projectOptions,
      client: clientOptions,
      category: categoryOptions,
    };
    const stale: Partial<TaskBoardFilters> = {};
    (Object.keys(optionsByKey) as (keyof TaskBoardFilters)[]).forEach((key) => {
      const value = filters[key];
      if (value !== "all" && !optionsByKey[key].some((o) => o.value === value)) {
        stale[key] = "all";
      }
    });
    if (Object.keys(stale).length > 0) setFilters(stale);
  }, [loading, filters, projectOptions, clientOptions, categoryOptions, setFilters]);

  const visibleTasks = useMemo(
    () =>
      plannedTasks.filter(
        (t) =>
          (filters.project === "all" || t.project === filters.project) &&
          (filters.client === "all" || t.client === filters.client) &&
          (filters.category === "all" || t.category === filters.category),
      ),
    [plannedTasks, filters],
  );

  const tasksByStatus = (status: PlannedTaskStatus) =>
    sortTasks(visibleTasks.filter((t) => t.status === status), sortBy);

  const filteredOutEverything =
    hasActiveFilters && visibleTasks.length === 0 && plannedTasks.length > 0;

  return (
    <>
      <KanbanBoardControls
        sortBy={sortBy}
        filters={filters}
        projectOptions={projectOptions}
        clientOptions={clientOptions}
        categoryOptions={categoryOptions}
        hasActiveFilters={hasActiveFilters}
        visibleCount={visibleTasks.length}
        totalCount={plannedTasks.length}
        onSortChange={setSortBy}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
      />
      {filteredOutEverything && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 mb-4 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
        >
          <span>No tasks match the current filters.</span>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(({ status, title }) => (
          <KanbanColumn
            key={status}
            status={status}
            title={title}
            tasks={tasksByStatus(status)}
            isDayStarted={isDayStarted}
            isDayStale={isDayStale}
            emptyMessage={hasActiveFilters ? "No matching tasks" : "No tasks"}
          />
        ))}
      </div>
    </>
  );
};
