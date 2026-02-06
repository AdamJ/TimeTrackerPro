# Scroll Time Picker Design

**Date:** 2026-02-06
**Status:** Approved

## Problem

Time selection uses Select dropdowns with 96 options (15-minute intervals across 24 hours). Users must scroll through a long list to find their desired time. Poor UX especially for times later in the day.

## Solution

Replace Select dropdowns with a custom scroll-wheel time picker (iOS drum-picker style). Three columns: Hour (1-12), Minute (00/15/30/45), Period (AM/PM). CSS scroll-snap locks selection. Produces the same `"HH:MM"` 24-hour string format.

## Component

**File:** `src/components/ui/scroll-time-picker.tsx`

**Props:**

- `value: string` — "HH:MM" 24-hour format
- `onValueChange: (value: string) => void`
- `disabled?: boolean`
- `className?: string`

**Wheels:**

- Hour: 1–12 (scroll-snap)
- Minute: 00, 15, 30, 45 (scroll-snap)
- Period: AM, PM (scroll-snap)

**Styling:** shadcn/ui design tokens, dark mode via theme variables.

## Integration Points

1. `StartDayDialog.tsx` — 1 picker (start time)
2. `TaskEditDialog.tsx` — 2 pickers (start + end)
3. `ArchiveEditDialog.tsx` — 2 pickers (day start/end) + 2 per task (task start/end)

Drop-in replacement: same value/onValueChange interface as current Select. Remove duplicated `generateTimeOptions()` from all files.

## No Changes To

- Data storage format (Date objects in memory, HH:MM strings in UI)
- `parseTimeInput()`, `formatTimeForInput()`, `formatTime12Hour()` utilities
- Task interface or data service layer
