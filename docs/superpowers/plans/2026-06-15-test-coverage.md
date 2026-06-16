# Test Coverage Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ~80 tests covering calculationUtils, checklistUtils, exportUtils, context (todos, planned tasks, projects, categories, discardDay, adjustTaskTime, addBackdatedDay, archiveClient/restoreClient), NewTaskForm, and TaskItem.

**Architecture:** All tests use Vitest + React Testing Library in the existing jsdom environment (see `src/test-setup.ts`). Pure utility tests are zero-dependency. Context tests extend the existing wrapper pattern in `TimeTracking.test.tsx`. Component tests use `vi.mock` to isolate from context/hooks/dialogs.

**Tech Stack:** Vitest 1.x, `@testing-library/react`, `@testing-library/user-event`, TypeScript, `@testing-library/jest-dom` (already wired in test-setup.ts)

---

## File Map

| Action | Path |
|---|---|
| Create | `src/utils/calculationUtils.test.ts` |
| Create | `src/utils/checklistUtils.test.ts` |
| Create | `src/utils/exportUtils.test.ts` |
| Extend | `src/contexts/TimeTracking.test.tsx` (add describe blocks inside the root `describe("TimeTrackingContext", ...)`) |
| Create | `src/components/NewTaskForm.test.tsx` |
| Create | `src/components/TaskItem.test.tsx` |

**Run all tests:** `npx vitest run`
**Run one file:** `npx vitest run src/utils/calculationUtils.test.ts`

---

## Task 1: calculationUtils tests

**Files:**
- Create: `src/utils/calculationUtils.test.ts`

These are pure functions — no mocks needed.

- [ ] **Step 1: Create the test file**

```ts
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
```

- [ ] **Step 2: Run and verify all pass**

```
npx vitest run src/utils/calculationUtils.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/utils/calculationUtils.test.ts
git commit -m "test: add calculationUtils coverage"
```

---

## Task 2: checklistUtils tests

**Files:**
- Create: `src/utils/checklistUtils.test.ts`

- [ ] **Step 1: Create the test file**

```ts
import { describe, it, expect } from "vitest";
import { parseTaskChecklist, toggleDescriptionChecklistItem } from "@/utils/checklistUtils";

describe("checklistUtils", () => {
  describe("parseTaskChecklist", () => {
    it("returns empty array for empty string", () => {
      expect(parseTaskChecklist("")).toEqual([]);
    });

    it("returns empty array for text with no checklist items", () => {
      expect(parseTaskChecklist("Just a plain description\nWith multiple lines")).toEqual([]);
    });

    it("parses a single unchecked item", () => {
      const result = parseTaskChecklist("- [ ] Write tests");
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Write tests");
      expect(result[0].completed).toBe(false);
      expect(result[0].lineIndex).toBe(0);
    });

    it("parses a single checked item", () => {
      const result = parseTaskChecklist("- [x] Update docs");
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Update docs");
      expect(result[0].completed).toBe(true);
    });

    it("parses mixed checked and unchecked items", () => {
      const description = "- [ ] Write unit tests\n- [x] Update README\n- [ ] Fix lint errors";
      const result = parseTaskChecklist(description);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ text: "Write unit tests", completed: false, lineIndex: 0 });
      expect(result[1]).toMatchObject({ text: "Update README", completed: true, lineIndex: 1 });
      expect(result[2]).toMatchObject({ text: "Fix lint errors", completed: false, lineIndex: 2 });
    });

    it("ignores non-checklist lines interspersed with checklist items", () => {
      const description = "Some intro text\n- [ ] First item\nSome other text\n- [x] Second item";
      const result = parseTaskChecklist(description);
      expect(result).toHaveLength(2);
      expect(result[0].lineIndex).toBe(1);
      expect(result[1].lineIndex).toBe(3);
    });

    it("handles uppercase X in checked item", () => {
      const result = parseTaskChecklist("- [X] Capital X item");
      expect(result).toHaveLength(1);
      expect(result[0].completed).toBe(true);
    });

    it("correctly assigns lineIndex for each item", () => {
      const description = "- [ ] item0\n- [x] item1\n- [ ] item2";
      const result = parseTaskChecklist(description);
      expect(result[0].lineIndex).toBe(0);
      expect(result[1].lineIndex).toBe(1);
      expect(result[2].lineIndex).toBe(2);
    });
  });

  describe("toggleDescriptionChecklistItem", () => {
    it("toggles unchecked to checked", () => {
      const desc = "- [ ] Write tests";
      const result = toggleDescriptionChecklistItem(desc, 0);
      expect(result).toBe("- [x] Write tests");
    });

    it("toggles checked to unchecked", () => {
      const desc = "- [x] Write tests";
      const result = toggleDescriptionChecklistItem(desc, 0);
      expect(result).toBe("- [ ] Write tests");
    });

    it("only toggles the item at the specified lineIndex", () => {
      const desc = "- [ ] First\n- [x] Second\n- [ ] Third";
      const result = toggleDescriptionChecklistItem(desc, 1);
      const lines = result.split("\n");
      expect(lines[0]).toBe("- [ ] First");
      expect(lines[1]).toBe("- [ ] Second");
      expect(lines[2]).toBe("- [ ] Third");
    });

    it("returns original description unchanged for out-of-bounds lineIndex", () => {
      const desc = "- [ ] Only item";
      expect(toggleDescriptionChecklistItem(desc, 99)).toBe(desc);
    });

    it("leaves non-checklist lines unchanged", () => {
      const desc = "Plain text";
      expect(toggleDescriptionChecklistItem(desc, 0)).toBe("Plain text");
    });
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```
npx vitest run src/utils/checklistUtils.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/utils/checklistUtils.test.ts
git commit -m "test: add checklistUtils coverage"
```

---

## Task 3: exportUtils tests

**Files:**
- Create: `src/utils/exportUtils.test.ts`

- [ ] **Step 1: Create the test file**

```ts
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
      const row = `"task-1","user-1","My Task","","NOT_A_DATE","","","","","","","","day-1","false","","" `;
      const result = parseCSVImport(`${headers}\n${row}`, []);
      expect(result.importedCount).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```
npx vitest run src/utils/exportUtils.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/utils/exportUtils.test.ts
git commit -m "test: add exportUtils coverage"
```

---

## Task 4: Context — todo items

**Files:**
- Extend: `src/contexts/TimeTracking.test.tsx` (add inside the root `describe("TimeTrackingContext", ...)` block, before the closing brace)

The existing mocks (`useAuth`, `useHaptics`, `useAppLifecycle`) are already set up at the top of the file. The `wrapper` helper is already defined.

- [ ] **Step 1: Add the describe block**

Append this inside the root `describe("TimeTrackingContext", () => { ... })` block in `src/contexts/TimeTracking.test.tsx`:

```tsx
  describe("Todo Items", () => {
    it("adds a todo item", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addTodoItem("Buy groceries");
      });

      await waitFor(() => {
        expect(result.current.todoItems).toHaveLength(1);
        expect(result.current.todoItems[0].text).toBe("Buy groceries");
        expect(result.current.todoItems[0].completed).toBe(false);
      });
    });

    it("ignores blank todo text", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addTodoItem("   ");
      });

      expect(result.current.todoItems).toHaveLength(0);
    });

    it("toggles todo item to completed", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addTodoItem("Write report");
      });

      let todoId: string;
      await waitFor(() => {
        expect(result.current.todoItems).toHaveLength(1);
        todoId = result.current.todoItems[0].id;
      });

      await act(async () => {
        result.current.toggleTodoItem(todoId);
      });

      await waitFor(() => {
        expect(result.current.todoItems[0].completed).toBe(true);
        expect(result.current.todoItems[0].completedAt).toBeDefined();
      });
    });

    it("toggles todo item back to incomplete", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addTodoItem("Write report");
      });

      let todoId: string;
      await waitFor(() => { todoId = result.current.todoItems[0].id; });

      await act(async () => { result.current.toggleTodoItem(todoId); });
      await act(async () => { result.current.toggleTodoItem(todoId); });

      await waitFor(() => {
        expect(result.current.todoItems[0].completed).toBe(false);
        expect(result.current.todoItems[0].completedAt).toBeUndefined();
      });
    });

    it("deletes a todo item", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addTodoItem("Delete me");
      });

      let todoId: string;
      await waitFor(() => { todoId = result.current.todoItems[0].id; });

      await act(async () => {
        result.current.deleteTodoItem(todoId);
      });

      await waitFor(() => {
        expect(result.current.todoItems).toHaveLength(0);
      });
    });

    it("clears only completed todo items", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addTodoItem("Keep me");
        result.current.addTodoItem("Delete me");
      });

      let secondId: string;
      await waitFor(() => {
        expect(result.current.todoItems).toHaveLength(2);
        secondId = result.current.todoItems[1].id;
      });

      await act(async () => { result.current.toggleTodoItem(secondId); });
      await act(async () => { result.current.clearCompletedTodos(); });

      await waitFor(() => {
        expect(result.current.todoItems).toHaveLength(1);
        expect(result.current.todoItems[0].text).toBe("Keep me");
      });
    });
  });
```

- [ ] **Step 2: Run and verify**

```
npx vitest run src/contexts/TimeTracking.test.tsx
```

Expected: all existing tests still pass, plus 6 new todo tests.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/TimeTracking.test.tsx
git commit -m "test: add todo item context coverage"
```

---

## Task 5: Context — planned tasks

**Files:**
- Extend: `src/contexts/TimeTracking.test.tsx`

- [ ] **Step 1: Add the describe block**

Append inside the root `describe("TimeTrackingContext", ...)`:

```tsx
  describe("Planned Tasks", () => {
    it("adds a planned task with status todo", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addPlannedTask({ title: "Build login page", description: "OAuth flow" });
      });

      await waitFor(() => {
        expect(result.current.plannedTasks).toHaveLength(1);
        expect(result.current.plannedTasks[0].title).toBe("Build login page");
        expect(result.current.plannedTasks[0].status).toBe("todo");
        expect(result.current.plannedTasks[0].id).toBeTruthy();
      });
    });

    it("updates a planned task's title", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addPlannedTask({ title: "Original title" });
      });

      let taskId: string;
      await waitFor(() => { taskId = result.current.plannedTasks[0].id; });

      await act(async () => {
        result.current.updatePlannedTask(taskId, { title: "Updated title" });
      });

      await waitFor(() => {
        expect(result.current.plannedTasks[0].title).toBe("Updated title");
      });
    });

    it("deletes a planned task", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addPlannedTask({ title: "To delete" });
      });

      let taskId: string;
      await waitFor(() => { taskId = result.current.plannedTasks[0].id; });

      await act(async () => {
        result.current.deletePlannedTask(taskId);
      });

      await waitFor(() => {
        expect(result.current.plannedTasks).toHaveLength(0);
      });
    });

    it("moves a planned task to a new status", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addPlannedTask({ title: "Feature work" });
      });

      let taskId: string;
      await waitFor(() => { taskId = result.current.plannedTasks[0].id; });

      await act(async () => {
        result.current.movePlannedTask(taskId, "in_progress");
      });

      await waitFor(() => {
        expect(result.current.plannedTasks[0].status).toBe("in_progress");
      });
    });

    it("moves a planned task to done status", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addPlannedTask({ title: "Completed feature" });
      });

      let taskId: string;
      await waitFor(() => { taskId = result.current.plannedTasks[0].id; });

      await act(async () => {
        result.current.movePlannedTask(taskId, "done");
      });

      await waitFor(() => {
        expect(result.current.plannedTasks[0].status).toBe("done");
      });
    });

    it("pullPlannedTaskToDay shows toast when day is not started", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addPlannedTask({ title: "Pull me" });
      });

      let taskId: string;
      await waitFor(() => { taskId = result.current.plannedTasks[0].id; });

      // Day is not started — pull should be blocked
      await act(async () => {
        result.current.pullPlannedTaskToDay(taskId);
      });

      // Task status should remain "todo" since the pull was blocked
      await waitFor(() => {
        expect(result.current.plannedTasks[0].status).toBe("todo");
      });
    });

    it("pullPlannedTaskToDay creates a day task and marks planned as in_progress", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      // Start day first
      await act(async () => {
        result.current.startDay(new Date("2024-12-03T09:00:00.000Z"));
      });

      await act(async () => {
        result.current.addPlannedTask({ title: "Pull me", description: "Some work" });
      });

      let taskId: string;
      await waitFor(() => { taskId = result.current.plannedTasks[0].id; });

      await act(async () => {
        result.current.pullPlannedTaskToDay(taskId);
      });

      await waitFor(() => {
        expect(result.current.plannedTasks[0].status).toBe("in_progress");
        expect(result.current.tasks.some(t => t.title === "Pull me")).toBe(true);
      });
    });
  });
```

- [ ] **Step 2: Run and verify**

```
npx vitest run src/contexts/TimeTracking.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/TimeTracking.test.tsx
git commit -m "test: add planned task context coverage"
```

---

## Task 6: Context — project CRUD

**Files:**
- Extend: `src/contexts/TimeTracking.test.tsx`

- [ ] **Step 1: Add the describe block**

Append inside the root `describe("TimeTrackingContext", ...)`:

```tsx
  describe("Project Management", () => {
    it("adds a project", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addProject({
          name: "New Project",
          client: "Acme",
          hourlyRate: 150,
          color: "#FF0000",
          isBillable: true
        });
      });

      await waitFor(() => {
        const found = result.current.projects.find(p => p.name === "New Project");
        expect(found).toBeDefined();
        expect(found?.client).toBe("Acme");
        expect(found?.hourlyRate).toBe(150);
        expect(found?.id).toBeTruthy();
      });
    });

    it("updates a project's name and hourlyRate", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addProject({ name: "Old Name", client: "Client", color: "#000", isBillable: true });
      });

      let projectId: string;
      await waitFor(() => {
        const found = result.current.projects.find(p => p.name === "Old Name");
        expect(found).toBeDefined();
        projectId = found!.id;
      });

      await act(async () => {
        result.current.updateProject(projectId, { name: "New Name", hourlyRate: 200 });
      });

      await waitFor(() => {
        const found = result.current.projects.find(p => p.id === projectId);
        expect(found?.name).toBe("New Name");
        expect(found?.hourlyRate).toBe(200);
      });
    });

    it("deletes a project", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addProject({ name: "Delete Me", client: "Client", color: "#000", isBillable: true });
      });

      let projectId: string;
      await waitFor(() => {
        const found = result.current.projects.find(p => p.name === "Delete Me");
        projectId = found!.id;
      });

      await act(async () => {
        result.current.deleteProject(projectId);
      });

      await waitFor(() => {
        expect(result.current.projects.find(p => p.id === projectId)).toBeUndefined();
      });
    });

    it("archives a project", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addProject({ name: "Archive Me", client: "Client", color: "#000", isBillable: true });
      });

      let projectId: string;
      await waitFor(() => {
        const found = result.current.projects.find(p => p.name === "Archive Me");
        projectId = found!.id;
      });

      await act(async () => {
        result.current.archiveProject(projectId);
      });

      await waitFor(() => {
        const found = result.current.projects.find(p => p.id === projectId);
        expect(found?.archived).toBe(true);
      });
    });

    it("restores an archived project", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addProject({ name: "Restore Me", client: "Client", color: "#000", isBillable: true });
      });

      let projectId: string;
      await waitFor(() => {
        projectId = result.current.projects.find(p => p.name === "Restore Me")!.id;
      });

      await act(async () => { result.current.archiveProject(projectId); });
      await act(async () => { result.current.restoreProject(projectId); });

      await waitFor(() => {
        expect(result.current.projects.find(p => p.id === projectId)?.archived).toBe(false);
      });
    });

    it("resets projects to defaults", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addProject({ name: "Custom Project", client: "Me", color: "#000", isBillable: true });
        result.current.resetProjectsToDefaults();
      });

      await waitFor(() => {
        expect(result.current.projects.find(p => p.name === "Custom Project")).toBeUndefined();
        // At least one default project should exist
        expect(result.current.projects.length).toBeGreaterThan(0);
      });
    });
  });
```

- [ ] **Step 2: Run and verify**

```
npx vitest run src/contexts/TimeTracking.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/TimeTracking.test.tsx
git commit -m "test: add project CRUD context coverage"
```

---

## Task 7: Context — categories, discardDay, adjustTaskTime, addBackdatedDay, archiveClient/restoreClient

**Files:**
- Extend: `src/contexts/TimeTracking.test.tsx`

- [ ] **Step 1: Add category describe block**

Append inside the root `describe("TimeTrackingContext", ...)`:

```tsx
  describe("Category Management", () => {
    it("adds a category", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });
      const initialCount = result.current.categories.length;

      await act(async () => {
        result.current.addCategory({ name: "New Cat", color: "#123456", isBillable: true });
      });

      await waitFor(() => {
        expect(result.current.categories).toHaveLength(initialCount + 1);
        const found = result.current.categories.find(c => c.name === "New Cat");
        expect(found).toBeDefined();
        expect(found?.id).toBeTruthy();
      });
    });

    it("updates a category name", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addCategory({ name: "Old Cat", color: "#000", isBillable: true });
      });

      let catId: string;
      await waitFor(() => {
        catId = result.current.categories.find(c => c.name === "Old Cat")!.id;
      });

      await act(async () => {
        result.current.updateCategory(catId, { name: "Updated Cat" });
      });

      await waitFor(() => {
        expect(result.current.categories.find(c => c.id === catId)?.name).toBe("Updated Cat");
      });
    });

    it("deletes a category", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.addCategory({ name: "Delete Me", color: "#000", isBillable: true });
      });

      let catId: string;
      await waitFor(() => {
        catId = result.current.categories.find(c => c.name === "Delete Me")!.id;
      });

      await act(async () => {
        result.current.deleteCategory(catId);
      });

      await waitFor(() => {
        expect(result.current.categories.find(c => c.id === catId)).toBeUndefined();
      });
    });
  });

  describe("discardDay", () => {
    it("clears all day state", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.startDay(new Date("2024-12-03T09:00:00Z"));
        result.current.startNewTask("Some work");
      });

      await waitFor(() => {
        expect(result.current.isDayStarted).toBe(true);
        expect(result.current.tasks).toHaveLength(1);
      });

      await act(async () => {
        result.current.discardDay();
      });

      await waitFor(() => {
        expect(result.current.isDayStarted).toBe(false);
        expect(result.current.tasks).toHaveLength(0);
        expect(result.current.currentTask).toBeNull();
        expect(result.current.dayStartTime).toBeNull();
      });
    });
  });

  describe("adjustTaskTime", () => {
    it("rounds start time to nearest 15 minutes and updates duration", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await act(async () => {
        result.current.startDay(new Date("2024-12-03T09:00:00Z"));
        result.current.startNewTask("Timed task");
      });

      let taskId: string;
      await waitFor(() => {
        taskId = result.current.currentTask!.id;
      });

      // startTime = 09:07 → rounds to 09:00, endTime = 10:22 → rounds to 10:30
      await act(async () => {
        result.current.adjustTaskTime(
          taskId,
          new Date("2024-12-03T09:07:00Z"),
          new Date("2024-12-03T10:22:00Z")
        );
      });

      await waitFor(() => {
        const task = result.current.tasks.find(t => t.id === taskId);
        expect(task?.startTime.getMinutes()).toBe(0);   // rounded to :00
        expect(task?.endTime?.getMinutes()).toBe(30);   // rounded to :30
        expect(task?.duration).toBe(
          new Date("2024-12-03T10:30:00Z").getTime() - new Date("2024-12-03T09:00:00Z").getTime()
        );
      });
    });
  });

  describe("addBackdatedDay", () => {
    it("adds a backdated day to the archive", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      const backdatedDay: import("@/contexts/TimeTrackingContext").DayRecord = {
        id: "backdated-1",
        date: "Mon Nov 25 2024",
        tasks: [
          {
            id: "bt1",
            title: "Past work",
            startTime: new Date("2024-11-25T09:00:00Z"),
            endTime: new Date("2024-11-25T10:00:00Z"),
            duration: 3_600_000
          }
        ],
        totalDuration: 3_600_000,
        startTime: new Date("2024-11-25T09:00:00Z"),
        endTime: new Date("2024-11-25T10:00:00Z")
      };

      await act(async () => {
        await result.current.addBackdatedDay(backdatedDay);
      });

      await waitFor(() => {
        expect(result.current.archivedDays.find(d => d.id === "backdated-1")).toBeDefined();
      });
    });
  });

  describe("archiveClient / restoreClient", () => {
    it("archives a client with no active projects", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await waitFor(() => expect(result.current.clients).toBeDefined());

      let clientId: string;
      await act(async () => {
        const created = result.current.addClient({ name: "Archive-able Client" });
        clientId = created!.id;
      });

      await waitFor(() => {
        expect(result.current.clients.find(c => c.id === clientId)).toBeDefined();
      });

      let errorMsg: string | null = "not-yet-set";
      await act(async () => {
        errorMsg = result.current.archiveClient(clientId);
      });

      await waitFor(() => {
        expect(errorMsg).toBeNull();
        expect(result.current.clients.find(c => c.id === clientId)?.archived).toBe(true);
      });
    });

    it("blocks archiving a client that has active projects", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await waitFor(() => expect(result.current.clients).toBeDefined());

      // Add a client
      let clientId: string;
      await act(async () => {
        const created = result.current.addClient({ name: "Busy Client" });
        clientId = created!.id;
      });

      // Add a project owned by this client
      await act(async () => {
        result.current.addProject({ name: "Active Project", client: "Busy Client", color: "#000", isBillable: true });
      });

      let errorMsg: string | null = null;
      await act(async () => {
        errorMsg = result.current.archiveClient(clientId);
      });

      expect(errorMsg).not.toBeNull();
      expect(errorMsg).toContain("Active Project");
      // Client should NOT be archived
      expect(result.current.clients.find(c => c.id === clientId)?.archived).toBe(false);
    });

    it("restores an archived client", async () => {
      const { result } = renderHook(() => useTimeTracking(), { wrapper });

      await waitFor(() => expect(result.current.clients).toBeDefined());

      let clientId: string;
      await act(async () => {
        const created = result.current.addClient({ name: "Restore Me" });
        clientId = created!.id;
      });

      await act(async () => { result.current.archiveClient(clientId); });
      await act(async () => { result.current.restoreClient(clientId); });

      await waitFor(() => {
        expect(result.current.clients.find(c => c.id === clientId)?.archived).toBe(false);
      });
    });
  });
```

- [ ] **Step 2: Run and verify**

```
npx vitest run src/contexts/TimeTracking.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/TimeTracking.test.tsx
git commit -m "test: add category/discardDay/adjustTaskTime/backdatedDay/client context coverage"
```

---

## Task 8: NewTaskForm component tests

**Files:**
- Create: `src/components/NewTaskForm.test.tsx`

The component starts in a collapsed state (shows a FAB button). Pass `defaultOpen={true}` to skip that.

- [ ] **Step 1: Create the test file**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewTaskForm } from "@/components/NewTaskForm";

const mockProjects = [
  { id: "p1", name: "Project A", client: "Client X", color: "#000", isBillable: true }
];
const mockCategories = [
  { id: "cat1", name: "Development", color: "#0f0", isBillable: true }
];

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({
    projects: mockProjects,
    categories: mockCategories
  })
}));

describe("NewTaskForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the title input", () => {
    render(<NewTaskForm onSubmit={vi.fn()} defaultOpen={true} />);
    expect(screen.getByLabelText(/task title/i)).toBeInTheDocument();
  });

  it("renders category and project selects", () => {
    render(<NewTaskForm onSubmit={vi.fn()} defaultOpen={true} />);
    expect(screen.getByLabelText(/select category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/select project/i)).toBeInTheDocument();
  });

  it("calls onSubmit with title when form is submitted", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<NewTaskForm onSubmit={onSubmit} defaultOpen={true} />);

    await user.type(screen.getByLabelText(/task title/i), "Write tests");
    await user.click(screen.getByRole("button", { name: /start task/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith(
      "Write tests",
      undefined,  // no description
      undefined,  // no project selected
      undefined,  // no client
      undefined   // no category
    );
  });

  it("shows a validation error when submitted with empty title", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<NewTaskForm onSubmit={onSubmit} defaultOpen={true} />);

    await user.click(screen.getByRole("button", { name: /start task/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Task title is required");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not call onSubmit when title is only whitespace", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<NewTaskForm onSubmit={onSubmit} defaultOpen={true} />);

    await user.type(screen.getByLabelText(/task title/i), "   ");
    await user.click(screen.getByRole("button", { name: /start task/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears the form after successful submission", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<NewTaskForm onSubmit={onSubmit} defaultOpen={true} />);

    const titleInput = screen.getByLabelText(/task title/i);
    await user.type(titleInput, "My task");
    await user.click(screen.getByRole("button", { name: /start task/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    // After submission the form collapses back to FAB; title input is gone
    expect(screen.queryByLabelText(/task title/i)).not.toBeInTheDocument();
  });

  it("calls onCancel and hides the form when Cancel is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<NewTaskForm onSubmit={vi.fn()} onCancel={onCancel} defaultOpen={true} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText(/task title/i)).not.toBeInTheDocument();
  });

  it("shows the FAB button when defaultOpen is false", () => {
    render(<NewTaskForm onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /new task/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/task title/i)).not.toBeInTheDocument();
  });

  it("opens the form when FAB is clicked", async () => {
    const user = userEvent.setup();
    render(<NewTaskForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /new task/i }));

    expect(screen.getByLabelText(/task title/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and verify**

```
npx vitest run src/components/NewTaskForm.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/NewTaskForm.test.tsx
git commit -m "test: add NewTaskForm component coverage"
```

---

## Task 9: TaskItem component tests

**Files:**
- Create: `src/components/TaskItem.test.tsx`

`TaskItem` uses `useHaptics`, `useLongPress`, `useTimeTracking`, `TaskEditDialog`, and `DeleteConfirmationDialog`. Mock all of them.

- [ ] **Step 1: Create the test file**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskItem } from "@/components/TaskItem";
import type { Task } from "@/contexts/TimeTrackingContext";

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({
    categories: [{ id: "cat1", name: "Development", color: "#0f0", isBillable: true }]
  })
}));

vi.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => ({
    lightImpact: vi.fn(),
    mediumImpact: vi.fn(),
    heavyImpact: vi.fn(),
    successNotify: vi.fn(),
    errorNotify: vi.fn()
  })
}));

vi.mock("@/hooks/useLongPress", () => ({
  useLongPress: () => ({})
}));

// Minimal dialog mocks — just enough to show/hide in tests
vi.mock("@/components/TaskEditDialog", () => ({
  TaskEditDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="edit-dialog">Edit Dialog</div> : null
}));

vi.mock("@/components/DeleteConfirmationDialog", () => ({
  DeleteConfirmationDialog: ({
    isOpen,
    onConfirm,
    onClose
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onClose: () => void;
    taskTitle: string;
  }) =>
    isOpen ? (
      <div data-testid="delete-dialog">
        <button onClick={onConfirm}>Confirm Delete</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
}));

const baseTask: Task = {
  id: "task-1",
  title: "Review PR",
  description: "Check the authentication changes",
  startTime: new Date("2024-12-03T09:00:00Z"),
  endTime: new Date("2024-12-03T10:00:00Z"),
  duration: 3_600_000,
  project: "Project A",
  client: "Client X",
  category: "cat1"
};

describe("TaskItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the task title", () => {
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);
    expect(screen.getByText("Review PR")).toBeInTheDocument();
  });

  it("renders the task description", () => {
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);
    expect(screen.getByText(/Check the authentication changes/)).toBeInTheDocument();
  });

  it("renders the project badge", () => {
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);
    expect(screen.getByText("Project A")).toBeInTheDocument();
  });

  it("renders the client badge", () => {
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);
    expect(screen.getByText("Client X")).toBeInTheDocument();
  });

  it("shows Active badge when isActive is true", () => {
    render(<TaskItem task={baseTask} isActive={true} onDelete={vi.fn()} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("does not show Active badge when isActive is false", () => {
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("shows the delete confirmation dialog when Delete is clicked", async () => {
    const user = userEvent.setup();
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /delete task: review pr/i }));

    expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
  });

  it("calls onDelete with task id when deletion is confirmed", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<TaskItem task={baseTask} isActive={false} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete task: review pr/i }));
    await user.click(screen.getByRole("button", { name: /confirm delete/i }));

    expect(onDelete).toHaveBeenCalledWith("task-1");
  });

  it("opens the edit dialog when Edit is clicked", async () => {
    const user = userEvent.setup();
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /edit task: review pr/i }));

    expect(screen.getByTestId("edit-dialog")).toBeInTheDocument();
  });

  it("renders the category badge when category matches", () => {
    render(<TaskItem task={baseTask} isActive={false} onDelete={vi.fn()} />);
    expect(screen.getByText("Development")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and verify**

```
npx vitest run src/components/TaskItem.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Run the full suite**

```
npx vitest run
```

Expected: all tests pass (original 93 + new tests).

- [ ] **Step 4: Commit**

```bash
git add src/components/TaskItem.test.tsx
git commit -m "test: add TaskItem component coverage"
```

---

## Self-Review

**Spec coverage check:**
- ✅ calculationUtils — Task 1
- ✅ checklistUtils — Task 2
- ✅ exportUtils (CSV, JSON, invoice, parseCSV) — Task 3
- ✅ Todo items (add, toggle, delete, clearCompleted) — Task 4
- ✅ Planned tasks (add, update, delete, move, pull) — Task 5
- ✅ Project CRUD + archive/restore/reset — Task 6
- ✅ Category CRUD — Task 7
- ✅ discardDay — Task 7
- ✅ adjustTaskTime — Task 7
- ✅ addBackdatedDay — Task 7
- ✅ archiveClient / restoreClient (including blocking guard) — Task 7
- ✅ NewTaskForm render + submit + validation + cancel + FAB toggle — Task 8
- ✅ TaskItem render + delete confirm + edit open + badges — Task 9

**Placeholder scan:** None found. All test code is complete.

**Type consistency:**
- `DayRecord`, `Task`, `Project`, `Client` all imported from `@/contexts/TimeTrackingContext`
- `TaskCategory` imported from `@/config/categories`
- `PlannedTask`, `PlannedTaskStatus` used consistently
- `useTimeTracking` hook used in component mocks matches the actual hook
- `addBackdatedDay` accepts `DayRecord` — matched in Task 7
