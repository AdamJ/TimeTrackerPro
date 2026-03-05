# Report Route — Integration Guide

Three things to wire up in the existing codebase. All changes are
additive — nothing existing should need modification.

---

## 1. Copy the new files

```markdown
src/utils/reportUtils.ts       ← week grouping, prompt serialization
src/hooks/useReportSummary.ts  ← API call + generation state
src/pages/Report.tsx           ← the /report page component
```

---

## 2. Add the route in App.tsx

The project uses React Router v6 with lazy-loaded pages.
Find where the other pages are lazy-imported and add:

```tsx
const Report = lazy(() => import('./pages/Report'));
```

Then in the `<Routes>` block, add alongside the other `<Route>` entries:

```tsx
<Route path="/report" element={<Report />} />
```

---

## 3. Add navigation link

Find `Navigation.tsx` (desktop) and `MobileNav.tsx` (mobile bottom nav).
Add a "Report" entry following the same pattern as the existing nav items.

In Navigation.tsx, alongside the other nav links:

```tsx
<NavLink to="/report">Report</NavLink>
```

In MobileNav.tsx, the bottom nav likely maps an array of items.
Add an entry like:

```tsx
{ to: "/report", label: "Report", icon: <FileTextIcon /> }
```

Use whatever icon fits — `FileTextIcon` from Radix or Lucide both work.

---

## 4. Add the API key to .env

```env
VITE_ANTHROPIC_API_KEY=your_key_here
```

And add the placeholder to `.env.example`:

```env
VITE_ANTHROPIC_API_KEY=
```

The key is read in `useReportSummary.ts` via `import.meta.env.VITE_ANTHROPIC_API_KEY`.
The `anthropic-dangerous-direct-browser-access` header is required for
browser-based API calls — this is expected and documented by Anthropic for
client-side usage.

---

## 5. Verify TypeScript is happy

Run `npm run lint` and `npm run build` after dropping the files in.

The main thing to verify is that the `ArchivedDay` and `Task` types in
`reportUtils.ts` match what your actual `dataService.ts` types look like.
If `dataService.ts` already exports these types, import from there instead
of re-declaring them in `reportUtils.ts` to avoid duplication.

Check for a `TimeEntry`, `DayData`, or similar interface in:

- `src/services/dataService.ts`
- `src/contexts/TimeTrackingContext.tsx`

If those types exist, update the import at the top of `reportUtils.ts`:

```ts
import type { ArchivedDay, Task } from '@/services/dataService';
// or wherever they live
```

---

## Assumptions to verify

- `timetracker_archived_days` is the correct localStorage key ✓ (confirmed via console)
- Tasks have a `category` field with values like `"break-time"` ✓ (confirmed via console)
- shadcn/ui components used: `Button`, `Textarea`, `Badge`, `Tabs`, `Popover`, `Label`, `Input`
  → All are already in use in the project per the README tech stack
- `@radix-ui/react-icons` is available ✓ (listed as primary icon library in README)
