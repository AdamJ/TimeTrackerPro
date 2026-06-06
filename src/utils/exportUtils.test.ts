import { describe, it, expect } from "vitest";
import { exportToCSV, exportToJSON, generateInvoiceData, parseCSVImport } from "@/utils/exportUtils";
import type { DayRecord, Project } from "@/contexts/TimeTrackingContext";
import type { TaskCategory } from "@/config/categories";

const project: Project = {
  id: "p1",
  name: "Project A",
  client: "Client X",
  hourlyRate: 100,
  isBillable: true
};
const category: TaskCategory = { id: "cat1", name: "Development", color: "#000", isBillable: true };

function makeDay(overrides: Partial<DayRecord> = {}): DayRecord {
  return {
    id: "day-001",
    date: "2024-12-01",
    totalDuration: 3_600_000,
    startTime: new Date("2024-12-01T09:00:00Z"),
    endTime: new Date("2024-12-01T10:00:00Z"),
    tasks: [
      {
        id: "task-001",
        title: "Task One",
        description: "Did some work",
        startTime: new Date("2024-12-01T09:00:00Z"),
        endTime: new Date("2024-12-01T10:00:00Z"),
        duration: 3_600_000,
        project: "Project A",
        client: "Client X",
        category: "cat1"
      }
    ],
    ...overrides
  };
}

describe("exportUtils", () => {
  describe("exportToCSV", () => {
    it("includes the correct column headers on the first line", () => {
      const csv = exportToCSV([makeDay()], [project], [category], "user-1");
      const headerLine = csv.split("\n")[0];
      expect(headerLine).toContain("id");
      expect(headerLine).toContain("title");
      expect(headerLine).toContain("start_time");
      expect(headerLine).toContain("duration");
      expect(headerLine).toContain("project_name");
      expect(headerLine).toContain("daily_summary");
    });

    it("produces one data row per task with duration", () => {
      const csv = exportToCSV([makeDay()], [project], [category], "user-1");
      const lines = csv.split("\n").filter(Boolean);
      expect(lines).toHaveLength(2); // header + 1 task row
    });

    it("omits tasks with no duration", () => {
      const day = makeDay({
        tasks: [{ id: "t1", title: "No duration", startTime: new Date("2024-12-01T09:00:00Z") }]
      });
      const csv = exportToCSV([day], [project], [category], "user-1");
      const lines = csv.split("\n").filter(Boolean);
      expect(lines).toHaveLength(1); // header only
    });

    it("filters by date range when provided", () => {
      const days = [
        makeDay({ id: "d1", startTime: new Date("2024-11-30T09:00:00Z") }),
        makeDay({ id: "d2", startTime: new Date("2024-12-01T09:00:00Z") })
      ];
      const csv = exportToCSV(
        days,
        [project],
        [category],
        "user-1",
        new Date("2024-12-01T00:00:00Z"),
        new Date("2024-12-01T23:59:59Z")
      );
      const lines = csv.split("\n").filter(Boolean);
      expect(lines).toHaveLength(2); // header + 1 task (only the Dec 1 day)
    });

    it("includes the userId in each data row", () => {
      const csv = exportToCSV([makeDay()], [project], [category], "user-abc");
      const dataRow = csv.split("\n")[1];
      expect(dataRow).toContain("user-abc");
    });
  });

  describe("exportToJSON", () => {
    it("returns valid JSON", () => {
      const json = exportToJSON([makeDay()], [project], [category]);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it("includes expected top-level keys", () => {
      const parsed = JSON.parse(exportToJSON([makeDay()], [project], [category]));
      expect(parsed).toHaveProperty("exportDate");
      expect(parsed).toHaveProperty("summary");
      expect(parsed).toHaveProperty("days");
      expect(parsed).toHaveProperty("projects");
    });

    it("summary.totalDays reflects the day count", () => {
      const parsed = JSON.parse(exportToJSON([makeDay()], [project], [category]));
      expect(parsed.summary.totalDays).toBe(1);
    });

    it("filters days by date range when provided", () => {
      const days = [
        makeDay({ id: "d1", startTime: new Date("2024-11-30T09:00:00Z") }),
        makeDay({ id: "d2", startTime: new Date("2024-12-01T09:00:00Z") })
      ];
      const parsed = JSON.parse(
        exportToJSON(
          days,
          [project],
          [category],
          new Date("2024-12-01T00:00:00Z"),
          new Date("2024-12-01T23:59:59Z")
        )
      );
      expect(parsed.summary.totalDays).toBe(1);
    });
  });

  describe("generateInvoiceData", () => {
    it("returns data for matching client tasks", () => {
      const invoice = generateInvoiceData(
        [makeDay()],
        [project],
        [category],
        "Client X",
        new Date("2024-12-01T00:00:00Z"),
        new Date("2024-12-01T23:59:59Z")
      );
      expect(invoice.client).toBe("Client X");
      expect(invoice.summary.totalHours).toBe(1);
      expect(invoice.summary.totalAmount).toBe(100);
    });

    it("returns zero hours/amount when client has no matching tasks", () => {
      const invoice = generateInvoiceData(
        [makeDay()],
        [project],
        [category],
        "Other Client",
        new Date("2024-12-01T00:00:00Z"),
        new Date("2024-12-01T23:59:59Z")
      );
      expect(invoice.summary.totalHours).toBe(0);
      expect(invoice.summary.totalAmount).toBe(0);
    });

    it("includes the period in the result", () => {
      const start = new Date("2024-12-01T00:00:00Z");
      const end = new Date("2024-12-01T23:59:59Z");
      const invoice = generateInvoiceData([makeDay()], [project], [category], "Client X", start, end);
      expect(invoice.period.startDate).toEqual(start);
      expect(invoice.period.endDate).toEqual(end);
    });
  });

  describe("parseCSVImport", () => {
    it("returns error for empty CSV", () => {
      const result = parseCSVImport("", []);
      expect(result.success).toBe(false);
      expect(result.importedCount).toBe(0);
    });

    it("returns error when required headers are missing", () => {
      const result = parseCSVImport("id,title\n\"t1\",\"Task\"", []);
      expect(result.success).toBe(false);
      expect(result.message).toContain("missing required headers");
    });

    it("parses a well-formed CSV into a DayRecord", () => {
      const headers = "id,user_id,title,description,start_time,end_time,duration,project_id,project_name,client,category_id,category_name,day_record_id,is_current,inserted_at,updated_at";
      const row = `"task-1","user-1","My Task","","2024-12-01T09:00:00.000Z","2024-12-01T10:00:00.000Z",3600000,"","Project A","Client X","","Development","day-1","false","2024-12-01T09:00:00.000Z","2024-12-01T10:00:00.000Z"`;
      const result = parseCSVImport(`${headers}\n${row}`, []);
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(result.newArchivedDays).toHaveLength(1);
      expect(result.newArchivedDays[0].tasks[0].title).toBe("My Task");
    });

    it("skips rows with invalid start_time", () => {
      const headers = "id,user_id,title,description,start_time,end_time,duration,project_id,project_name,client,category_id,category_name,day_record_id,is_current,inserted_at,updated_at";
      const row = `"task-1","user-1","My Task","","NOT_A_DATE","","","","","","","","day-1","false","",""`;
      const result = parseCSVImport(`${headers}\n${row}`, []);
      expect(result.importedCount).toBe(0);
    });
  });
});
