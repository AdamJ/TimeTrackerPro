import { useCallback, useState } from "react";

export type TaskSortOption = "priority" | "title" | "newest" | "oldest";

export interface TaskBoardFilters {
  project: string;
  client: string;
  category: string;
}

export interface TaskBoardViewState {
  sortBy: TaskSortOption;
  filters: TaskBoardFilters;
}

const STORAGE_KEY = "timetracker_task_board_view";

const DEFAULT_STATE: TaskBoardViewState = {
  sortBy: "priority",
  filters: { project: "all", client: "all", category: "all" },
};

function readState(): TaskBoardViewState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      sortBy: parsed.sortBy ?? DEFAULT_STATE.sortBy,
      filters: { ...DEFAULT_STATE.filters, ...parsed.filters },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

// View-only state (sort + filter choices for the Task board). Persisted to
// localStorage, never synced to Supabase — this is a per-browser UI
// preference, not app data.
export function useTaskBoardView() {
  const [state, setState] = useState<TaskBoardViewState>(readState);

  const persist = useCallback((next: TaskBoardViewState) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage unavailable; view choice won't persist across reloads
    }
  }, []);

  const setSortBy = useCallback(
    (sortBy: TaskSortOption) => persist({ ...state, sortBy }),
    [state, persist],
  );

  const setFilter = useCallback(
    (key: keyof TaskBoardFilters, value: string) =>
      persist({ ...state, filters: { ...state.filters, [key]: value } }),
    [state, persist],
  );

  const clearFilters = useCallback(
    () => persist({ ...state, filters: DEFAULT_STATE.filters }),
    [state, persist],
  );

  const hasActiveFilters =
    state.filters.project !== "all" ||
    state.filters.client !== "all" ||
    state.filters.category !== "all";

  return {
    sortBy: state.sortBy,
    filters: state.filters,
    hasActiveFilters,
    setSortBy,
    setFilter,
    clearFilters,
  };
}
