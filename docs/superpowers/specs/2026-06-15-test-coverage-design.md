# Test Coverage Expansion — Design Spec

**Date:** 2026-06-15
**Status:** Approved

## Goal

Expand the existing 93-test suite to cover all key business logic and a selection of critical UI components, using Vitest + React Testing Library. Tests run in CI via `npm run test`.

## Current State

9 test files, 93 tests passing. Coverage gaps:

- `calculationUtils.ts` — zero tests (billing/revenue math)
- `checklistUtils.ts` — zero tests (GFM parse/toggle)
- `exportUtils.ts` — zero tests (CSV/JSON/invoice)
- TimeTrackingContext — todos, planned tasks, project CRUD, category CRUD, discardDay, adjustTaskTime, addBackdatedDay, archiveClient/restoreClient have no coverage
- Components — only PageLayout and SummaryOutput are tested

## Scope

**In scope:**
- Pure utility tests (calculationUtils, checklistUtils, exportUtils)
- Context integration tests extending TimeTracking.test.tsx
- Render tests: NewTaskForm, TaskItem

**Out of scope:**
- Full page tests (Archive, Report, ProjectList, etc.)
- Supabase service tests (require live or mocked Supabase client)
- Playwright E2E

## File Plan

| File | Status | Tests to add |
|---|---|---|
| `src/utils/calculationUtils.test.ts` | New | getDayStats, getHoursWorkedForDay, getRevenueForDay, getBillableHoursForDay, getNonBillableHoursForDay, getTotalHoursForPeriod, getRevenueForPeriod |
| `src/utils/checklistUtils.test.ts` | New | parseTaskChecklist (empty, unchecked, checked, mixed, edge cases), toggleDescriptionChecklistItem |
| `src/utils/exportUtils.test.ts` | New | exportToCSV shape/headers/filtering, exportToJSON roundtrip, generateInvoiceData |
| `src/contexts/TimeTracking.test.tsx` | Extend | Todo CRUD, planned task CRUD + move + pull, project CRUD + archive/restore, category CRUD, discardDay, adjustTaskTime, addBackdatedDay, archiveClient/restoreClient |
| `src/components/NewTaskForm.test.tsx` | New | Renders fields, submit calls startNewTask, title required validation |
| `src/components/TaskItem.test.tsx` | New | Renders title/time, delete button fires callback, edit opens dialog |

## Constraints

- All tests use `vi.mock` for external deps (useAuth, useHaptics, useAppLifecycle)
- No real Supabase calls — all tests run with `createDataService(false)` (localStorage)
- Follow project code style: double quotes, 2-space indent
- `@/` import alias throughout
- No `npm run test` until explicitly asked
