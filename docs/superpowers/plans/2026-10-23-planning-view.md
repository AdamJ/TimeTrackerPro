# Planning View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each existing Project define "initiatives" (goal + deadline + manual status) and view them on a per-project planning timeline, so overlapping work is visible.

**Architecture:** A new `Initiative` entity following the app's existing `PlannedTask` pattern exactly — same dual-storage shape (localStorage module, Supabase table, self-hosted SQL backend table), same context wiring style (ref + loaded-guard + immediate upsert on mutation), same shared-Sheet-component UI pattern (`ClientSheet`/`ProjectSheet`). A new per-project route renders a status-grouped timeline of that project's initiatives.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind + Radix/shadcn, React Hook Form + Zod, Vitest + React Testing Library, Supabase (Postgres), Knex (self-hosted SQL backend).

**Spec:** [docs/superpowers/specs/2026-10-23-planning-view-design.md](../specs/2026-10-23-planning-view-design.md)

## Global Constraints

- 2-space indentation, double quotes always, `@/` import alias only (never relative `../../`) — per `AGENTS.md`.
- Use shadcn/ui components only — no raw HTML with custom styles.
- Colors: semantic tokens or Radix scale classes only (steps 1-2 backgrounds, 3-5 fills, 6-8 borders, 9-10 solid, 11-12 text) — never arbitrary Tailwind palette colors like `bg-blue-500`.
- Standard calendar quarters: Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec (spec decision #5).
- A quarter deadline renders as a single point at the end of that quarter, never a block (spec decision #6).
- An initiative has no explicit start date — it appears on the timeline from `createdAt` through its deadline (spec decision #4).
- Status is manual only: `not_started` | `in_progress` | `done` | `blocked` (spec decision #3) — never derived from tasks.
- No cross-project view; no zoom/scale switching in this plan (spec Non-goals).
- `pnpm check:design-tokens`, `pnpm lint:markdown`, and `pnpm check:a11y` must pass before any commit (`AGENTS.md`).
- Never add a "Co-Authored-By:" line to any commit (`AGENTS.md`).

## Review Focus

- **Quarter deadline with no year, or year with no quarter** (partial deadline data from a bug or manual storage edit) — `resolveInitiativeDeadline` must not throw; it's the one function everything else (timeline positioning, sheet display) depends on. Covered in Task 1.
- **Deadline date entered earlier than the initiative's `createdAt`** — a reasonable person expects the save to be rejected with a clear message, not a silently inverted/zero-width timeline bar. Covered in Task 6.
- **Deleting a project that has initiatives** — a reasonable person expects no orphaned data left behind (guest mode has no DB cascade to rely on). Covered in Task 5.
- **Navigating to `/projects/:id/planning` for an id that doesn't exist** (stale bookmark, deleted/archived project) — a reasonable person expects a clear "not found" state, not a blank page or crash. Covered in Task 8.
- **A project with zero initiatives** — the timeline and its grouped swimlanes must render a sensible empty state rather than an empty/broken grid. Covered in Task 7.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/contexts/TimeTrackingContext.tsx` (modify) | `Initiative`/`InitiativeStatus`/`InitiativeDeadlineType` types; `initiatives` state + CRUD context methods; cascade-delete on `deleteProject` |
| `src/utils/initiativeUtils.ts` (create) | `resolveInitiativeDeadline`, `getQuarterEndDate`, `isDeadlineBeforeCreation` — pure date helpers shared by the Sheet and the Timeline |
| `src/services/dataService.ts` (modify) | `DataService` interface: `saveInitiatives`/`getInitiatives`/`upsertInitiative`/`deleteInitiative` |
| `src/services/localStorageService/constants.ts` (modify) | `STORAGE_KEYS.INITIATIVES` |
| `src/services/localStorageService/initiatives.ts` (create) | Guest-mode CRUD, mirrors `plannedTasks.ts` |
| `src/services/localStorageService/index.ts` (modify) | Wire the new module into `LocalStorageService` |
| `supabase/migrations/20261023_planning_initiatives.sql` (create) | `planning_initiatives` table + RLS |
| `src/services/supabaseService.ts` (modify) | Authenticated-mode CRUD + migration (`migrateFromLocalStorage`/`migrateToLocalStorage`) updates |
| `server/schema.ts` (modify) | `planning_initiatives` table for the self-hosted SQL backend |
| `server/repositories/initiatives.ts` (create) | Knex CRUD, mirrors `repositories/plannedTasks.ts` |
| `server/app.ts` (modify) | `/api/initiatives` routes |
| `src/services/sqlApiService.ts` (modify) | REST CRUD, mirrors its `PlannedTask` methods |
| `src/components/InitiativeSheet.tsx` (create) | Add/edit Sheet: name, goal, status, deadline (date or quarter) |
| `src/components/InitiativeTimeline.tsx` (create) | Status-grouped, month-scale timeline with a "Today" line |
| `src/pages/ProjectPlanning.tsx` (create) | Per-project planning page (`PageLayout` + `InitiativeTimeline` + add/edit) |
| `src/App.tsx` (modify) | `/projects/:id/planning` route |
| `src/components/ProjectList.tsx` (modify) | "Planning" link per project row |

---

### Task 1: Initiative types and date-resolution utilities

**Files:**
- Modify: `src/contexts/TimeTrackingContext.tsx` (add type exports near the existing `Project`/`Client` interfaces, ~line 70)
- Create: `src/utils/initiativeUtils.ts`
- Test: `src/utils/initiativeUtils.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type InitiativeStatus = "not_started" | "in_progress" | "done" | "blocked";
  export type InitiativeDeadlineType = "date" | "quarter";

  export interface Initiative {
    id: string;
    projectId: string;
    name: string;
    goal: string;
    status: InitiativeStatus;
    deadlineType: InitiativeDeadlineType;
    deadlineDate?: string;      // ISO date string; set when deadlineType === "date"
    deadlineQuarter?: number;   // 1-4; set when deadlineType === "quarter"
    deadlineYear?: number;      // set when deadlineType === "quarter"
    createdAt: string;
    updatedAt: string;
  }
  ```
  ```ts
  // src/utils/initiativeUtils.ts
  export function getQuarterEndDate(quarter: number, year: number): Date;
  export function resolveInitiativeDeadline(initiative: Initiative): Date | null;
  export function isDeadlineBeforeCreation(createdAt: string, deadline: Date): boolean;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// src/utils/initiativeUtils.test.ts
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/utils/initiativeUtils.test.ts`
Expected: FAIL — `initiativeUtils` module not found.

- [ ] **Step 3: Add the `InitiativeStatus`/`InitiativeDeadlineType`/`Initiative` exports to `TimeTrackingContext.tsx`**

Place directly after the `Client` interface (~line 84), matching the exact shape in Interfaces above.

- [ ] **Step 4: Implement `src/utils/initiativeUtils.ts`**

`getQuarterEndDate(quarter, year)`: the last calendar day of that quarter, as a UTC `Date` (quarter 1→Mar 31, 2→Jun 30, 3→Sep 30, 4→Dec 31 — standard calendar quarters per Global Constraints).
`resolveInitiativeDeadline(initiative)`: for `deadlineType === "date"`, parse `deadlineDate` (return `null` if absent); for `"quarter"`, return `null` if `deadlineQuarter` or `deadlineYear` is missing, otherwise `getQuarterEndDate(deadlineQuarter, deadlineYear)`.
`isDeadlineBeforeCreation(createdAt, deadline)`: `deadline < new Date(createdAt)` (strict — equal is allowed, same convention as `isEndBeforeStart` in `src/utils/timeUtil.ts`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/utils/initiativeUtils.test.ts`
Expected: PASS

- [ ] **Step 6: Typecheck**

Run: `pnpm build`
Expected: no type errors

- [ ] **Step 7: Commit**

```bash
git add src/contexts/TimeTrackingContext.tsx src/utils/initiativeUtils.ts src/utils/initiativeUtils.test.ts
git commit -m "feat: add Initiative types and deadline-resolution utilities"
```

---

### Task 2: Guest-mode (localStorage) persistence

**Files:**
- Modify: `src/services/dataService.ts`
- Modify: `src/services/localStorageService/constants.ts`
- Create: `src/services/localStorageService/initiatives.ts`
- Modify: `src/services/localStorageService/index.ts`
- Test: `src/services/dataService.test.ts` (new `describe("initiatives")` block)

**Interfaces:**
- Consumes: `Initiative` type (Task 1)
- Produces (added to `DataService`, implemented by `LocalStorageService`):
  ```ts
  saveInitiatives: (initiatives: Initiative[]) => Promise<void>;
  getInitiatives: () => Promise<Initiative[]>;
  upsertInitiative: (initiative: Initiative) => Promise<void>;
  deleteInitiative: (id: string) => Promise<void>;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// in src/services/dataService.test.ts, alongside the existing describe('clients') block
describe("initiatives", () => {
  it("round-trips an initiative with a date deadline", async () => {
    const service = createDataService(false);
    const initiative: import("@/contexts/TimeTrackingContext").Initiative = {
      id: "init-1", projectId: "proj-1", name: "Redesign onboarding",
      goal: "Cut signup drop-off in half", status: "in_progress",
      deadlineType: "date", deadlineDate: "2026-12-15",
      createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z"
    };

    await service.saveInitiatives([initiative]);
    const loaded = await service.getInitiatives();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("Redesign onboarding");
    expect(loaded[0].deadlineDate).toBe("2026-12-15");
  });

  it("upsertInitiative inserts, then updates in place", async () => {
    const service = createDataService(false);
    const base: import("@/contexts/TimeTrackingContext").Initiative = {
      id: "init-2", projectId: "proj-1", name: "Design system v3",
      goal: "Ship v3 tokens", status: "not_started",
      deadlineType: "quarter", deadlineQuarter: 1, deadlineYear: 2027,
      createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z"
    };

    await service.upsertInitiative(base);
    await service.upsertInitiative({ ...base, status: "in_progress" });
    const loaded = await service.getInitiatives();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].status).toBe("in_progress");
  });

  it("deleteInitiative removes a single row", async () => {
    const service = createDataService(false);
    const initiative: import("@/contexts/TimeTrackingContext").Initiative = {
      id: "init-3", projectId: "proj-1", name: "To delete",
      goal: "g", status: "not_started", deadlineType: "date", deadlineDate: "2026-11-01",
      createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z"
    };

    await service.upsertInitiative(initiative);
    await service.deleteInitiative("init-3");
    const loaded = await service.getInitiatives();

    expect(loaded).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/dataService.test.ts -t initiatives`
Expected: FAIL — `saveInitiatives`/`getInitiatives`/`upsertInitiative`/`deleteInitiative` not defined on `DataService`.

- [ ] **Step 3: Add `STORAGE_KEYS.INITIATIVES = "timetracker_initiatives"` to `constants.ts`**

- [ ] **Step 4: Implement `src/services/localStorageService/initiatives.ts`**

Copy the exact structure of `plannedTasks.ts` (Read it for the body: `writeVersioned`/`readVersioned`/`notifyWriteFailure` calls), substituting `Initiative`/`STORAGE_KEYS.INITIATIVES`/`initiatives`.

- [ ] **Step 5: Add the four methods to the `DataService` interface in `dataService.ts`** (new "Initiatives operations" section, same shape as the "Planned tasks operations" section already there)

- [ ] **Step 6: Wire the module into `LocalStorageService` in `index.ts`** (import + four one-line delegating methods, same as the existing `savePlannedTasks`/`getPlannedTasks`/`upsertPlannedTask`/`deletePlannedTask` delegations)

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm vitest run src/services/dataService.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/services/dataService.ts src/services/localStorageService/constants.ts src/services/localStorageService/initiatives.ts src/services/localStorageService/index.ts src/services/dataService.test.ts
git commit -m "feat: add guest-mode persistence for initiatives"
```

---

### Task 3: Supabase (authenticated-mode) persistence

**Files:**
- Create: `supabase/migrations/20261023_planning_initiatives.sql`
- Modify: `src/services/supabaseService.ts`
- Test: `src/services/supabaseService.test.ts` (new `describe("initiatives")` block + `getInitiatives` added to the hoisted `localServiceMocks`)

**Interfaces:**
- Consumes: `Initiative` type (Task 1); `DataService` interface (Task 2)
- Produces: `SupabaseService.saveInitiatives`/`getInitiatives`/`upsertInitiative`/`deleteInitiative`, matching the `DataService` signatures from Task 2.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20261023_planning_initiatives.sql
CREATE TABLE IF NOT EXISTS planning_initiatives (
  id             text PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id     text REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name           text NOT NULL,
  goal           text NOT NULL DEFAULT '',
  status         text NOT NULL DEFAULT 'not_started',
  deadline_type  text NOT NULL DEFAULT 'date',
  deadline_date  date,
  deadline_quarter integer,
  deadline_year  integer,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planning_initiatives_user_id ON planning_initiatives(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_initiatives_project_id ON planning_initiatives(project_id);

CREATE TRIGGER trg_update_planning_initiatives_updated_at
BEFORE UPDATE ON planning_initiatives
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE planning_initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own initiatives"
  ON planning_initiatives FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own initiatives"
  ON planning_initiatives FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own initiatives"
  ON planning_initiatives FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own initiatives"
  ON planning_initiatives FOR DELETE USING (auth.uid() = user_id);
```

- [ ] **Step 2: Write the failing tests**

```ts
// in src/services/supabaseService.test.ts
// Add to the hoisted localServiceMocks: getInitiatives: vi.fn(async () => [])

describe("saveInitiatives", () => {
  it("upserts a stale/partial snapshot without deleting rows missing from it", async () => {
    const initiatives: Initiative[] = [{
      id: "i1", projectId: "proj-1", name: "Redesign onboarding", goal: "g",
      status: "in_progress", deadlineType: "date", deadlineDate: "2026-12-15",
      createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z"
    }];
    await service.saveInitiatives(initiatives);

    expect(fromMock).toHaveBeenCalledWith("planning_initiatives");
    expect(builder.delete).not.toHaveBeenCalled();
    expect(builder.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "i1", user_id: "user-1", project_id: "proj-1", name: "Redesign onboarding" })],
      { onConflict: "id" }
    );
  });

  it("is a no-op for an empty array", async () => {
    await service.saveInitiatives([]);
    expect(fromMock).not.toHaveBeenCalledWith("planning_initiatives");
  });
});

describe("upsertInitiative / deleteInitiative", () => {
  it("upserts a single initiative row", async () => {
    const initiative: Initiative = {
      id: "i2", projectId: "proj-1", name: "Design system v3", goal: "g",
      status: "not_started", deadlineType: "quarter", deadlineQuarter: 1, deadlineYear: 2027,
      createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z"
    };
    await service.upsertInitiative(initiative);

    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "i2", deadline_quarter: 1, deadline_year: 2027 }),
      { onConflict: "id" }
    );
  });

  it("deletes a single initiative row scoped to the user", async () => {
    await service.deleteInitiative("i2");
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "i2");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run src/services/supabaseService.test.ts -t initiatives`
Expected: FAIL — methods not defined on `SupabaseService`.

- [ ] **Step 4: Implement the four methods in `supabaseService.ts`**

Copy the exact structure of `savePlannedTasks`/`upsertPlannedTask`/`deletePlannedTask`/`getPlannedTasks` (read those for the body), substituting the table name `planning_initiatives` and the row shape: `project_id`, `name`, `goal`, `status`, `deadline_type`, `deadline_date`, `deadline_quarter`, `deadline_year`. Include `trackDbCall` calls matching the existing convention.

- [ ] **Step 5: Update `migrateFromLocalStorage` and `migrateToLocalStorage`**

Mirror the existing `plannedTasks` handling exactly: load `localService.getInitiatives()`, compute `hasInitiatives`, include it in the "nothing to migrate" early-return check, and in the `hasExistingData` branch only migrate if `(await this.getInitiatives()).length === 0` (same stale-overwrite guard as planned tasks); in the no-existing-data branch, save unconditionally. In `migrateToLocalStorage`, save initiatives to `localService` the same way `plannedTasks` are saved there.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm vitest run src/services/supabaseService.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261023_planning_initiatives.sql src/services/supabaseService.ts src/services/supabaseService.test.ts
git commit -m "feat: add Supabase persistence and migration for initiatives"
```

---

### Task 4: Self-hosted SQL backend parity

**Files:**
- Modify: `server/schema.ts`
- Create: `server/repositories/initiatives.ts`
- Modify: `server/app.ts`
- Modify: `src/services/sqlApiService.ts`

**Interfaces:**
- Consumes: `Initiative` type (Task 1); `DataService` interface (Task 2)
- Produces: `SqlApiService.saveInitiatives`/`getInitiatives`/`upsertInitiative`/`deleteInitiative`

No test step: `server/` has no existing test suite to extend (confirmed — no test files exist under `server/`, and none are listed in `AGENTS.md`'s test inventory), so this task matches the project's existing untested convention for that directory.

- [ ] **Step 1: Add the `planning_initiatives` table to `server/schema.ts`**

Follow the existing single-tenant style (no `user_id`) used by every other table there. Columns: `id` (string, primary), `project_id` (string), `name` (string, not nullable), `goal` (text), `status` (string, default `"not_started"`), `deadline_type` (string, default `"date"`), `deadline_date` (string/date), `deadline_quarter` (integer), `deadline_year` (integer), `created_at` (timestamp, not nullable), `updated_at` (timestamp, not nullable, default now).

- [ ] **Step 2: Implement `server/repositories/initiatives.ts`**

Copy the exact structure of `repositories/plannedTasks.ts` (`mapRow`/`taskToRow`-equivalent/`getInitiatives`/`saveInitiatives`/`upsertInitiative`/`deleteInitiative`), substituting the `planning_initiatives` table and field names from Step 1.

- [ ] **Step 3: Add routes to `server/app.ts`**

Mirror the four `/api/planned-tasks` routes exactly, at `/api/initiatives`:
```ts
app.get("/api/initiatives", wrap(async (_req, res) => { res.json(await initiatives.getInitiatives()); }));
app.put("/api/initiatives", wrap(async (req, res) => { await initiatives.saveInitiatives(req.body); res.status(204).end(); }));
app.put("/api/initiatives/:id", wrap(async (req, res) => { await initiatives.upsertInitiative(req.body); res.status(204).end(); }));
app.delete("/api/initiatives/:id", wrap(async (req, res) => { await initiatives.deleteInitiative(String(req.params.id)); res.status(204).end(); }));
```

- [ ] **Step 4: Implement the four methods in `sqlApiService.ts`**

Copy the exact structure of its `savePlannedTasks`/`getPlannedTasks`/`upsertPlannedTask`/`deletePlannedTask` methods, substituting the `/initiatives` path.

- [ ] **Step 5: Typecheck**

Run: `pnpm build`
Expected: no type errors

- [ ] **Step 6: Commit**

```bash
git add server/schema.ts server/repositories/initiatives.ts server/app.ts src/services/sqlApiService.ts
git commit -m "feat: add self-hosted SQL backend parity for initiatives"
```

---

### Task 5: Context wiring (state, CRUD methods, cascade delete)

**Files:**
- Modify: `src/contexts/TimeTrackingContext.tsx`
- Test: `src/contexts/TimeTracking.test.tsx` (new `describe("Initiatives")` block + a case added to the existing project-deletion coverage)

**Interfaces:**
- Consumes: `Initiative` type (Task 1); `DataService.{save,get,upsert,delete}Initiatives` (Tasks 2-4)
- Produces (added to `TimeTrackingContextType` and the provider value):
  ```ts
  initiatives: Initiative[];
  addInitiative: (data: Omit<Initiative, "id" | "status" | "createdAt" | "updatedAt">) => Initiative;
  updateInitiative: (id: string, updates: Partial<Initiative>) => Initiative | null;
  deleteInitiative: (id: string) => void;
  restoreDeletedInitiative: (initiative: Initiative) => void;
  ```

- [ ] **Step 1: Write the failing tests**

```tsx
// in src/contexts/TimeTracking.test.tsx
describe("Initiatives", () => {
  it("adds an initiative with status not_started", async () => {
    const { result } = renderHook(() => useTimeTracking(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.addInitiative({
        projectId: "proj-1", name: "Redesign onboarding", goal: "Cut drop-off",
        deadlineType: "date", deadlineDate: "2026-12-15"
      });
    });

    await waitFor(() => {
      expect(result.current.initiatives).toHaveLength(1);
      expect(result.current.initiatives[0].status).toBe("not_started");
      expect(result.current.initiatives[0].id).toBeTruthy();
    });
  });

  it("updates an initiative's status", async () => {
    const { result } = renderHook(() => useTimeTracking(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.addInitiative({
        projectId: "proj-1", name: "Design system v3", goal: "g",
        deadlineType: "quarter", deadlineQuarter: 1, deadlineYear: 2027
      });
    });
    let id: string;
    await waitFor(() => { id = result.current.initiatives[0].id; });

    await act(async () => {
      result.current.updateInitiative(id, { status: "in_progress" });
    });

    await waitFor(() => {
      expect(result.current.initiatives[0].status).toBe("in_progress");
    });
  });

  it("deletes an initiative", async () => {
    const { result } = renderHook(() => useTimeTracking(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.addInitiative({
        projectId: "proj-1", name: "To delete", goal: "g",
        deadlineType: "date", deadlineDate: "2026-11-01"
      });
    });
    let id: string;
    await waitFor(() => { id = result.current.initiatives[0].id; });

    await act(async () => { result.current.deleteInitiative(id); });

    await waitFor(() => { expect(result.current.initiatives).toHaveLength(0); });
  });

  it("restores a deleted initiative with its original id preserved", async () => {
    const { result } = renderHook(() => useTimeTracking(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.addInitiative({
        projectId: "proj-1", name: "To delete and restore", goal: "g",
        deadlineType: "date", deadlineDate: "2026-11-01"
      });
    });
    let deleted: Initiative;
    await waitFor(() => { deleted = result.current.initiatives[0]; });
    await act(async () => { result.current.deleteInitiative(deleted.id); });
    await waitFor(() => { expect(result.current.initiatives).toHaveLength(0); });

    await act(async () => { result.current.restoreDeletedInitiative(deleted); });

    await waitFor(() => {
      expect(result.current.initiatives).toHaveLength(1);
      expect(result.current.initiatives[0].id).toBe(deleted.id);
    });
  });

  it("deleteProject removes that project's initiatives too", async () => {
    const { result } = renderHook(() => useTimeTracking(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.addProject({ name: "Temp Project", client: "Acme" });
    });
    let projectId: string;
    await waitFor(() => { projectId = result.current.projects.find(p => p.name === "Temp Project")!.id; });

    await act(async () => {
      result.current.addInitiative({
        projectId, name: "Orphan risk", goal: "g", deadlineType: "date", deadlineDate: "2026-11-01"
      });
    });
    await waitFor(() => { expect(result.current.initiatives).toHaveLength(1); });

    await act(async () => { result.current.deleteProject(projectId); });

    await waitFor(() => { expect(result.current.initiatives).toHaveLength(0); });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/contexts/TimeTracking.test.tsx -t Initiatives`
Expected: FAIL — `addInitiative` etc. not defined on the context.

- [ ] **Step 3: Add state and refs**

Add `const [initiatives, setInitiatives] = useState<Initiative[]>([]);`, `const initiativesRef = useRef<Initiative[]>([]);`, `const initiativesLoadedRef = useRef(false);` alongside the existing `plannedTasks`/`plannedTasksRef`/`plannedLoadedRef` declarations (~lines 306-321).

- [ ] **Step 4: Load initiatives in the `loadData` effect**

Immediately after the planned-tasks load block (~line 481), add:
```ts
const loadedInitiatives = await dataService.getInitiatives();
initiativesRef.current = loadedInitiatives;
setInitiatives(loadedInitiatives);
```
Add `initiativesLoadedRef.current = true;` next to the existing `plannedLoadedRef.current = true;` (~line 506). In the post-migration reload block (~lines 494-501), add the equivalent re-fetch-and-set-state for initiatives after `dataService.migrateFromLocalStorage()`.

- [ ] **Step 5: Implement `addInitiative`/`updateInitiative`/`deleteInitiative`/`restoreDeletedInitiative`**

Copy the exact structure of `addPlannedTask`/`updatePlannedTask`/`deletePlannedTask`/`restoreDeletedPlannedTask` (read those, ~lines 1562-1604), substituting `Initiative`/`initiativesRef`/`setInitiatives`/`initiativesLoadedRef`/`upsertInitiative`/`deleteInitiative`. `addInitiative` sets `status: "not_started"` (not `"todo"`) and a fresh `id`/`createdAt`/`updatedAt`; `updateInitiative` returns the updated `Initiative` (or `null` if not found, matching `updateClient`'s return shape) and refreshes `updatedAt`.

- [ ] **Step 6: Cascade-delete on `deleteProject`**

Modify `deleteProject` (~line 1086): after filtering `projectsRef.current`, also filter `initiativesRef.current` down to initiatives whose `projectId !== projectId`, update `initiativesRef.current`/`setInitiatives`, and persist the removal — for each removed initiative, `void dataServiceRef.current?.deleteInitiative(initiative.id)` (single-row deletes, consistent with how `deleteProject` itself persists via a single-row `deleteProject` call rather than a full-list save).

- [ ] **Step 7: Add the new fields/methods to `TimeTrackingContextType` and the provider's returned value** (both the memoized context value object and its dependency array, matching how `plannedTasks`/`addPlannedTask`/etc. are already listed there)

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm vitest run src/contexts/TimeTracking.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/contexts/TimeTrackingContext.tsx src/contexts/TimeTracking.test.tsx
git commit -m "feat: wire initiatives into TimeTrackingContext with cascade delete"
```

---

### Task 6: InitiativeSheet (add/edit form)

**Files:**
- Create: `src/components/InitiativeSheet.tsx`
- Test: `src/components/InitiativeSheet.test.tsx`

**Interfaces:**
- Consumes: `useTimeTracking().addInitiative`/`updateInitiative` (Task 5); `isDeadlineBeforeCreation` (Task 1); `ResponsiveSelect` (existing, `src/components/ui/responsive-select.tsx`)
- Produces:
  ```ts
  interface InitiativeSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: "add" | "edit";
    projectId: string;
    initiative?: Initiative;
  }
  export const InitiativeSheet: React.FC<InitiativeSheetProps>;
  ```

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/InitiativeSheet.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InitiativeSheet } from "./InitiativeSheet";

const addInitiativeMock = vi.fn(() => ({ id: "new-id" }));
const updateInitiativeMock = vi.fn();

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({
    addInitiative: addInitiativeMock,
    updateInitiative: updateInitiativeMock
  })
}));

describe("InitiativeSheet", () => {
  it("renders the Add Initiative title in add mode", () => {
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    expect(screen.getByText("Add Initiative")).toBeInTheDocument();
  });

  it("requires a name before submitting", async () => {
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
    expect(addInitiativeMock).not.toHaveBeenCalled();
  });

  it("rejects a date deadline before today when adding", async () => {
    render(<InitiativeSheet open onOpenChange={() => {}} mode="add" projectId="proj-1" />);
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "Backdated" } });
    fireEvent.change(screen.getByLabelText(/deadline date/i), { target: { value: "2000-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(screen.getByText(/deadline must be on or after/i)).toBeInTheDocument();
    });
    expect(addInitiativeMock).not.toHaveBeenCalled();
  });

  it("submits a valid date-deadline initiative", async () => {
    const onOpenChange = vi.fn();
    render(<InitiativeSheet open onOpenChange={onOpenChange} mode="add" projectId="proj-1" />);
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "Redesign onboarding" } });
    fireEvent.change(screen.getByLabelText(/goal/i), { target: { value: "Cut drop-off" } });
    fireEvent.change(screen.getByLabelText(/deadline date/i), { target: { value: "2099-12-15" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(addInitiativeMock).toHaveBeenCalledWith(expect.objectContaining({
        projectId: "proj-1", name: "Redesign onboarding", deadlineType: "date", deadlineDate: "2099-12-15"
      }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/InitiativeSheet.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `InitiativeSheet.tsx`**

Mirror `ClientSheet.tsx`'s structure (`Sheet`/`Form`/`FormField`/`zodResolver`): fields are `name` (required `Input`), `goal` (`Textarea`), `status` (`ResponsiveSelect` with options `not_started`/`in_progress`/`done`/`blocked`, labeled "Not started"/"In progress"/"Done"/"Blocked"), a deadline-type toggle (two buttons or a `ResponsiveSelect` with options `date`/`quarter`) that conditionally renders either a date `Input[type=date]` (labeled "Deadline date") or a quarter `ResponsiveSelect` (1-4) + year `Input[type=number]` (labeled "Deadline quarter"/"Deadline year"). On submit, build the `Initiative`-shaped payload and call `addInitiative`/`updateInitiative` from `useTimeTracking()` (same add/edit branch as `ClientSheet`'s `onSubmit`). Validate with a Zod `.refine()` that calls `isDeadlineBeforeCreation` against `initiative?.createdAt ?? new Date().toISOString()`, with message "Deadline must be on or after the initiative's creation date." when it fails.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/InitiativeSheet.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/InitiativeSheet.tsx src/components/InitiativeSheet.test.tsx
git commit -m "feat: add InitiativeSheet add/edit form"
```

---

### Task 7: InitiativeTimeline (status-grouped roadmap view)

**Files:**
- Create: `src/components/InitiativeTimeline.tsx`
- Test: `src/components/InitiativeTimeline.test.tsx`

**Interfaces:**
- Consumes: `Initiative` type (Task 1); `resolveInitiativeDeadline` (Task 1)
- Produces:
  ```ts
  interface InitiativeTimelineProps {
    initiatives: Initiative[];
    onSelect: (initiative: Initiative) => void;
  }
  export const InitiativeTimeline: React.FC<InitiativeTimelineProps>;
  ```

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/InitiativeTimeline.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InitiativeTimeline } from "./InitiativeTimeline";
import type { Initiative } from "@/contexts/TimeTrackingContext";

const make = (overrides: Partial<Initiative>): Initiative => ({
  id: "i1", projectId: "p1", name: "Initiative", goal: "g",
  status: "not_started", deadlineType: "date", deadlineDate: "2026-12-15",
  createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
  ...overrides
});

describe("InitiativeTimeline", () => {
  it("renders an empty state with no initiatives", () => {
    render(<InitiativeTimeline initiatives={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/no initiatives yet/i)).toBeInTheDocument();
  });

  it("groups initiatives into their status swimlanes", () => {
    render(<InitiativeTimeline initiatives={[
      make({ id: "a", name: "A", status: "in_progress" }),
      make({ id: "b", name: "B", status: "blocked" })
    ]} onSelect={vi.fn()} />);

    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.queryByText("Done")).not.toBeInTheDocument();
  });

  it("renders a bar for a quarter-deadline initiative using its resolved end date", () => {
    render(<InitiativeTimeline initiatives={[
      make({ id: "q", name: "Quarter one", deadlineType: "date", deadlineDate: undefined,
             deadlineQuarter: 1, deadlineYear: 2027 })
    ]} onSelect={vi.fn()} />);
    // deadline shown as a formatted label somewhere in the row
    expect(screen.getByText(/q1 2027/i)).toBeInTheDocument();
  });

  it("calls onSelect when a bar is clicked", () => {
    const onSelect = vi.fn();
    const initiative = make({ id: "a", name: "Clickable" });
    render(<InitiativeTimeline initiatives={[initiative]} onSelect={onSelect} />);
    screen.getByText("Clickable").click();
    expect(onSelect).toHaveBeenCalledWith(initiative);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/InitiativeTimeline.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `InitiativeTimeline.tsx`**

Fixed grouping order: `in_progress`, `not_started`, `blocked`, `done` (only render a swimlane for a status that has at least one initiative — Review Focus: empty project shows a single "No initiatives yet" message instead of four empty groups). Each swimlane is a `Card`-or-plain-`div` header (status label + count) followed by one row per initiative: a fixed-width name column, then a bar `div` positioned with inline `style={{ left: ..., width: ... }}` percentages computed from `createdAt` → `resolveInitiativeDeadline(initiative)` against a fixed default window (trailing 1 month + forward 5 months from today, per the spec's "Left to the builder"). Bar color per status using Radix scale classes: `in_progress` → blue (`bg-blue-9`), `done` → green (`bg-green-9`), `blocked` → red (`bg-red-9`), `not_started` → gray (`bg-mauve-9`) — matching `COLUMN_BADGE_COLORS`' role in `KanbanColumn.tsx` for the three shared statuses, with `not_started` as a new neutral key per the spec's builder note. A vertical "Today" line (`bg-red-9`, absolutely positioned) spans the full timeline height. Each bar's label includes the initiative name and a formatted deadline (`"Dec 15, 2026"` for a date deadline, `"Q1 2027"` for a quarter one). Clicking a bar or row calls `onSelect(initiative)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/InitiativeTimeline.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/InitiativeTimeline.tsx src/components/InitiativeTimeline.test.tsx
git commit -m "feat: add InitiativeTimeline status-grouped roadmap view"
```

---

### Task 8: ProjectPlanning page, route, and nav entry point

**Files:**
- Create: `src/pages/ProjectPlanning.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/ProjectList.tsx`
- Test: `src/pages/ProjectPlanning.test.tsx`

**Interfaces:**
- Consumes: `InitiativeTimeline` (Task 7), `InitiativeSheet` (Task 6), `useTimeTracking().{projects,initiatives}` (Task 5), `PageLayout` (existing)
- Produces: route `/projects/:id/planning`; a "Planning" link in each `ProjectList` row.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/pages/ProjectPlanning.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProjectPlanning from "./ProjectPlanning";

vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({
    projects: [{ id: "proj-1", name: "Product and Design", client: "Acme" }],
    initiatives: []
  })
}));
vi.mock("@/components/InitiativeTimeline", () => ({
  InitiativeTimeline: () => <div>timeline</div>
}));

const renderAt = (id: string) =>
  render(
    <MemoryRouter initialEntries={[`/projects/${id}/planning`]}>
      <Routes>
        <Route path="/projects/:id/planning" element={<ProjectPlanning />} />
      </Routes>
    </MemoryRouter>
  );

describe("ProjectPlanning", () => {
  it("renders the project's name and the timeline for a valid id", () => {
    renderAt("proj-1");
    expect(screen.getByText("Product and Design")).toBeInTheDocument();
    expect(screen.getByText("timeline")).toBeInTheDocument();
  });

  it("shows a not-found state for an id with no matching project", () => {
    renderAt("missing-id");
    expect(screen.getByText(/project not found/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /projects/i })).toHaveAttribute("href", "/projectlist");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/pages/ProjectPlanning.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ProjectPlanning.tsx`**

`useParams<{ id: string }>()` for the project id; look it up in `projects` from `useTimeTracking()`. If not found, render a centered "Project not found" message with a `Link` to `/projectlist` (Review Focus — spec's builder note on the missing-`:id` case). If found, wrap in `PageLayout` with the project's `name` as `title` and a "+ New Initiative" `actions` button that opens `InitiativeSheet` in `"add"` mode; filter `initiatives` to that project's `id` and pass to `InitiativeTimeline`, with `onSelect` opening `InitiativeSheet` in `"edit"` mode for the clicked initiative.

- [ ] **Step 4: Add the route in `App.tsx`**

Add `const ProjectPlanning = lazy(() => import("./pages/ProjectPlanning"));` with the other lazy imports, and `<Route path="/projects/:id/planning" element={<ProjectPlanning />} />` above the catch-all `*` route.

- [ ] **Step 5: Add a "Planning" link to each row in `ProjectList.tsx`**

In `ItemActions` (~line 188), add a `Button variant="outline" asChild` wrapping a `Link to={`/projects/${project.id}/planning`}` with a `CalendarRange` icon (`lucide-react`) and "Planning" label, placed before the existing Edit button.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm vitest run src/pages/ProjectPlanning.test.tsx`
Expected: PASS

- [ ] **Step 7: Full verification**

Run: `pnpm lint && pnpm build && pnpm vitest run`
Expected: all pass

- [ ] **Step 8: Commit**

```bash
git add src/pages/ProjectPlanning.tsx src/App.tsx src/components/ProjectList.tsx src/pages/ProjectPlanning.test.tsx
git commit -m "feat: add per-project planning page and route"
```

---

## Self-Review

**1. Spec coverage:** Data model (Task 1), dual-storage persistence incl. SQL backend (Tasks 2-4), context wiring incl. cascade delete (Task 5), add/edit UI incl. deadline validation (Task 6), timeline visualization incl. quarter-as-point and status grouping (Task 7), route/nav placement incl. not-found handling (Task 8). All "Decisions made" and "Left to the builder" items from the spec map to a task. Zoom and cross-project view are explicitly out of scope and have no task, matching the spec's Non-goals.

**2. Step scan:** Reviewed each step; code steps carry exact signatures/field names and point to the specific existing file to mirror rather than restating its body, since the whole codebase's established pattern (`PlannedTask`) already is the algorithm.

**3. Type consistency:** `Initiative`/`InitiativeStatus`/`InitiativeDeadlineType` field names (`projectId`, `deadlineType`, `deadlineDate`, `deadlineQuarter`, `deadlineYear`) are used identically from Task 1 through Task 8. `addInitiative`/`updateInitiative`/`deleteInitiative`/`restoreDeletedInitiative` names match across Tasks 5, 6, and 8.

**4. Review Focus:** Each of the five items has an owning task and test: partial quarter deadline (Task 1, `resolveInitiativeDeadline` null-return tests), deadline-before-creation (Task 6, rejection test), project deletion cascade (Task 5, cascade test), invalid `:id` route (Task 8, not-found test), empty-project timeline (Task 7, empty-state test).

**5. Proportion:** The plan is long because it threads one new entity through six existing subsystems (guest storage, Supabase, self-hosted SQL, context, two new components, routing) that each already have an established pattern to mirror — most of the length is "copy file X's structure," not new logic. No task invents algorithmic complexity beyond date math already isolated in Task 1.
