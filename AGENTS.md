# AGENTS.md - AI Assistant Codebase Guide

**Last Updated:** 2026-06-25
**Version:** 2.6.0

Timetraked is a React 18 + TypeScript time tracking PWA for freelancers and consultants, with dual storage (localStorage guest mode and optional Supabase cloud sync).

## Output Style

- Be terse and direct. Avoid walls of text and verbose explanations.
- When reviewing issues or code, lead with conclusions, not exploration narrative.
- Skip preamble like "I'll now..." or "Let me explore..."

## Documentation

- After completing a feature, bug fix, or security fix, automatically run the doc-sync workflow to update CLAUDE.md, CHANGELOG.md, and README/README-EXT.md.
- Use `feat:` / `fix:` / `security:` prefixes on PRs to trigger releases.

## Testing & Verification

- Always run the test suite (and lint/build) before committing.
- When fixing a bug, add a regression test as part of the same change.
- Verify version alignment between related dev tools (e.g., vitest + @vitest/coverage) when test errors appear.

### Test File Inventory (187 tests across 14 files)

| File | Coverage |
|---|---|
| `src/utils/calculationUtils.test.ts` | `getDayStats`, hours/revenue/billable per-day and per-period |
| `src/utils/checklistUtils.test.ts` | `parseTaskChecklist`, `toggleDescriptionChecklistItem` |
| `src/utils/exportUtils.test.ts` | `exportToCSV`, `exportToJSON`, `generateInvoiceData`, `parseCSVImport` |
| `src/utils/reportUtils.test.ts` | Report generation utilities |
| `src/utils/timeUtil.test.ts` | Time formatting utilities |
| `src/contexts/TimeTracking.test.tsx` | Full context: day/task/archive management, todos, planned tasks, project CRUD, category CRUD, `discardDay`, `adjustTaskTime`, `addBackdatedDay`, client archive/restore |
| `src/services/dataService.test.ts` | `LocalStorageService` save/load round-trips |
| `src/hooks/useReportStorage.test.ts` | Report storage hook |
| `src/hooks/useReportSummary.test.ts` | Report summary hook |
| `src/components/PageLayout.test.tsx` | `PageLayout` renders children, delegates title/actions to context |
| `src/components/SummaryOutput.test.tsx` | Summary output rendering |
| `src/components/NewTaskForm.test.tsx` | Form render, submit, validation, cancel, FAB toggle |
| `src/components/TaskItem.test.tsx` | Badge render, delete confirm, edit dialog |
| `src/components/dateParsing.test.ts` | Date parsing utilities |

### Context Test Pattern

Context integration tests must gate on `loading` before running mutations — the async `loadData()` call can overwrite state set before it completes:

```tsx
const { result } = renderHook(() => useTimeTracking(), { wrapper });
await waitFor(() => expect(result.current.loading).toBe(false));
// now safe to call mutations
```

### Component Test Mocking Pattern

For components that use `useTimeTracking`, `useLongPress`, or dialogs:

```tsx
vi.mock("@/hooks/useTimeTracking", () => ({
  useTimeTracking: () => ({ projects: [], categories: [] })
}));
vi.mock("@/hooks/useLongPress", () => ({ useLongPress: () => ({}) }));
```

## Investigation Discipline

- When a query returns unexpected results (e.g., $0, empty rows), check BOTH semantic mappings AND data shape constraints (column truncation, row limits, type coercion) before declaring a fix complete.

## Git Workflow

Always create feature branches for changes instead of committing directly to main. Never commit directly to main unless explicitly told to.

## Quality Checks

After implementing changes, run lint and tests before considering a task complete. Fix any failures before reporting success.

---

## Technology Stack

| Layer        | Technology                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| UI Framework | React 18 + TypeScript 5.9                                                                                                          |
| Build        | Vite 5 + SWC                                                                                                                       |
| Routing      | React Router 6                                                                                                                     |
| Styling      | Tailwind CSS 4 + Radix UI + shadcn/ui                                                                                              |
| Icons        | Radix Icons (primary), Lucide (fallback)                                                                                           |
| Forms        | React Hook Form + Zod                                                                                                              |
| Backend      | Supabase (optional) or localStorage                                                                                                |
| PWA          | Vite PWA Plugin + Workbox                                                                                                          |
| Testing      | Vitest + React Testing Library + Playwright                                                                                        |

---

## Critical Code Style — NON-NEGOTIABLE

⚠️ **These are hard project requirements enforced by the linter. Violating them causes build failures.**

- **PNPM**: Use `pnpm` for package management — never `npm` or `yarn`
- **Indentation**: Spaces (not tabs), width = 2
- **Quotes**: Always double quotes (`""`) — never single quotes (`''`)
- **Imports**: Always use `@/` alias — never relative paths like `../../`
- **Colors**: Prefer semantic tokens (`bg-primary`, `bg-muted`, etc.) for theming. Radix scale classes (`bg-mauve-3`, `text-blue-11`, `border-violet-6`) are allowed for explicit color needs — use steps 1-2 for backgrounds, 3-5 for component fills, 6-8 for borders, 9-10 for solid fills, 11-12 for text. Never use arbitrary Tailwind palette colors like `bg-blue-500`.
- **Components**: Always use shadcn/ui components — never raw HTML with custom styles

```typescript
// ✅ CORRECT
export const MyComponent = () => {
  return <div className="bg-primary text-primary-foreground">Hello</div>;
};

// ❌ WRONG — spaces, single quotes, arbitrary Tailwind color (use bg-blue-9 instead)
export const MyComponent = () => {
  return <div className='bg-blue-500'>Hello</div>;
};
```

---

## Key Files

| File                                          | Purpose                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/contexts/TimeTrackingContext.tsx`        | Main application state and logic (1200+ lines)                                     |
| `src/services/dataService.ts`                 | Data persistence factory — returns `LocalStorageService` or `SupabaseService`      |
| `src/services/supabaseService.ts`             | Supabase data persistence implementation (1100+ lines)                             |
| `src/services/localStorageService/`           | localStorage data persistence implementation (split into per-entity modules)       |
| `src/contexts/AuthContext.tsx`                | Authentication state management                                                    |
| `src/lib/supabase.ts`                         | Supabase client configuration and caching                                          |
| `src/config/categories.ts`                    | Default category definitions                                                       |
| `src/config/projects.ts`                      | Default project definitions                                                        |
| `src/components/ClientManagement.tsx`         | Client list UI: add, edit, archive (with active-project guard), and restore clients |
| `src/components/ClientSheet.tsx`              | Shared Sheet (drawer) for add and edit client forms; handles both modes via `mode` prop |
| `src/components/ProjectSheet.tsx`             | Shared Sheet (drawer) for add and edit project forms; handles both modes via `mode` prop |
| `src/components/CategorySheet.tsx`            | Shared Sheet (drawer) for add and edit category forms; handles both modes via `mode` prop |
| `src/pages/Clients.tsx`                       | Thin page wrapper around `ClientManagement` (route `/clients`)                     |
| `src/services/localStorageService/clients.ts` | Client persistence module for guest mode (versioned localStorage blob)             |
| `supabase/migrations/20260530_clients.sql`    | `clients` table + RLS + one-time backfill from distinct project clients            |
| `src/components/AppSidebar.tsx`               | Collapsible sidebar nav (Planning/Manage/Reports groups); reads page title/actions from `PageTitleContext`; footer has sync, auth, export |
| `src/contexts/PageTitleContext.tsx`           | `PageTitleProvider` — holds title, badge, actions state for the sidebar header     |
| `src/contexts/page-title-context.ts`          | Context object + default value + `PageTitleContextType` interface                  |
| `src/hooks/usePageTitle.ts`                   | `usePageTitle()` hook — consumed by `PageLayout` (write) and sidebar header (read) |
| `src/components/PageLayout.tsx`               | Thin page wrapper — delegates title/badge/actions to `PageTitleContext` via `usePageTitle` |
| `src/components/BackdatedEntryDialog.tsx`     | Multi-step dialog for logging past workdays; uses `addBackdatedDay` from context   |
| `src/hooks/useLongPress.ts`                   | 500 ms hold detector for context menu trigger on touch                             |
| `src/components/ui/responsive-select.tsx`     | `ResponsiveSelect` — branches on `useIsMobile()` to render a native `<select>` on mobile (OS picker) vs the Radix `Select` on desktop; flat `options` array API shared by `NewTaskForm`, `ProjectSheet`, `BackdatedEntryDialog`, `PlannedTaskDialog`, `TaskEditInArchiveDialog` |
| `src/services/localStorageService/recovery.ts` | Lists/previews/restores localStorage schema-mismatch backup keys and Electron disk-backup snapshots; the read side of the write-only backup safety nets |
| `src/hooks/useDataRecovery.ts`                | Unifies browser (`recovery.ts`) and desktop (`useElectronBackup`'s `listDiskBackups`/`readDiskBackup`) backup sources behind one list/preview/restore API |
| `src/components/DataRecoveryDialog.tsx`       | Settings → "Data Recovery" (guest mode only): lists backups, previews entity-count diffs against current state, restores and reloads |

---

## Client Management

Clients are a managed entity (added in the client-management feature) that backs the project form's client dropdown.

- **`Client` type** (`src/contexts/TimeTrackingContext.tsx`): `{ id: string; name: string; archived: boolean; createdAt: string; addressStreet?: string; addressCity?: string; addressState?: string; addressZip?: string; addressCountry?: string; contactName?: string; contactEmail?: string; contactWebsite?: string }`. Exported alongside `Project` and consumed by `dataService.ts`.
- **`STORAGE_KEYS.CLIENTS`** (`"timetracker_clients"`): added in both `localStorageService/constants.ts` and the context's local key map. Persisted via `getClients()` / `saveClients()` on `DataService`. Guest mode uses the localStorage blob (`localStorageService/clients.ts`); authenticated mode uses a dedicated Supabase `clients` table (`supabase/migrations/20260530_clients.sql`) so clients sync across devices. The migration backfills the table once from each user's distinct project client names.
- **Seeding/reconcile guard**: on every load the context init block reconciles the client list against the unique `client` name strings on `projects` — any project client name not already present (active or archived) is appended as an active client and the list is saved. Idempotent; covers both first run and clients introduced later (e.g. CSV import). Silent, runs in-app only.
- **`archived` on `Project`**: optional field, normalized at load time with `project.archived ?? false` so legacy projects need no migration. Project archiving was introduced **as part of this feature to support the client archive guard** (a client cannot be archived while it still owns active projects) rather than as a standalone feature.
- **Context methods**: `clients`, `addClient(data)`, `updateClient(id, data) → Client | null`, `archiveClient(id) → string | null` (returns an error message naming blocking active projects, or `null` on success), `restoreClient(id)`, `archiveProject(id)`, `restoreProject(id)`. Project methods don't auto-save — consumers call `forceSyncToDatabase()` (same pattern as `addProject`).
- **Edit flow**: `updateClient(id, data)` merges partial data into the existing client (preserves `id`, `createdAt`, `archived`), updates `clientsRef.current` + `setClients`, returns the updated `Client`. Caller then calls `persistClient(updated)` — same single-row upsert path as add (**1** Supabase call).
- **Client persistence**: to minimize Supabase calls, clients are **not** part of `forceSyncToDatabase`'s bulk save. The three client mutations keep a `clientsRef` in sync synchronously, and consumers persist explicitly:
  - **Add/Edit** both use `persistClient(client)` → `dataService.upsertClient` — a single-row upsert (**1** Supabase call). `addClient(data)` returns the created `Client` (or `null` if name blank); `updateClient(id, data)` returns the updated `Client` (or `null` if not found).
  - **Archive/restore** use `persistClients()` → `dataService.saveClients` — the full-list reconcile (select-missing + upsert = **2** calls).
  - `SupabaseService.getClients`/`saveClients`/`upsertClient` share the read-cache (`getCachedClients`/`setCachedClients` in `src/lib/supabase.ts`), so a load is one read on cache miss and free thereafter; `upsertClient` updates the cache in place.

---

## Electron Desktop Build

The app can also be packaged as a native Mac (DMG) or Windows (NSIS) desktop app via Electron.

**Key files:**

| File | Purpose |
| ---- | ------- |
| `electron/main.ts` | Electron main process — BrowserWindow, CSP header, dev/prod load logic, IPC backup-write handler, `before-quit` flush handshake |
| `electron/preload.ts` | `contextBridge`-exposed `window.electronAPI` (`writeBackup`, `requestFlushBeforeQuit`) — the renderer's only bridge to Node/Electron APIs |
| `electron/tsconfig.json` | Compiles `electron/` to CJS in `dist-electron/` (isolated from the app tsconfig) |
| `vite.electron.config.ts` | Dedicated Vite config bundling the main process and preload script (no VitePWA, no React) |
| `src/hooks/useElectronBackup.ts` | Renderer-side hook wrapping `window.electronAPI`; no-ops entirely on web/PWA builds where it's absent |
| `src/types/electron.d.ts` | Ambient `Window.electronAPI` type |

**npm scripts:**

```bash
pnpm run electron:build:main   # compile electron/main.ts → dist-electron/main.cjs
pnpm run electron:dev          # build main + start vite dev + launch Electron (waits for port 8080)
pnpm run electron:preview      # build app + main, open in Electron without packaging
pnpm run electron:build        # full production build + package via electron-builder (DMG/NSIS)
```

**Architecture notes:**

- `"type": "module"` is in `package.json`, so the compiled main process uses the `.cjs` extension (`dist-electron/main.cjs`) — Electron's main process does not support ES modules natively
- The app uses `BrowserRouter` (not `HashRouter`). Production loads via a registered `app://` custom protocol (using `protocol.handle`) that serves `dist/` and falls back to `index.html` for unknown paths, giving pushState routing a real origin to work against. Dev mode loads `http://localhost:8080` directly — no protocol handler needed
- The electron-builder config lives in the `"build"` key of `package.json`; output goes to `dist-electron-build/` (gitignored)
- `dist-electron/` (compiled main) and `dist-electron-build/` (packaged app) are both gitignored
- `.github/workflows/electron-release.yml` builds macOS (DMG) and Windows (NSIS) installers and attaches them to the GitHub Release whenever `release.yml` publishes a new version-bump release

**When adding Electron-specific features:**

- Gate Electron-only code on `process.env.ELECTRON_DEV` or check `app.isPackaged` in the main process
- Do not add `nodeIntegration: true` — use `contextBridge` + `ipcRenderer` if the renderer needs Node access
- Never modify `electron/tsconfig.json`'s `"module": "commonjs"` — it must stay CJS

---

## Pre-Commit Checklist

1. `pnpm lint` — fix all errors
2. `pnpm build` — ensure no type errors
3. Test changed functionality manually
4. Verify tabs (not spaces) and double quotes throughout

---

## Agent Sub-Documents

Read these files proactively based on what you're working on:

| When you're working on...                                       | Read this file                             |
| --------------------------------------------------------------- | ------------------------------------------ |
| Architecture, data flow, auth flow, contexts, DataService       | `agents/architecture.md`                   |
| Naming conventions, TypeScript patterns, UI/styling rules       | `agents/conventions.md`                    |
| Dev setup, npm commands, git workflow, Supabase                 | `agents/workflow.md`                       |
| Adding components, pages, context methods, data service methods | `agents/operations.md`                     |
| Testing, QA checklists, code quality requirements               | `agents/testing.md`                        |
| Debugging, common mistakes, architecture gotchas, Gemini errors | `agents/pitfalls.md`                       |
| UI/styling rules and Radix component usage                      | `agents/styles.md`                         |
| Pull request guidelines                                         | `agents/pull_requests.md`                  |
| Adding a new feature (TDD workflow)                             | `.claude/skills/new-feature/SKILL.md`      |
| Syncing docs before a PR                                        | `.claude/skills/sync-docs/SKILL.md`        |

---

**Note**: When in doubt, follow existing patterns and ask clarifying questions rather than making assumptions.
