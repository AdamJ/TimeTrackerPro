# Pitfalls & Gotchas — TimeTracker Pro

## Common Code Mistakes

### 1. Using Spaces Instead of Tabs

```typescript
// ❌ WRONG
export const Component = () => {
  return <div>Content < /div>; / / spaces;
};

// ✅ CORRECT
export const Component = () => {
  return <div>Content < /div>; / / tabs;
};
```

### 2. Using Single Quotes

```typescript
// ❌ WRONG
const message = 'Hello World';

// ✅ CORRECT
const message = 'Hello World';
```

### 3. Not Using @ Alias

```typescript
// ❌ WRONG
import { Task } from '../../contexts/TimeTrackingContext';

// ✅ CORRECT
import { Task } from '@/contexts/TimeTrackingContext';
```

### 4. Creating Custom Colors

```typescript
// ❌ WRONG
<div className="bg-blue-500 text-white">Content</div>

// ✅ CORRECT
<div className="bg-primary text-primary-foreground">Content</div>
```

### 5. Forgetting to Save Data

```typescript
// ❌ WRONG — Data not persisted
setTasks([...tasks, newTask]);

// ✅ CORRECT — Explicitly sync
setTasks([...tasks, newTask]);
await forceSyncToDatabase(); // Or wait for critical event
```

### 6. Bypassing the DataService

```typescript
// ❌ WRONG — Reads localStorage only; breaks for authenticated users
// whose data lives in Supabase
const raw = localStorage.getItem('timetracker_archived_days');

// ✅ CORRECT — Use the context, which routes through the right service
const { archivedDays } = useTimeTracking();
```

Any utility that needs archived days must consume the context or accept
`DayRecord[]` as a parameter. Use `dayRecordsToArchivedDays()` from
`src/utils/reportUtils.ts` to convert to the `ArchivedDay[]` shape.

---

## Architecture Gotchas

### 1. Manual Sync Required

- **Issue**: Data doesn't auto-save on every change
- **Solution**: Use `forceSyncToDatabase()` or trigger critical events
- **Why**: Optimized for single-device usage

### 2. Category Lookup by ID

```typescript
// ❌ WRONG — Looking up by name
const category = categories.find(c => c.name === task.category);

// ✅ CORRECT — Looking up by ID
const category = categories.find(c => c.id === task.category);
```

### 3. Date Handling

```typescript
// ❌ WRONG — Date as string
const startTime = '2024-11-18';

// ✅ CORRECT — Date object
const startTime = new Date('2024-11-18');
```

### 4. Supabase User Caching

```typescript
// ❌ WRONG — Repeated auth calls (slow)
const {
  data: { user }
} = await supabase.auth.getUser();

// ✅ CORRECT — Use cached user helper
const user = await getCachedUser();
```

### 5. Gemini API Error Classification

Do **not** surface Gemini's raw `error.message` to the user — it is often vague
and gives no guidance on whether to wait, fix a key, or switch plans.

Always classify by HTTP status + `error.status` using `classifyGeminiError()`
in `src/hooks/useReportSummary.ts`:

| Symptom                       | HTTP | Gemini status                  | Meaning                              |
| ----------------------------- | ---- | ------------------------------ | ------------------------------------ |
| Multiple consecutive failures | 503  | `UNAVAILABLE`                  | Server overloaded — retry in seconds |
| First request of day fails    | 429  | `RESOURCE_EXHAUSTED` + "quota" | Daily free-tier limit hit            |
| Rapid retries fail            | 429  | `RESOURCE_EXHAUSTED` + "rate"  | Per-minute RPM limit — wait 30–60s   |
| Always fails                  | 403  | `PERMISSION_DENIED`            | Bad API key                          |
| Always fails in region        | 400  | `FAILED_PRECONDITION`          | Free tier not available in region    |

Also handle `finishReason` on 200 OK responses: a `SAFETY` or `RECITATION`
block returns HTTP 200 with empty `text` — use `classifyFinishReason()`.

---

## Performance Gotchas

### 1. Avoiding Unnecessary Re-renders

- Use `useCallback` for stable function references
- Use `useRef` for values that don't need to trigger re-renders
- Context updates trigger all consumers — keep context lean

### 2. Lazy Loading

- Pages are lazy-loaded — don't preload unnecessarily
- Always wrap lazy components in `<Suspense>` with a fallback

---

## AI Self-Check Before Making Changes

- [ ] Did I read the relevant context file first? (`TimeTrackingContext.tsx` or `AuthContext.tsx`)
- [ ] Did I read `dataService.ts` if touching data persistence?
- [ ] Did I check existing patterns in similar components?
- [ ] Am I using tabs and double quotes?
- [ ] Am I using `@/` import aliases?
- [ ] Am I using shadcn/ui components (not raw HTML with custom styles)?
- [ ] Will this work in both guest and authenticated modes?
- [ ] Did I update the data service if persistence is involved?
- [ ] Will `npm run lint` and `npm run build` pass?
