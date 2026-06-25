import { describe, it, expect } from "vitest";
import { consumePendingMenuAction, setPendingMenuAction } from "@/lib/electronMenuActions";

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
});
