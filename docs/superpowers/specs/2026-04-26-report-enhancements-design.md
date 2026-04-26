# Report Page Enhancements — Design Spec

**Date:** 2026-04-26
**Status:** Approved
**Scope:** Persistent summaries, markdown preview, enhanced export (copy, download, print/PDF)
**Out of scope (deferred):** History view — list of all previously generated summaries across weeks

---

## Overview

Three enhancements to the `/report` page:

1. **Persistent summaries** — Generated summaries are saved to localStorage keyed by week + tone. A banner prompts the user to reload a saved summary when returning to a previously generated week/tone combination.
2. **Markdown preview** — The output panel gains an Edit/Preview toggle. Preview mode renders the summary through the existing `MarkdownDisplay` component.
3. **Enhanced export** — Alongside the existing Copy button, users can download the summary as a `.txt` file or print/save as PDF.

---

## Architecture

### New files

| File | Purpose |
|------|---------|
| `src/hooks/useReportStorage.ts` | localStorage read/write for saved summaries, keyed by week + tone (~60 lines) |
| `src/components/SummaryOutput.tsx` | Output panel component — replaces the inline `SummaryDraft` function; includes Edit/Preview toggle and full export row |

### Modified files

| File | Change |
|------|--------|
| `src/pages/Report.tsx` | Add `useReportStorage`, render saved summary banner, pass new props to `SummaryOutput`, auto-save on generation success |

### Unchanged files

- `src/hooks/useReportSummary.ts` — no changes
- `src/utils/reportUtils.ts` — no changes
- `src/services/localStorageService.ts` — no changes (report summaries are UI-layer ephemera, not core app data)
- `src/components/MarkdownDisplay.tsx` — reused as-is

---

## `useReportStorage` hook

### Storage key

```
ttp_report_${weekKey}_${tone}
```

Example: `ttp_report_2026-01-11_standup`

`weekKey` is the existing ISO date string of the week's Sunday (already produced by `weekKey()` in `reportUtils.ts`).

### Stored value shape

```ts
interface SavedSummary {
  text: string;
  generatedAt: string; // ISO timestamp
  weekLabel: string;   // e.g. "Jan 11 – Jan 17, 2026" — for display in the banner
}
```

### Hook signature

```ts
function useReportStorage(weekKey: string, tone: ReportTone): {
  saved: SavedSummary | null;
  save: (text: string, weekLabel: string) => void;
  clear: () => void;
}
```

The hook is reactive — when `weekKey` or `tone` changes (via `useEffect`), it reads the new localStorage key and updates `saved`. No TTL, no size limit enforcement.

### Auto-save behavior (wired in `Report.tsx`)

- When generation `state` transitions to `'success'`, call `storage.save(summary, selectedWeek.label)`
- When the user edits the textarea (`onUpdate`), call `storage.save(...)` to keep the saved copy in sync with edits
- Regenerating overwrites the existing entry for that week+tone (same key — last write wins)
- Changing week or tone resets generation state and the hook reactively reads the new key

---

## Saved Summary Banner

Shown in the right output panel when `saved !== null` AND `state === 'idle'`.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ You have a saved summary for this week                    │
│ Standup · Generated Jan 18, 2026    [Load summary]  [✕]  │
└──────────────────────────────────────────────────────────┘
```

- Styled as a `bg-muted/30` card with a `border`, consistent with existing app patterns
- Tone label is capitalized; `generatedAt` is formatted as a short date string
- **Load summary** — calls `updateSummary(saved.text)` and sets state to `'success'`
- **✕** — calls `storage.clear()` and dismisses the banner

The banner is only shown when `state === 'idle'`. Once a summary is loaded or generated, it disappears naturally. When the user regenerates, the new summary auto-saves and overwrites the previous entry — no banner shown since state is already `'success'`.

---

## `SummaryOutput` component

Replaces the inline `SummaryDraft` function in `Report.tsx`. Extracted to `src/components/SummaryOutput.tsx`.

### Props

```ts
interface SummaryOutputProps {
  summary: string;
  weekLabel: string;
  onUpdate: (v: string) => void;
  onRegenerate: () => void;
}
```

### Modes

**Edit mode (default):** Editable `Textarea` — current behavior preserved. Changes call `onUpdate`.

**Preview mode:** Renders `summary` through the existing `MarkdownDisplay` component. Read-only. Same container dimensions as the textarea to avoid layout shift.

### Header row

```
Summary label                    [Edit | Preview]  [Regenerate]
```

- Edit/Preview is a two-button toggle (not a full `Tabs` component — too heavy for a binary state)
- Regenerate button unchanged from current implementation

### Export row

```
[Copy]  [Download .txt]  [Print / Save as PDF]
```

- **Copy** — existing `CopyButton` component, unchanged
- **Download .txt** — creates a `Blob('text/plain')`, triggers an `<a download>` click programmatically. Filename: slugified week label, e.g. `summary-jan-11-jan-17-2026.txt`
- **Print** — calls `window.print()`. A `@media print` CSS block hides everything on the page except the summary text for a clean print/PDF output. The print styles are scoped to a wrapper `div` with a stable class (e.g. `.summary-print-region`).

---

## Behavior Summary

| Action | Result |
|--------|--------|
| Generate summary | Auto-saves to localStorage; `SummaryOutput` shown |
| Edit textarea | Saves edits to localStorage in real time |
| Regenerate | Overwrites saved entry for this week+tone |
| Change week | Resets state; banner shown if saved entry exists for new week+tone |
| Change tone | Resets state; banner shown if saved entry exists for new tone |
| Load from banner | Loads saved text into `SummaryOutput`; banner dismissed |
| Dismiss banner (✕) | Clears localStorage entry; banner dismissed; output remains idle |
| Clear localStorage | All saved summaries gone; banners never shown |

---

## Out of Scope

- **History view** — a browsable list of all saved summaries across all weeks and tones. Deferred to a future session.
- **Supabase sync** — saved summaries remain localStorage-only; no cloud persistence.
- **Custom tone prompts** — editing the system prompt from the UI.
