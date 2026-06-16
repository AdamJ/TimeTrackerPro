import { describe, it, expect } from "vitest";
import {
  getDayStats,
  getHoursWorkedForDay,
  getRevenueForDay,
  getBillableHoursForDay,
  getNonBillableHoursForDay,
  getTotalHoursForPeriod,
  getRevenueForPeriod
} from "@/utils/calculationUtils";
import type { DayRecord, Project } from "@/contexts/TimeTrackingContext";
import type { TaskCategory } from "@/config/categories";

// Shared fixtures
const project: Project = {
  id: "p1",
  name: "Project A",
  client: "Client X",
  hourlyRate: 100,
  isBillable: true
};
const nonBillableProject: Project = {
  id: "p2",
  name: "Internal",
  client: "Self",
  hourlyRate: 50,
  isBillable: false
};
const category: TaskCategory = {
  id: "cat1",
  name: "Development",
  color: "#000",
  isBillable: true
};
const nonBillableCategory: TaskCategory = {
  id: "cat2",
  name: "Admin",
  color: "#999",
  isBillable: false
};

function makeDay(overrides: Partial<DayRecord> = {}): DayRecord {
  return {
    id: "day1",
    date: "2024-12-01",
    totalDuration: 3_600_000,
    startTime: new Date("2024-12-01T09:00:00Z"),
    endTime: new Date("2024-12-01T10:00:00Z"),
    tasks: [
      {
        id: "t1",
        title: "Task 1",
        startTime: new Date("2024-12-01T09:00:00Z"),
        endTime: new Date("2024-12-01T10:00:00Z"),
        duration: 3_600_000, // 1 hour
        project: "Project A",
        client: "Client X",
        category: "cat1"
      }
    ],
    ...overrides
  };
}

describe("calculationUtils", () => {
  describe("getHoursWorkedForDay", () => {
    it("sums task durations and converts to hours", () => {
      expect(getHoursWorkedForDay(makeDay())).toBe(1);
    });

    it("returns 0 when tasks have no duration", () => {
      const day = makeDay({
        tasks: [{ id: "t1", title: "T1", startTime: new Date(), duration: undefined }]
      });
      expect(getHoursWorkedForDay(day)).toBe(0);
    });

    it("sums multiple tasks", () => {
      const day = makeDay({
        tasks: [
          { id: "t1", title: "T1", startTime: new Date(), duration: 1_800_000 }, // 30 min
          { id: "t2", title: "T2", startTime: new Date(), duration: 1_800_000 }  // 30 min
        ]
      });
      expect(getHoursWorkedForDay(day)).toBe(1);
    });
  });

  describe("getRevenueForDay", () => {
    it("returns hourlyRate × hours for billable task", () => {
      expect(getRevenueForDay(makeDay(), [project], [category])).toBe(100);
    });

    it("returns 0 for non-billable project", () => {
      const day = makeDay({
        tasks: [{
          id: "t1", title: "T1", startTime: new Date(),
          duration: 3_600_000, project: "Internal", client: "Self", category: "cat1"
        }]
      });
      expect(getRevenueForDay(day, [nonBillableProject], [category])).toBe(0);
    });

    it("returns 0 for non-billable category", () => {
      const day = makeDay({
        tasks: [{
          id: "t1", title: "T1", startTime: new Date(),
          duration: 3_600_000, project: "Project A", client: "Client X", category: "cat2"
        }]
      });
      expect(getRevenueForDay(day, [project], [nonBillableCategory])).toBe(0);
    });

    it("returns 0 when task has no project/category", () => {
      const day = makeDay({
        tasks: [{ id: "t1", title: "T1", startTime: new Date(), duration: 3_600_000 }]
      });
      expect(getRevenueForDay(day, [project], [category])).toBe(0);
    });
  });

  describe("getBillableHoursForDay", () => {
    it("returns hours for billable tasks", () => {
      expect(getBillableHoursForDay(makeDay(), [project], [category])).toBe(1);
    });

    it("returns 0 for non-billable project", () => {
      const day = makeDay({
        tasks: [{
          id: "t1", title: "T1", startTime: new Date(),
          duration: 3_600_000, project: "Internal", client: "Self", category: "cat1"
        }]
      });
      expect(getBillableHoursForDay(day, [nonBillableProject], [category])).toBe(0);
    });
  });

  describe("getNonBillableHoursForDay", () => {
    it("returns 0 when all tasks are billable", () => {
      expect(getNonBillableHoursForDay(makeDay(), [project], [category])).toBe(0);
    });

    it("returns hours for non-billable tasks", () => {
      const day = makeDay({
        tasks: [{
          id: "t1", title: "T1", startTime: new Date(),
          duration: 3_600_000, project: "Internal", client: "Self", category: "cat1"
        }]
      });
      expect(getNonBillableHoursForDay(day, [nonBillableProject], [category])).toBe(1);
    });
  });

  describe("getDayStats", () => {
    it("returns all four stats in a single call", () => {
      const projectMap = new Map([[project.name, project]]);
      const categoryMap = new Map([[category.id, category]]);
      const stats = getDayStats(makeDay(), projectMap, categoryMap);
      expect(stats.hoursWorked).toBe(1);
      expect(stats.billableHours).toBe(1);
      expect(stats.nonBillableHours).toBe(0);
      expect(stats.revenue).toBe(100);
    });

    it("splits billable and non-billable correctly", () => {
      const day = makeDay({
        tasks: [
          { id: "t1", title: "T1", startTime: new Date(), duration: 3_600_000, project: "Project A", client: "Client X", category: "cat1" },
          { id: "t2", title: "T2", startTime: new Date(), duration: 3_600_000, project: "Internal", client: "Self", category: "cat1" }
        ]
      });
      const projectMap = new Map([[project.name, project], [nonBillableProject.name, nonBillableProject]]);
      const categoryMap = new Map([[category.id, category]]);
      const stats = getDayStats(day, projectMap, categoryMap);
      expect(stats.billableHours).toBe(1);
      expect(stats.nonBillableHours).toBe(1);
      expect(stats.revenue).toBe(100); // only billable project contributes
    });
  });

  describe("getTotalHoursForPeriod", () => {
    it("sums totalDuration for days in range", () => {
      const days: DayRecord[] = [
        { ...makeDay({ id: "d1", date: "2024-12-01", totalDuration: 3_600_000, startTime: new Date("2024-12-01T09:00:00Z") }) },
        { ...makeDay({ id: "d2", date: "2024-12-02", totalDuration: 7_200_000, startTime: new Date("2024-12-02T09:00:00Z") }) }
      ];
      const total = getTotalHoursForPeriod(
        days,
        new Date("2024-12-01T00:00:00Z"),
        new Date("2024-12-02T23:59:59Z")
      );
      expect(total).toBe(3); // 1 + 2 hours
    });

    it("excludes days outside range", () => {
      const days: DayRecord[] = [
        { ...makeDay({ id: "d1", totalDuration: 3_600_000, startTime: new Date("2024-11-30T09:00:00Z") }) },
        { ...makeDay({ id: "d2", totalDuration: 7_200_000, startTime: new Date("2024-12-01T09:00:00Z") }) }
      ];
      const total = getTotalHoursForPeriod(
        days,
        new Date("2024-12-01T00:00:00Z"),
        new Date("2024-12-31T23:59:59Z")
      );
      expect(total).toBe(2);
    });

    it("returns 0 for empty array", () => {
      expect(getTotalHoursForPeriod([], new Date(), new Date())).toBe(0);
    });
  });

  describe("getRevenueForPeriod", () => {
    it("sums revenue for billable tasks in range", () => {
      const days: DayRecord[] = [makeDay({ id: "d1", startTime: new Date("2024-12-01T09:00:00Z") })];
      const revenue = getRevenueForPeriod(
        days,
        [project],
        [category],
        new Date("2024-12-01T00:00:00Z"),
        new Date("2024-12-01T23:59:59Z")
      );
      expect(revenue).toBe(100);
    });

    it("excludes days outside range", () => {
      const days: DayRecord[] = [makeDay({ id: "d1", startTime: new Date("2024-11-30T09:00:00Z") })];
      const revenue = getRevenueForPeriod(
        days,
        [project],
        [category],
        new Date("2024-12-01T00:00:00Z"),
        new Date("2024-12-31T23:59:59Z")
      );
      expect(revenue).toBe(0);
    });
  });
});
