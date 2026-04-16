# PageLayout Component Design

**Date:** 2026-04-16
**Scope:** Shared layout wrapper to eliminate repeated page boilerplate across all pages

---

## Overview

Every page in the app repeats the same structural boilerplate: `min-h-screen` wrapper, `<SiteNavigationMenu />`, a constrained header section with title and optional actions, and a constrained content section. `PageLayout` extracts this into a single component and makes the background color a single fix point for future dark mode support.

---

## Component API

**File:** `src/components/PageLayout.tsx`

```tsx
interface PageLayoutProps {
  title?: string;                // Optional — omit for pages like Index that have no h1
  icon?: React.ReactNode;        // Icon displayed before the title
  actions?: React.ReactNode;     // Buttons/controls on the right side of the header
  description?: React.ReactNode; // Subtitle text below the title
  children: React.ReactNode;     // Main page content
}
```

---

## Rendered Structure

### When `title` is provided

```tsx
<div className="min-h-screen bg-background">
  <SiteNavigationMenu />
  <div className="max-w-6xl mx-auto pt-4 pb-2 px-4 md:p-6 print:p-4">
    <div className="flex items-center justify-between">
      <h1 className="md:text-2xl font-bold text-foreground flex items-center gap-2">
        {icon}
        {title}
      </h1>
      {actions && <div className="print:hidden">{actions}</div>}
    </div>
    {description && (
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    )}
  </div>
  <div className="max-w-6xl mx-auto p-6 print:p-4">
    {children}
  </div>
</div>
```

### When `title` is omitted

```tsx
<div className="min-h-screen bg-background">
  <SiteNavigationMenu />
  {children}
</div>
```

---

## Color Standardization

All pages currently use `bg-gradient-to-br from-gray-50 to-blue-50`. `PageLayout` uses `bg-background` instead — the theme variable already used by the cleaned Settings page. This eliminates all gradient instances in a single change and makes the background easily overridable for dark mode.

---

## Page Migration

| Page | title | icon | actions | description |
|------|-------|------|---------|-------------|
| `Settings.tsx` | "Settings" | `<CogIcon />` | — | — |
| `Archive.tsx` | "Archive" | `<ArchiveIcon />` | — | — |
| `ProjectList.tsx` | "Project List" | `<Briefcase />` | Reset to Defaults + Add Project | — |
| `Categories.tsx` | "Categories" | `<TagIcon />` | Add Category | — |
| `Report.tsx` | "Weekly Report" | `<CalendarCheck />` | — | subtitle `<p>` |
| `Index.tsx` | _(omitted)_ | — | — | — |

**Index.tsx notes:**
- Uses `PageLayout` without a `title` so children render directly after the nav
- Its internal layout (`max-w-6xl`, spacing) stays intact inside `children`
- The existing conditional render paths (day summary view, loading view) each need the wrapper individually

---

## What Changes Per Page

When migrating each page:
1. Remove the outer `<div className="min-h-screen bg-gradient-...">` wrapper
2. Remove the `<SiteNavigationMenu />` import and JSX call
3. Remove the header `<div className="max-w-6xl mx-auto pt-4 pb-2 ...">` section
4. Replace all of the above with `<PageLayout title="..." icon={...} actions={...}>`
5. The content `<div className="max-w-6xl mx-auto p-6 ...">` becomes `children` — its inner contents move up one level (the wrapper div is removed)
6. Fix remaining hardcoded color violations in each page as part of the same pass (Item 5 of the improvement plan)

---

## Out of Scope

- The `NotFound` page uses a centered layout that does not match this pattern — leave it as-is
- Dark mode implementation — `bg-background` sets up the hook; actual dark mode tokens are a future task
- The `DaySummary` early-return path in `Archive.tsx` and the empty-state path in `Report.tsx` should also be wrapped with `PageLayout` to keep them consistent
