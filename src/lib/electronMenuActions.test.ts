import { describe, it, expect, vi } from "vitest";
import {
  consumePendingMenuAction,
  setPendingMenuAction,
  notifyMenuAction,
  addMenuActionListener,
} from "@/lib/electronMenuActions";

describe("electronMenuActions", () => {
  it("returns false when no action is pending", () => {
    expect(consumePendingMenuAction("export")).toBe(false);
  });

  it("returns true and clears the action once consumed", () => {
    setPendingMenuAction("export");
    expect(consumePendingMenuAction("export")).toBe(true);
    expect(consumePendingMenuAction("export")).toBe(false);
  });

  it("does not match a different action than the one pending", () => {
    setPendingMenuAction("settings");
    expect(consumePendingMenuAction("new-task")).toBe(false);
    // still pending — consuming the correct action afterwards succeeds
    expect(consumePendingMenuAction("settings")).toBe(true);
  });

  it("overwrites a previously pending action", () => {
    setPendingMenuAction("export");
    setPendingMenuAction("new-task");
    expect(consumePendingMenuAction("export")).toBe(false);
    expect(consumePendingMenuAction("new-task")).toBe(true);
  });

  it("notifies a matching listener but not one for a different action", () => {
    const newTaskListener = vi.fn();
    const exportListener = vi.fn();
    const unsubscribeNewTask = addMenuActionListener("new-task", newTaskListener);
    const unsubscribeExport = addMenuActionListener("export", exportListener);

    notifyMenuAction("new-task");

    expect(newTaskListener).toHaveBeenCalledTimes(1);
    expect(exportListener).not.toHaveBeenCalled();

    unsubscribeNewTask();
    unsubscribeExport();
  });

  it("does not consume the pending-action stash", () => {
    const listener = vi.fn();
    const unsubscribe = addMenuActionListener("new-task", listener);

    notifyMenuAction("new-task");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(consumePendingMenuAction("new-task")).toBe(false);
    unsubscribe();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = addMenuActionListener("new-task", listener);
    unsubscribe();

    notifyMenuAction("new-task");

    expect(listener).not.toHaveBeenCalled();
  });
});
