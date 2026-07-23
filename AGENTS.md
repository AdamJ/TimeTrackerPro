# AGENTS.md - AI Assistant Codebase Guide

**Last Updated:** 2026-07-16
**Version:** 2.6.2

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

### Test File Inventory (~376 JS/TS tests across 36 files, plus 17 Rust unit tests across `src-tauri/src/backup.rs`/`menu.rs`/`quit_flush.rs` run via `cargo test`)

| File | Coverage |
|---|---|
| `src/utils/calculationUtils.test.ts` | `getDayStats`, hours/revenue/billable per-day and per-period |
| `src/utils/checklistUtils.test.ts` | `parseTaskChecklist`, `toggleDescriptionChecklistItem` |
| `src/utils/exportUtils.test.ts` | `exportToCSV`, `exportToJSON`, `generateInvoiceData`, `parseCSVImport` |
| `src/utils/reportUtils.test.ts` | Report generation utilities |
| `src/utils/timeUtil.test.ts` | Time formatting utilities |
| `src/contexts/TimeTracking.test.tsx` | Full context: day/task/archive management, todos, planned tasks, project CRUD, category CRUD, `discardDay`, `adjustTaskTime`, `addBackdatedDay`, client archive/restore |
| `src/contexts/TimeTrackingContext.forceSync.test.tsx` | `forceSyncToDatabase` behavior |
| `src/services/dataService.test.ts` | `LocalStorageService` save/load round-trips |
| `src/services/supabaseService.test.ts` | Upsert-only bulk saves and single-row deletes (`saveProjects`, `deleteProject`, `saveCategories`, `deleteCategory`, `saveTodos`), plus `getCurrentDay`/`saveCurrentDay`, `checkNewSchema` schema detection, and `migrateFromLocalStorage` (no-op/no-existing-data/client-name-reconcile/error-swallow paths) |
| `src/services/localStorageService/recovery.test.ts` | Listing/summarizing/restoring localStorage schema-mismatch backups and full-snapshot disk backups |
| `src/services/localStorageService/utils.test.ts` | Versioned read/write helpers, stale-key backup, write-failure notification |
| `src/hooks/useReportStorage.test.ts` | Report storage hook |
| `src/hooks/useReportSummary.test.ts` | Report summary hook |
| `src/hooks/useBackgroundNotificationSetting.test.ts` | Background timer notification setting persistence |
| `src/hooks/useDataRecovery.test.ts` | Unified browser + desktop (Tauri) disk backup listing/preview/restore |
| `src/hooks/useElectronBackup.test.ts` | `writeBackupDebounced` and the renderer-side desktop backup bridge (Tauri-backed via `tauriElectronApiShim.ts`; hook keeps its historical `Electron` name) |
| `src/hooks/useElectronMenuActions.test.ts` | `menu:action` listener dispatch (event bridged from the Rust menu, not IPC; hook keeps its historical `Electron` name) |
| `src/hooks/useKeyboardShortcuts.test.ts` | Global keyboard shortcut handling (new task, save, command palette, help) |
| `src/hooks/useUndoableDelete.test.ts` | Undo-delete toast/timeout hook |
| `src/components/PageLayout.test.tsx` | `PageLayout` renders children, delegates title/actions to context |
| `src/components/SummaryOutput.test.tsx` | Summary output rendering |
| `src/components/NewTaskForm.test.tsx` | Form render, submit, validation, cancel, FAB toggle |
| `src/components/TaskItem.test.tsx` | Badge render, delete confirm, edit dialog |
| `src/components/ArchiveEditDialog.test.tsx` | Archive edit dialog render and task editing flow |
| `src/components/ArchivedTaskRow.test.tsx` | Inline expandable archived task row editing |
| `src/components/dateParsing.test.ts` | Date parsing utilities |
| `src/components/BackgroundTimerNotifier.test.tsx` | Document title/OS notification updates while a timer runs in the background |
| `src/components/CommandPalette.test.tsx` | `Cmd/Ctrl+K` command palette actions and navigation |
| `src/components/DataRecoveryDialog.test.tsx` | Settings → Data Recovery dialog list/preview/restore flow |
| `src/components/KeyboardShortcutsDialog.test.tsx` | `?` shortcuts help dialog content |
| `src/components/TimerLiveRegion.test.tsx` | Screen-reader `aria-live` announcements for day/task start-stop transitions |
| `src/pages/Settings.test.tsx` | Background notifications toggle, data recovery section visibility |
| `src/lib/supabase.test.ts` | Per-user data cache keying (projects/categories/clients) |
| `src/lib/electronMenuActions.test.ts` | Menu action pending-action/navigate pattern (name predates the Tauri migration; still applies to both web and desktop menu actions) |
| `src/lib/tauriElectronApiShim.test.ts` | `installTauriElectronApiShim` — populates `window.electronAPI` from Tauri `invoke`/`listen`, `onMenuAction` unsubscribe race guard |
| `src/lib/tauriUpdater.test.ts` | `checkForUpdatesSilent`/`checkForUpdatesManual` — exponential backoff, download/install/relaunch prompts |
| `src-tauri/src/backup.rs` (`cargo test`, inline `#[cfg(test)] mod tests`) | Backup filename validation, disk write/list/read and prune-threshold logic |

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
| `src/services/dataService.ts`                 | Data persistence factory — returns `LocalStorageService`, `SupabaseService`, or `SqlApiService` |
| `src/services/supabaseService.ts`             | Supabase data persistence implementation (1100+ lines)                             |
| `src/services/localStorageService/`           | localStorage data persistence implementation (split into per-entity modules)       |
| `src/services/sqlApiService.ts`               | `DataService` implementation that talks to the self-hosted `server/` REST API over `fetch` |
| `server/`                                     | Optional self-hosted SQL backend (Express + Knex, Postgres/MySQL) — see `docs/SQL_BACKEND.md` |
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
| `src/components/ui/responsive-select.tsx`     | `ResponsiveSelect` — branches on `useIsMobile()` to render a native `<select>` on mobile (OS picker) vs the Radix `Select` on desktop; flat `options` array API shared by `NewTaskForm`, `ProjectSheet`, `BackdatedEntryDialog`, `PlannedTaskDialog`, `ArchivedTaskRow` |
| `src/components/ArchivedTaskRow.tsx`          | Inline expandable row for editing a single task within `ArchiveEditDialog` (replaces the old `TaskEditInArchiveDialog` modal) |
| `src/services/localStorageService/recovery.ts` | Lists/previews/restores localStorage schema-mismatch backup keys and desktop (Tauri) disk-backup snapshots; the read side of the write-only backup safety nets |
| `src/hooks/useDataRecovery.ts`                | Unifies browser (`recovery.ts`) and desktop (`useElectronBackup`'s `listDiskBackups`/`readDiskBackup`, Tauri-backed) backup sources behind one list/preview/restore API |
| `src/components/DataRecoveryDialog.tsx`       | Settings → "Data Recovery" (guest mode only): lists backups, previews entity-count diffs against current state, restores and reloads |
| `src/hooks/useKeyboardShortcuts.ts`           | Global web/PWA `keydown` listener: `N` new task (plain key — `Cmd/Ctrl+N` is unpreventable in a regular browser tab), `Cmd/Ctrl+S` save, `Cmd/Ctrl+K` command palette, `?` shortcuts help; ignores typing targets except save/palette |
| `src/hooks/useElectronMenuActions.ts`         | `menu:action` event listener (bridged from the Rust-built native menu by `tauriElectronApiShim.ts`; hook keeps its historical `Electron` name — see "Tauri Desktop Build" below); `new-task`/`export`/`settings` use the navigate+pending-action pattern, `save`/`command-palette`/`shortcuts-help` call their callback directly (no page to mount into) |
| `src/components/CommandPalette.tsx`           | `Cmd/Ctrl+K` dialog (shadcn `Command`/`cmdk`) listing New Task/Save actions and page navigation destinations |
| `src/components/KeyboardShortcutsDialog.tsx`  | `?` help dialog listing all shortcuts via the `Kbd`/`KbdGroup` components |
| `src/components/ui/kbd.tsx`                   | shadcn `Kbd`/`KbdGroup` components — key-cap styling used by the command palette and shortcuts help dialog |
| `src/lib/platform.ts`                         | `isMac`/`modKey` — platform-appropriate shortcut glyph (`⌘` vs `Ctrl`) for the UI above |
| `src-tauri/src/menu.rs`                       | Builds the native app menu; `File` has New Task/Save Changes accelerators, `View` has the Command Palette accelerator, `Help` has a Keyboard Shortcuts entry — all dispatched as a `menu:action` event picked up by `tauriElectronApiShim.ts` |

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

## Tauri Desktop Build

The app can also be packaged as a native Mac (DMG) or Windows (NSIS) desktop app via Tauri 2 (a Rust-backed native shell, replacing the earlier Electron build — see `docs/superpowers/plans/2026-07-23-tauri-migration.md` for the migration plan).

**Key files:**

| File | Purpose |
| ---- | ------- |
| `src-tauri/Cargo.toml` | Rust crate manifest — `tauri` core plus the `updater`, `dialog`, `opener`, and `process` plugins; `regex`/`chrono`/`tokio` for backup/menu/quit-flush logic |
| `src-tauri/src/main.rs` | Entry point — registers plugins, manages `BackupState`/`QuitState`, wires the `invoke_handler` (backup commands + `before_quit_flush_done`), builds the native menu, and hooks `on_menu_event`/`on_window_event` |
| `src-tauri/src/backup.rs` | `backup_write`/`backup_list`/`backup_read` Tauri commands — disk snapshots under the OS app-data dir, pruned to the most recent 20, filename-pattern validated against path traversal; has inline `#[cfg(test)]` unit tests run via `cargo test` |
| `src-tauri/src/menu.rs` | Builds the native app menu (`File`/`Edit`/`View`/`Help`, plus a macOS-only `Timetraked` app-name submenu — no separate `Window` menu) with `tauri::menu` builders; menu clicks are emitted as a `menu:action` event rather than dispatched over IPC (except macOS's custom "quit" item, which calls `AppHandle::exit()` directly so it reliably fires `RunEvent::ExitRequested` instead of bypassing Tauri via the native `terminate:` selector) |
| `src-tauri/src/quit_flush.rs` | Intercepts window close (`WindowEvent::CloseRequested`) *and* app-level exit (`RunEvent::ExitRequested` — Cmd+Q, the Quit menu item, any `AppHandle::exit()`) to emit a `before-quit-flush` event and hold the quit (3s timeout fallback) until the renderer acks via `before_quit_flush_done`, then re-issues a real quit — mirrors the old Electron `before-quit` handshake, but unlike Electron needs its own trigger on both paths (see the module's doc comments for why) |
| `src-tauri/tauri.conf.json` | App config — window size, dev/build commands (`pnpm dev`/`pnpm build`), CSP (`security.csp`, replacing the Electron main-process CSP header), bundle targets (`dmg`, `nsis`) and icons, and the `updater` plugin's release-feed endpoint + public key |
| `src/lib/tauriElectronApiShim.ts` | Populates `window.electronAPI` from `@tauri-apps/api` `invoke`/`listen` calls, matching the shape `electron/preload.ts` used to expose — so `useElectronBackup.ts`/`useElectronMenuActions.ts`/`electron.d.ts` needed **no changes** and keep their historical `Electron` names. No-ops when `__TAURI_INTERNALS__` isn't present (web/PWA builds) |
| `src/lib/tauriUpdater.ts` | Frontend-driven signed auto-update: `checkForUpdatesSilent()` (called on prod desktop startup, exponential backoff up to 24h on repeated failures) and `checkForUpdatesManual()` (Help menu → "check-updates"), both using `@tauri-apps/plugin-updater`'s `check()` + `downloadAndInstall()` and `@tauri-apps/plugin-dialog`/`@tauri-apps/plugin-process` for the confirm/relaunch prompts |
| `src-tauri/capabilities/default.json` | Permission grants for the main window (`core:default`, `opener:default`, `dialog:default`, `updater:default`, `process:allow-restart`) — Tauri's allow-list replacement for Electron's all-or-nothing `nodeIntegration`/`contextIsolation` flags |

**npm scripts:**

```bash
pnpm tauri            # raw Tauri CLI passthrough (e.g. `pnpm tauri icon`)
pnpm tauri:dev         # start vite dev + launch the Tauri window (runs `pnpm dev` as beforeDevCommand)
pnpm tauri:build       # full production build + package signed DMG/NSIS installers (runs `pnpm build` as beforeBuildCommand)
```

**Architecture notes:**

- The app uses `BrowserRouter` (not `HashRouter`), same as under Electron. Dev mode loads `http://localhost:8080` (`devUrl` in `tauri.conf.json`); production serves `dist/` (`frontendDist`) through Tauri's own asset protocol — no custom `app://` protocol registration needed, unlike the old Electron main process
- All privileged logic lives in Rust (`src-tauri/src/`) instead of a Node main process; the frontend never gets Node APIs — it only reaches Rust through `@tauri-apps/api`'s `invoke`/`listen`, gated by `src-tauri/capabilities/default.json`
- Signed auto-updates are frontend-driven (`tauriUpdater.ts` + `tauri-plugin-updater`) rather than main-process-driven (`electron-updater`); the updater's release feed and Ed25519 public key live in `tauri.conf.json`'s `plugins.updater` block, with the matching private key held in CI secrets for `tauri:build` signing
- `src-tauri/target/` (Rust build output) and `src-tauri/gen/` (generated schemas/bindings) are both gitignored
- `.github/workflows/tauri-release.yml` builds macOS (DMG) and Windows (NSIS) installers and attaches them to the GitHub Release whenever `release.yml` publishes a new version-bump release (same `workflow_run`-triggered pattern as the old `electron-release.yml`)

**When adding Tauri-specific features:**

- Add new privileged operations as `#[tauri::command]` functions in a `src-tauri/src/*.rs` module and register them in `main.rs`'s `invoke_handler` — never reach for Node-style IPC
- Grant any new plugin/command permission in `src-tauri/capabilities/default.json`; nothing is available to the frontend by default
- The frontend never imports `@tauri-apps/api` directly outside `src/lib/tauriElectronApiShim.ts` and `src/lib/tauriUpdater.ts` — extend those two files (or add a sibling `src/lib/tauri*.ts` file) rather than sprinkling `invoke`/`listen` calls through components
- Keep `useElectronBackup.ts`/`useElectronMenuActions.ts`/`electron.d.ts` named as-is; renaming them would be a pure churn diff since the shim's whole purpose is presenting the pre-migration `window.electronAPI` shape unchanged

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
