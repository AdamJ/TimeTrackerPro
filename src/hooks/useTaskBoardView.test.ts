import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTaskBoardView } from "@/hooks/useTaskBoardView";

const STORAGE_KEY = "timetracker_task_board_view";

describe("useTaskBoardView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to oldest-first with no filters", () => {
    const { result } = renderHook(() => useTaskBoardView());
    expect(result.current.sortBy).toBe("oldest");
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it("maps the removed priority sort from older saves to oldest-first", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sortBy: "priority", filters: { project: "Acme" } }),
    );
    const { result } = renderHook(() => useTaskBoardView());
    expect(result.current.sortBy).toBe("oldest");
    expect(result.current.filters.project).toBe("Acme");
  });

  it("applies several filter changes in one batch without losing any", () => {
    const { result } = renderHook(() => useTaskBoardView());
    act(() => {
      result.current.setFilter("project", "Acme");
      result.current.setFilter("client", "Globex");
    });
    expect(result.current.filters).toEqual({
      project: "Acme",
      client: "Globex",
      category: "all",
    });
    act(() => {
      result.current.setFilters({ project: "all", client: "all" });
    });
    expect(result.current.hasActiveFilters).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).filters.project).toBe("all");
  });
});
