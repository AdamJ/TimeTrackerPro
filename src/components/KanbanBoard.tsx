import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PlannedTask, PlannedTaskStatus } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import {
  DoneRange,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/util";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHorizontalSwipe } from "@/hooks/useHorizontalSwipe";

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

const DONE_RANGE_DAYS: Record<DoneRange, number> = {
  hide: 0,
  "7d": 7,
  "30d": 30,
  all: Infinity,
};

// Tasks carry no completion timestamp, so the last update stands in for it: a
// task moved to Done isn't touched again unless someone edits it. An unreadable
// date counts as recent so a bad value never makes a task vanish.
function isHiddenByDoneRange(task: PlannedTask, range: DoneRange, now: number) {
  if (task.status !== "done" || range === "all") return false;
  if (range === "hide") return true;
  const updated = Date.parse(task.updatedAt);
  if (Number.isNaN(updated)) return false;
  return now - updated > DONE_RANGE_DAYS[range] * 86_400_000;
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
  const isMobile = useIsMobile();
  const {
    sortBy,
    filters,
    activeStatus,
    doneRange,
    setActiveStatus,
    hasActiveFilters,
    setSortBy,
    setDoneRange,
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

  const matchingTasks = useMemo(
    () =>
      plannedTasks.filter(
        (t) =>
          (filters.project === "all" || t.project === filters.project) &&
          (filters.client === "all" || t.client === filters.client) &&
          (filters.category === "all" || t.category === filters.category),
      ),
    [plannedTasks, filters],
  );

  const { visibleTasks, hiddenDoneCount } = useMemo(() => {
    const now = Date.now();
    const visible = matchingTasks.filter(
      (t) => !isHiddenByDoneRange(t, doneRange, now),
    );
    return {
      visibleTasks: visible,
      hiddenDoneCount: matchingTasks.length - visible.length,
    };
  }, [matchingTasks, doneRange]);

  const tasksByStatus = (status: PlannedTaskStatus) =>
    sortTasks(visibleTasks.filter((t) => t.status === status), sortBy);

  // Phones show one status column at a time (remembered across visits); a
  // horizontal swipe on the column steps to the neighbouring status.
  const activeIndex = COLUMNS.findIndex((c) => c.status === activeStatus);
  const goToColumn = useCallback(
    (index: number) => {
      const target = COLUMNS[index];
      if (target) setActiveStatus(target.status);
    },
    [setActiveStatus],
  );
  // Direction of the last tab change, so the new column slides in from the side
  // the user is heading towards. 0 until the first change, so nothing animates
  // on page load. Adjusting state during render is React's pattern for this.
  const [previousIndex, setPreviousIndex] = useState(activeIndex);
  const [slideDirection, setSlideDirection] = useState<-1 | 0 | 1>(0);
  if (previousIndex !== activeIndex) {
    setPreviousIndex(activeIndex);
    setSlideDirection(activeIndex > previousIndex ? 1 : -1);
  }
  const swipeHandlers = useHorizontalSwipe({
    onSwipeLeft: () => goToColumn(activeIndex + 1),
    onSwipeRight: () => goToColumn(activeIndex - 1),
  });

  const filteredOutEverything =
    hasActiveFilters && matchingTasks.length === 0 && plannedTasks.length > 0;

  const controls = (
    <KanbanBoardControls
      sortBy={sortBy}
      doneRange={doneRange}
      filters={filters}
      projectOptions={projectOptions}
      clientOptions={clientOptions}
      categoryOptions={categoryOptions}
      hasActiveFilters={hasActiveFilters}
      visibleCount={visibleTasks.length}
      totalCount={plannedTasks.length}
      onSortChange={setSortBy}
      onDoneRangeChange={setDoneRange}
      onFilterChange={setFilter}
      onClearFilters={clearFilters}
    />
  );

  const filteredOutBanner = filteredOutEverything && (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 mb-4 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
    >
      <span>No tasks match the current filters.</span>
      <Button variant="outline" size="sm" onClick={clearFilters}>
        Clear filters
      </Button>
    </div>
  );

  const emptyMessage = hasActiveFilters ? "No matching tasks" : "No tasks";

  if (isMobile) {
    return (
      <Tabs
        value={activeStatus}
        onValueChange={(value) => setActiveStatus(value as PlannedTaskStatus)}
      >
        <TabsList
          aria-label="Task status"
          className="mb-4 grid h-auto w-full grid-cols-4"
        >
          {COLUMNS.map(({ status, title }) => (
            <TabsTrigger
              key={status}
              value={status}
              className="flex-col gap-0.5 whitespace-normal px-1 text-center text-xs leading-tight"
            >
              <span>{title}</span>
              <span className="tabular-nums text-muted-foreground">
                {tasksByStatus(status).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        {controls}
        {filteredOutBanner}
        {/* pan-y hands horizontal gestures to the swipe handlers; the min height
            keeps a near-empty column easy to swipe. */}
        <div className="min-h-[50svh] touch-pan-y overflow-x-clip" {...swipeHandlers}>
          {COLUMNS.map(({ status, title }) => (
            <TabsContent
              key={status}
              value={status}
              className={cn(
                "mt-0",
                slideDirection !== 0 &&
                  "animate-in fade-in-0 duration-200 ease-out motion-reduce:animate-none",
                slideDirection === 1 && "slide-in-from-right-8",
                slideDirection === -1 && "slide-in-from-left-8",
              )}
            >
              <KanbanColumn
                status={status}
                title={title}
                tasks={tasksByStatus(status)}
                isDayStarted={isDayStarted}
                isDayStale={isDayStale}
                emptyMessage={emptyMessage}
                hiddenCount={status === "done" ? hiddenDoneCount : 0}
                onShowAll={() => setDoneRange("all")}
              />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    );
  }

  return (
    <>
      {controls}
      {filteredOutBanner}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(({ status, title }) => (
          <KanbanColumn
            key={status}
            status={status}
            title={title}
            tasks={tasksByStatus(status)}
            isDayStarted={isDayStarted}
            isDayStale={isDayStale}
            emptyMessage={emptyMessage}
            hiddenCount={status === "done" ? hiddenDoneCount : 0}
            onShowAll={() => setDoneRange("all")}
          />
        ))}
      </div>
    </>
  );
};
