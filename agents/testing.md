# Testing & Quality — Timetraked

## Running Tests

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Single file
pnpm test src/utils/calculationUtils.test.ts

# Linting
pnpm lint

# Type checking (via build)
pnpm build
```

---

## Test Suite Overview (187 tests across 14 files)

| File | Tests | What's Covered |
|---|---|---|
| `src/utils/calculationUtils.test.ts` | 18 | Billing math: `getDayStats`, `getHoursWorkedForDay`, `getRevenueForDay`, `getBillableHoursForDay`, `getNonBillableHoursForDay`, `getTotalHoursForPeriod`, `getRevenueForPeriod` |
| `src/utils/checklistUtils.test.ts` | 13 | GFM checklist: `parseTaskChecklist` (empty, unchecked, checked, mixed, uppercase X, lineIndex), `toggleDescriptionChecklistItem` |
| `src/utils/exportUtils.test.ts` | 16 | `exportToCSV` (headers, row count, duration filter, date range, userId), `exportToJSON` (valid JSON, keys, totalDays, date filter), `generateInvoiceData` (client match, zero, period), `parseCSVImport` (empty, missing headers, well-formed, invalid date) |
| `src/utils/reportUtils.test.ts` | 21 | Report generation utilities |
| `src/utils/timeUtil.test.ts` | 9 | Time formatting |
| `src/contexts/TimeTracking.test.tsx` | 47 | Day/task/archive lifecycle, checklist carry-over, project merge, client CRUD, **todo items** (add/toggle/delete/clearCompleted), **planned tasks** (add/update/delete/move/pull), **project CRUD** (add/update/delete/archive/restore/reset), **category CRUD**, **discardDay**, **adjustTaskTime**, **addBackdatedDay**, **archiveClient/restoreClient** (including active-project blocking guard) |
| `src/services/dataService.test.ts` | 12 | `LocalStorageService` save/load for current day, archived days, clients |
| `src/hooks/useReportStorage.test.ts` | 6 | Report storage hook |
| `src/hooks/useReportSummary.test.ts` | 1 | Report summary hook |
| `src/components/PageLayout.test.tsx` | 8 | Children render, `setTitle`/`setActions` called, no inline heading/nav |
| `src/components/SummaryOutput.test.tsx` | 7 | Summary output rendering |
| `src/components/NewTaskForm.test.tsx` | 9 | Renders fields, submit calls `onSubmit` with correct args, empty-title validation, whitespace rejection, form clears after submit, cancel, FAB toggle |
| `src/components/TaskItem.test.tsx` | 10 | Title/description/project/client/category badge render, Active badge, delete confirm flow (`onDelete` called with id), edit dialog opens |
| `src/components/dateParsing.test.ts` | 10 | Date parsing utilities |

---

## Context Integration Test Pattern

Context tests must wait for `loading` to be `false` before calling mutations — the async `loadData()` call (which loads from localStorage/Supabase) can race with and overwrite state set before it completes:

```tsx
const { result } = renderHook(() => useTimeTracking(), { wrapper });
await waitFor(() => expect(result.current.loading).toBe(false));
// now safe to mutate
await act(async () => {
  result.current.addTodoItem("Buy groceries");
});
await waitFor(() => {
  expect(result.current.todoItems[0].text).toBe("Buy groceries");
});
```

The `wrapper` is defined at the top of the file:

```tsx
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TimeTrackingProvider>{children}</TimeTrackingProvider>
);
```

---

## Component Test Mocking Patterns

For components that consume `useTimeTracking`:

```tsx
vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({ projects: [], categories: [] })
}));
```

For components that use long-press:

```tsx
vi.mock("@/hooks/useLongPress", () => ({ useLongPress: () => ({}) }));
```

For dialog dependencies (minimal mocks that expose just enough to test interactions):

```tsx
vi.mock("@/components/TaskEditDialog", () => ({
  TaskEditDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="edit-dialog" /> : null
}));
vi.mock("@/components/DeleteConfirmationDialog", () => ({
  DeleteConfirmationDialog: ({ isOpen, onConfirm }: any) =>
    isOpen ? <button onClick={onConfirm}>Confirm Delete</button> : null
}));
```

---

## Test Setup

`src/test-setup.ts` provides globally:
- Supabase client mock (`vi.mock("@/lib/supabase", ...)`)
- `localStorage` mock (in-memory store)
- `URL.createObjectURL` / `revokeObjectURL` stubs
- `vi.setSystemTime(new Date("2024-12-03T10:00:00.000Z"))` — fixed clock for all tests
- `@testing-library/jest-dom/vitest` matchers

---

## Manual Testing Checklist

**Before submitting any change:**

- [ ] Test in guest mode (no authentication)
- [ ] Test in authenticated mode
- [ ] Test on mobile viewport
- [ ] Test data persistence (refresh page)
- [ ] Test export/import functionality if relevant
- [ ] Verify no console errors
- [ ] Check responsive design

---

## Code Quality Requirements

1. **All lint errors must be fixed** before committing — run `npm run lint`
2. **All TypeScript errors must be fixed** before merging — run `npm run build`
3. **Manual testing** of changed functionality required
4. **No breaking changes** without documentation

---

## Pre-Commit Checklist

Before every commit, verify:

- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` passes with no type errors
- [ ] 2-space indentation (not tabs) used throughout
- [ ] Double quotes used throughout
- [ ] `@/` import aliases used (no relative paths)
- [ ] Changed functionality tested manually
