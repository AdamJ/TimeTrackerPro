# TimeTracker Pro — Improvements & Standardization Design

**Date:** 2026-04-15
**Scope:** Sprint backlog of prioritized improvements + ongoing standardization guidelines for new feature development

---

## Overview

This document captures two things:

1. A **prioritized backlog** of existing issues to work through — organized into three effort tiers
2. **Ongoing standards** to apply when building any new feature or component

---

## Part 1: Sprint Backlog

### Tier 1 — Quick Wins (high impact, low effort)

#### 1. Replace all `confirm()` dialogs with AlertDialog

**Files affected:**
- `src/components/ArchiveItem.tsx`
- `src/components/ProjectManagement.tsx`
- `src/components/ArchiveEditDialog.tsx`
- `src/components/CategoryManagement.tsx`
- `src/pages/Settings.tsx`
- `src/pages/ProjectList.tsx`
- `src/pages/Categories.tsx`

**Why:** Native `confirm()` is an anti-pattern in PWAs — it blocks the main thread, cannot be styled, and fails accessibility standards. shadcn/ui `AlertDialog` is already available in the project. 10 instances exist across 6+ files.

**Pattern to use:**
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleAction}>Confirm</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

#### 2. Fix hardcoded color in PageLoader spinner

**File:** `src/App.tsx:26`

`border-gray-900` on the loading spinner should be `border-primary` to respect the theme and support dark mode.

---

#### 3. Standardize colors in Settings.tsx

**File:** `src/pages/Settings.tsx`

~15 hardcoded color violations: `text-gray-900`, `text-gray-600`, `text-blue-600`, `text-green-600`, `bg-gradient-to-br from-gray-50 to-blue-50`, `text-red-600`. Highest density of violations in a single page file.

---

### Tier 2 — Medium Effort, High Value

#### 4. Create a shared `PageLayout` component

**New file:** `src/components/PageLayout.tsx`

Every page repeats the same boilerplate — `min-h-screen bg-gradient-to-br from-gray-50 to-blue-50`, `<SiteNavigationMenu />`, `max-w-6xl mx-auto` header container. Affected pages: Index, Archive, Settings, ProjectList, Categories, Report.

A shared component eliminates this duplication and makes the background gradient a single-point fix for dark mode support later.

**Proposed API:**
```tsx
<PageLayout title="Settings" icon={<CogIcon />}>
  {/* page content */}
</PageLayout>
```

---

#### 5. Sweep remaining hardcoded colors in all pages

**Files:** `src/pages/Index.tsx`, `src/pages/Archive.tsx`, `src/pages/ProjectList.tsx`, `src/pages/Categories.tsx`, `src/pages/Report.tsx`

After Settings (Tier 1), these pages still contain significant hardcoded color violations. Should be done after `PageLayout` is created so the gradient is handled automatically.

---

### Tier 3 — Larger Refactors (do with a clear window)

#### 6. Consolidate duplicate project management logic

`src/pages/ProjectList.tsx` (364 lines) and `src/components/ProjectManagement.tsx` (312 lines) both implement nearly identical CRUD for projects — same form fields, same state shape, same `confirm()` patterns. They've diverged slightly (`isBillable` exists in ProjectList but not ProjectManagement's form). The form logic should live in one shared component used by both the page and the modal.

---

#### 7. Consolidate duplicate category management logic

Same pattern as above: `src/pages/Categories.tsx` (330 lines) and `src/components/CategoryManagement.tsx` duplicate CRUD logic for categories.

---

#### 8. Split TimeTrackingContext

`src/contexts/TimeTrackingContext.tsx` is 1022 lines managing too many concerns. Natural split points:
- Task operations (start, stop, update, delete)
- Day lifecycle (start day, end day, post day)
- Archive operations
- Todo/checklist (newest addition — already somewhat isolated)

Not urgent since the file works, but will become a pain point as features are added.

---

#### 9. Expand test coverage

Currently only 4 test files exist for the entire app. Highest-value additions:
- Component tests for destructive-action flows (delete project, clear all data, delete archive entry)
- Integration tests for the guest → authenticated data migration path — highest-risk logic in the app
- Unit tests for `exportUtils.ts` and `reportUtils.ts` (complex logic, no current coverage)

---

## Part 2: Ongoing Standardization Guidelines

Apply these rules when building any new feature or component.

---

### Colors & Theming

Never use hardcoded Tailwind color classes. Always use theme variables:

| Instead of | Use |
|---|---|
| `text-gray-900` | `text-foreground` |
| `text-gray-600` / `text-gray-500` | `text-muted-foreground` |
| `text-blue-600` / `text-blue-500` | `text-primary` |
| `text-green-600` | `text-chart-2` or semantic equivalent |
| `text-red-600` / `text-red-700` | `text-destructive` |
| `bg-blue-500` / `bg-blue-600` | `bg-primary` |
| `bg-red-50` / `border-red-*` | `bg-destructive/10` / `border-destructive/20` |
| `bg-gray-50` / `bg-gray-100` | `bg-muted` |
| `bg-gradient-to-br from-gray-50 to-blue-50` | Handled by `PageLayout` (once built) |
| `border-gray-*` | `border-border` |

---

### Destructive Actions

Never use `confirm()`, `alert()`, or `prompt()`. Every destructive action uses `AlertDialog`. Multi-step destructive actions (e.g., "clear ALL data") should use a two-step confirmation within the same `AlertDialog` rather than two consecutive `confirm()` calls.

---

### New Pages

Every new page uses `PageLayout` (once built in Tier 2). Until then, copy the pattern from an already-cleaned page. New pages must not introduce hardcoded colors or `confirm()` calls.

---

### Data Persistence

Never read from localStorage directly. Always go through the DataService via context:

```tsx
// ✅ CORRECT — works for both guest and authenticated users
const { archivedDays } = useTimeTracking();

// ❌ WRONG — silently breaks for Supabase users
const raw = localStorage.getItem("timetracker_archived_days");
```

---

### Dual-Mode Compatibility

Every new feature must work in both guest (localStorage) and authenticated (Supabase) modes. Before considering any feature complete, verify in both modes. Features that genuinely require authentication must:
1. Be gated with `ProtectedRoute`
2. Show a clear explanation to guest users — never silently omit functionality

---

### Feedback & Confirmation Patterns

| Situation | Pattern |
|---|---|
| Destructive action (delete, clear, reset) | `AlertDialog` — blocks until confirmed |
| Success feedback | `toast()` via sonner — non-blocking |
| Error feedback | `toast()` with destructive variant |
| Form validation errors | Inline field-level messages via React Hook Form + Zod |

No new `alert()`, `confirm()`, or `prompt()` calls, ever.

---

### Icon Usage

1. **Primary:** Radix Icons (`@radix-ui/react-icons`)
2. **Fallback:** Lucide (`lucide-react`) when Radix doesn't have the icon needed

Don't mix both in the same component without reason.
