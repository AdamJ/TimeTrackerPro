import { useCallback, useState } from "react";
import type { PlannedTaskStatus } from "@/contexts/TimeTrackingContext";

export type TaskSortOption = "title" | "newest" | "oldest";

const SORT_OPTIONS: TaskSortOption[] = ["title", "newest", "oldest"];

/** How far back completed tasks stay on the board; older ones are hidden, not deleted. */
export type DoneRange = "hide" | "7d" | "30d" | "all";

const DONE_RANGES: DoneRange[] = ["hide", "7d", "30d", "all"];

export interface TaskBoardFilters {
  project: string;
  client: string;
  category: string;
}

const STATUSES: PlannedTaskStatus[] = ["todo", "in_progress", "blocked", "done"];

export interface TaskBoardViewState {
  sortBy: TaskSortOption;
  filters: TaskBoardFilters;
  /** Status tab shown on phones, where the board is one column at a time. */
  activeStatus: PlannedTaskStatus;
  doneRange: DoneRange;
}

const STORAGE_KEY = "timetracker_task_board_view";

export const DEFAULT_FILTERS: TaskBoardFilters = {
  project: "all",
  client: "all",
  category: "all",
};

const DEFAULT_STATE: TaskBoardViewState = {
  sortBy: "oldest",
  filters: DEFAULT_FILTERS,
  activeStatus: "todo",
  doneRange: "30d",
};

// Older saves may hold the removed "priority" sort; nothing ever set a
// non-default priority, so it always ordered oldest-first anyway.
function readSortBy(value: unknown): TaskSortOption {
  return SORT_OPTIONS.includes(value as TaskSortOption)
    ? (value as TaskSortOption)
    : DEFAULT_STATE.sortBy;
}

function readActiveStatus(value: unknown): PlannedTaskStatus {
  return STATUSES.includes(value as PlannedTaskStatus)
    ? (value as PlannedTaskStatus)
    : DEFAULT_STATE.activeStatus;
}

function readDoneRange(value: unknown): DoneRange {
  return DONE_RANGES.includes(value as DoneRange)
    ? (value as DoneRange)
    : DEFAULT_STATE.doneRange;
}

function readState(): TaskBoardViewState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      sortBy: readSortBy(parsed.sortBy),
      filters: { ...DEFAULT_FILTERS, ...parsed.filters },
      activeStatus: readActiveStatus(parsed.activeStatus),
      doneRange: readDoneRange(parsed.doneRange),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(next: TaskBoardViewState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable; view choice won't persist across reloads
  }
}

// View-only state (sort, filter, and mobile status-tab choices for the Task board). Persisted to
// localStorage, never synced to Supabase — this is a per-browser UI
// preference, not app data.
export function useTaskBoardView() {
  const [state, setState] = useState<TaskBoardViewState>(readState);

  const update = useCallback(
    (fn: (prev: TaskBoardViewState) => TaskBoardViewState) => {
      setState((prev) => {
        const next = fn(prev);
        writeState(next);
        return next;
      });
    },
    [],
  );

  const setSortBy = useCallback(
    (sortBy: TaskSortOption) => update((prev) => ({ ...prev, sortBy })),
    [update],
  );

  const setActiveStatus = useCallback(
    (activeStatus: PlannedTaskStatus) =>
      update((prev) => ({ ...prev, activeStatus })),
    [update],
  );

  const setDoneRange = useCallback(
    (doneRange: DoneRange) => update((prev) => ({ ...prev, doneRange })),
    [update],
  );

  const setFilters = useCallback(
    (changes: Partial<TaskBoardFilters>) =>
      update((prev) => ({ ...prev, filters: { ...prev.filters, ...changes } })),
    [update],
  );

  const setFilter = useCallback(
    (key: keyof TaskBoardFilters, value: string) => setFilters({ [key]: value }),
    [setFilters],
  );

  const clearFilters = useCallback(
    () => update((prev) => ({ ...prev, filters: DEFAULT_FILTERS })),
    [update],
  );

  const hasActiveFilters =
    state.filters.project !== "all" ||
    state.filters.client !== "all" ||
    state.filters.category !== "all";

  return {
    sortBy: state.sortBy,
    filters: state.filters,
    activeStatus: state.activeStatus,
    doneRange: state.doneRange,
    hasActiveFilters,
    setSortBy,
    setActiveStatus,
    setDoneRange,
    setFilter,
    setFilters,
    clearFilters,
  };
}
