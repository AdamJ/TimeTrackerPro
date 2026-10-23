import { describe, it, expect } from "vitest";
import { getQuarterEndDate, resolveInitiativeDeadline, isDeadlineBeforeCreation } from "./initiativeUtils";
import type { Initiative } from "@/contexts/TimeTrackingContext";

describe("getQuarterEndDate", () => {
  it("returns Mar 31 for Q1", () => {
    const d = getQuarterEndDate(1, 2027);
    expect(d.getUTCFullYear()).toBe(2027);
    expect(d.getUTCMonth()).toBe(2); // 0-indexed: March
    expect(d.getUTCDate()).toBe(31);
  });

  it("returns Dec 31 for Q4", () => {
    const d = getQuarterEndDate(4, 2026);
    expect(d.getUTCMonth()).toBe(11);
    expect(d.getUTCDate()).toBe(31);
  });
});

describe("resolveInitiativeDeadline", () => {
  const base: Initiative = {
    id: "i1", projectId: "p1", name: "n", goal: "g",
    status: "not_started", deadlineType: "date",
    createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z"
  };

  it("resolves a date deadline directly", () => {
    const result = resolveInitiativeDeadline({ ...base, deadlineDate: "2026-12-15" });
    expect(result?.toISOString().slice(0, 10)).toBe("2026-12-15");
  });

  it("resolves a date deadline to the exact local calendar day entered, not a day earlier", () => {
    // Regression: new Date("2026-12-15") is UTC midnight, which reads back as
    // Dec 14 in any timezone west of UTC (e.g. America/New_York). The deadline
    // must land on local Dec 15, not shift backward.
    const result = resolveInitiativeDeadline({ ...base, deadlineDate: "2026-12-15" });
    expect(result?.getFullYear()).toBe(2026);
    expect(result?.getMonth()).toBe(11);
    expect(result?.getDate()).toBe(15);
  });

  it("resolves a quarter deadline to that quarter's end date", () => {
    const result = resolveInitiativeDeadline({
      ...base, deadlineType: "quarter", deadlineQuarter: 1, deadlineYear: 2027
    });
    expect(result?.getUTCMonth()).toBe(2);
    expect(result?.getUTCDate()).toBe(31);
  });

  it("returns null for a quarter deadline missing its year", () => {
    const result = resolveInitiativeDeadline({
      ...base, deadlineType: "quarter", deadlineQuarter: 1, deadlineYear: undefined
    });
    expect(result).toBeNull();
  });

  it("returns null for a quarter deadline missing its quarter", () => {
    const result = resolveInitiativeDeadline({
      ...base, deadlineType: "quarter", deadlineQuarter: undefined, deadlineYear: 2027
    });
    expect(result).toBeNull();
  });

  it("returns null for a date deadline missing its date", () => {
    const result = resolveInitiativeDeadline({ ...base, deadlineDate: undefined });
    expect(result).toBeNull();
  });
});

describe("isDeadlineBeforeCreation", () => {
  it("is true when the deadline falls before the creation date", () => {
    expect(isDeadlineBeforeCreation("2026-10-20T00:00:00.000Z", new Date("2026-10-10"))).toBe(true);
  });

  it("is false when the deadline is on or after the creation date", () => {
    expect(isDeadlineBeforeCreation("2026-10-20T00:00:00.000Z", new Date("2026-10-20"))).toBe(false);
    expect(isDeadlineBeforeCreation("2026-10-20T00:00:00.000Z", new Date("2026-11-01"))).toBe(false);
  });

  it("does not reject today's local date as a deadline (day-granularity, not instant, comparison)", () => {
    // Regression: comparing raw instants rejected "today" in any timezone west
    // of UTC, since a same-day UTC-midnight deadline is numerically earlier
    // than "now" on that same calendar day.
    const createdAt = new Date().toISOString();
    const now = new Date(createdAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayLocalIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const todayAsResolvedDeadline = resolveInitiativeDeadline({
      id: "i", projectId: "p", name: "n", goal: "g", status: "not_started",
      deadlineType: "date", deadlineDate: todayLocalIso,
      createdAt, updatedAt: createdAt
    })!;
    expect(isDeadlineBeforeCreation(createdAt, todayAsResolvedDeadline)).toBe(false);
  });
});
