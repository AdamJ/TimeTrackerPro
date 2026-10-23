# Planning View Design

**Date:** 2026-10-23
**Status:** Draft — awaiting approval

## Intent

Timetraked currently manages day-to-day time tracking and a flat task board, but has no
way to express higher-level goals: "what is this project trying to accomplish, and by
when." Adam runs multiple client/personal projects concurrently and needs a per-project
view that lays out each project's goals against time, so overlapping deadlines are
visible at a glance during planning sessions.

## Goals

- Let a project define one or more **initiatives**: a name, a goal description, a
  deadline, and a manually-set status.
- Give each existing `Project` its own **planning view** — a timeline showing that
  project's initiatives, so concurrent/overlapping work is visible.
- Support deadlines as either a specific date or a calendar quarter (e.g. "Q1 2027").
- Work in both guest mode (localStorage) and authenticated mode (Supabase), following
  the app's existing dual-storage pattern.

## Non-goals (v1)

- No cross-project planning view (each project's planning view is independent/scoped).
- No automatic status derivation from linked tasks/todos — status is set manually.
- No zoom/scale switching (week/month/quarter/year) on the timeline — fixed month-scale
  view for v1. Zoom is an explicit follow-up, not part of this work.
- No `server/` (self-hosted SQL backend) parity in this pass — see Open Items.

## Anti-goals

- Don't let this become a second task-tracking system — initiatives are coarse-grained
  goals, not a replacement for `PlannedTask`/the Kanban board.
- Don't couple initiative status to task completion — that's an explicit non-goal above,
  not an oversight.

## Decisions made (Adam's calls)

1. An initiative belongs to exactly one existing `Project` (the time-tracking project
   entity) — not a new top-level grouping that spans projects.
2. The planning/overlap view is scoped per project; there is no combined view across
   projects.
3. Status is a manual field: `Not started` / `In progress` / `Done` / `Blocked`. Not
   derived from linked tasks.
4. An initiative has no explicit start date — it appears on the timeline from its
   `createdAt` through its deadline.
5. Quarter deadlines use standard calendar quarters (Q1 = Jan–Mar, etc.).
6. A quarter deadline renders as a single point at the end of that quarter, not a block
   spanning the whole quarter.
7. Visual direction: GitHub Projects' Roadmap view — rows grouped into collapsible
   swimlanes by status, a continuous month-scale timeline, bars running creation→deadline
   labeled with name + deadline, and a "Today" marker line. Confirmed via mockup
   (`.superpowers/brainstorm/12819-1792774186/content/layout-v2.html`).
8. Zoom control (switching month/quarter/year scale) ships later as a nice-to-have, not
   in v1.

## Data model

New entity, following the existing `Project`/`Client`/`PlannedTask` pattern in
`src/contexts/TimeTrackingContext.tsx`:

```ts
export type InitiativeStatus = "not_started" | "in_progress" | "done" | "blocked";
export type InitiativeDeadlineType = "date" | "quarter";

export interface Initiative {
  id: string;
  projectId: string;          // FK to Project.id
  name: string;
  goal: string;                // free-text description of the outcome
  status: InitiativeStatus;
  deadlineType: InitiativeDeadlineType;
  deadlineDate?: string;       // ISO date string; set when deadlineType === "date"
  deadlineQuarter?: number;    // 1-4; set when deadlineType === "quarter"
  deadlineYear?: number;       // calendar year; set when deadlineType === "quarter"
  createdAt: string;           // ISO string — timeline start point
  updatedAt: string;           // ISO string
}
```

A `deadlineDate(initiative)` helper resolves the effective deadline to a single `Date`
for timeline math: the stored date, or the last calendar day of
`deadlineQuarter`/`deadlineYear`.

**Why `projectId` and not a project-name string:** `Task.project` and
`PlannedTask.project` are denormalized name strings (matching how the app already
references projects elsewhere). Initiatives are reached via a per-project route
(`/projects/:id/planning`) where the project is already known by id, and a name-based
link would silently detach from its project on rename. This is a deliberate departure
from the existing string-reference convention — flagged for Adam to confirm, not a free
pass to diverge elsewhere.

## Persistence

Mirrors the `PlannedTask` pattern exactly (single-row upsert + bulk save, no bulk
inclusion in `forceSyncToDatabase`):

- **`DataService` interface** (`src/services/dataService.ts`): add
  `saveInitiatives`, `getInitiatives`, `upsertInitiative`, `deleteInitiative`.
- **Guest mode**: `src/services/localStorageService/initiatives.ts`, new
  `STORAGE_KEYS.INITIATIVES = "timetracker_initiatives"` in `constants.ts`, versioned
  read/write via the existing `readVersioned`/`writeVersioned` helpers.
- **Authenticated mode**: new Supabase table `planning_initiatives` (migration under
  `supabase/migrations/`), with `project_id text references public.projects(id) on
  delete cascade` (confirm `projects.id`'s column type when writing the migration — it
  is not UUID-generated, since default project ids look like `"default-work"`), RLS
  scoped to `user_id`, plus `supabaseService.ts` methods following the
  `savePlannedTasks`/`upsertPlannedTask`/`deletePlannedTask`/`getPlannedTasks` shape
  (including `trackDbCall` instrumentation).
- **Context** (`TimeTrackingContext.tsx`): `initiatives` state + `addInitiative`,
  `updateInitiative`, `deleteInitiative` methods, persisted via `upsertInitiative`
  (single-row), same as `addClient`/`updateClient`.

## UI

- **Route**: `/projects/:id/planning` (new — there is currently no per-project detail
  route; `ProjectList.tsx` is a flat list with an edit sheet, no drill-in). Add a
  "Planning" link/button to each row in `ProjectList.tsx`'s `ItemActions`.
- **Page** (`src/pages/ProjectPlanning.tsx`): `PageLayout` wrapper, project name as
  title, "+ New Initiative" action.
- **Timeline component** (`src/components/InitiativeTimeline.tsx`): rows grouped into
  collapsible swimlanes by status (fixed grouping for v1 — no configurable group-by);
  continuous month-scale header; each initiative rendered as a rounded bar from
  `createdAt` to its resolved deadline, labeled with name + formatted deadline; a
  vertical "Today" line; status-colored bars matching the badge palette already used
  elsewhere (e.g. `PlannedTaskStatus` badge colors in the Kanban board, for visual
  consistency).
- **Add/edit**: an `InitiativeSheet` component (mirrors `ClientSheet`/`ProjectSheet`'s
  shared add/edit Sheet pattern) — name, goal (textarea), status select, deadline type
  toggle (date picker vs. quarter+year picker).
- Uses `ResponsiveSelect` for the status/deadline-type pickers, consistent with the
  rest of the app's mobile/desktop select pattern.

## Testing

Follow the project's existing coverage pattern (see `AGENTS.md`'s test inventory):

- `src/services/localStorageService/initiatives.test.ts` — save/load/upsert/delete
  round-trips (mirrors `plannedTasks` coverage once added).
- `src/services/supabaseService.test.ts` — add initiative upsert/bulk-save/delete cases.
- `src/contexts/TimeTracking.test.tsx` — add/update/delete initiative methods.
- `src/components/InitiativeTimeline.test.tsx` — grouping, bar positioning for both
  date and quarter deadlines, today-line placement.
- `src/components/ProjectPlanning.test.tsx` (or page-level) — render, add/edit flow.

## Left to the builder

- Exact bar color tokens (must use semantic/Radix-scale classes per `AGENTS.md`'s
  non-negotiable color rules — mockup colors were illustrative only).
- Exact month-range window shown by default (e.g. trailing 1 month + forward 5 months,
  centered on today) when a project has initiatives spanning a wide range.
- Whether "Done" initiatives' swimlane defaults to collapsed (mockup showed this but it
  wasn't explicitly confirmed).
- `sqlApiService.ts` (self-hosted SQL backend) parity — out of scope per Non-goals, but
  the interface addition means it needs stub/throwing implementations or the build
  breaks; builder decides the minimal safe approach (likely matching however that file
  currently handles `PlannedTask`).
- **Deleting a project deletes its initiatives too.** `deleteProject` in
  `TimeTrackingContext.tsx` has no cascade logic today for any related entity, and
  guest-mode localStorage has no DB-level cascade. To avoid orphaned initiatives nobody
  can see or manage, `deleteProject` filters out that project's initiatives (and
  persists via `deleteInitiative`/`saveInitiatives`) the same way it filters the
  project itself. Supabase's `ON DELETE CASCADE` on `planning_initiatives.project_id`
  handles the authenticated-mode case at the DB level.
- **`not_started` status color.** `InitiativeStatus` doesn't reuse
  `PlannedTaskStatus`'s `"todo"` key, so there's no existing badge color to inherit for
  it. Use a neutral gray Radix scale (matching the mockup), parallel to how `"todo"` is
  styled in `KanbanColumn.tsx`'s `COLUMN_BADGE_COLORS` — i.e. same visual role, new key.
- **Unknown/missing `:id` on `/projects/:id/planning`.** No dynamic route exists
  elsewhere in the app to copy. If `:id` doesn't match any project (stale bookmark,
  deleted/archived project), show the page's existing empty-state treatment ("Project
  not found") with a link back to `/projectlist`, rather than a blank page or crash.
- **Deadline before `createdAt`.** Mirrors the app's existing invariant pattern
  (`isEndBeforeStart`/`END_BEFORE_START_MESSAGE` for task times): the `InitiativeSheet`
  rejects a deadline earlier than the initiative's `createdAt` with an inline validation
  message, consistent with how the rest of the app already treats backwards time ranges
  as a validation error rather than silently allowing them.

## Open items

- `server/` SQL backend parity is explicitly deferred (Non-goals) but the `DataService`
  interface is shared — see "Left to the builder" above.
- Zoom (week/month/quarter/year scale) is a known, explicitly deferred follow-up, not
  tracked further here.
