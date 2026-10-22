import React, { useMemo } from "react";
import { PlannedTask, PlannedTaskStatus } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { TaskSortOption, useTaskBoardView } from "@/hooks/useTaskBoardView";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanBoardControls } from "@/components/KanbanBoardControls";

const COLUMNS: { status: PlannedTaskStatus; title: string }[] = [
  { status: "todo", title: "To Do" },
  { status: "in_progress", title: "In Progress" },
  { status: "blocked", title: "Blocked" },
  { status: "done", title: "Done" },
];

function uniqueSorted(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function sortTasks(tasks: PlannedTask[], sortBy: TaskSortOption) {
  const sorted = [...tasks];
  switch (sortBy) {
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "newest":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "oldest":
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    default:
      return sorted.sort(
        (a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt),
      );
  }
}

export const KanbanBoard: React.FC = () => {
  const { plannedTasks, isDayStarted, isDayStale } = useTimeTracking();
  const {
    sortBy,
    filters,
    hasActiveFilters,
    setSortBy,
    setFilter,
    clearFilters,
  } = useTaskBoardView();

  const projectOptions = useMemo(
    () => uniqueSorted(plannedTasks.map((t) => t.project)),
    [plannedTasks],
  );
  const clientOptions = useMemo(
    () => uniqueSorted(plannedTasks.map((t) => t.client)),
    [plannedTasks],
  );
  const categoryOptions = useMemo(
    () => uniqueSorted(plannedTasks.map((t) => t.category)),
    [plannedTasks],
  );

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

  return (
    <>
      <KanbanBoardControls
        sortBy={sortBy}
        filters={filters}
        projectOptions={projectOptions}
        clientOptions={clientOptions}
        categoryOptions={categoryOptions}
        hasActiveFilters={hasActiveFilters}
        onSortChange={setSortBy}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(({ status, title }) => (
          <KanbanColumn
            key={status}
            status={status}
            title={title}
            tasks={tasksByStatus(status)}
            isDayStarted={isDayStarted}
            isDayStale={isDayStale}
          />
        ))}
      </div>
    </>
  );
};
