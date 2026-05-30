# Changelog

All notable changes to Timetraked will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Clients now persist in a dedicated Supabase `clients` table (id, user_id, name, archived, created_at) with RLS, so they sync across devices for signed-in users instead of living in a per-device localStorage blob. A one-time, idempotent SQL backfill seeds the table from each user's distinct project client names. Guest mode continues to use the localStorage blob. `SupabaseService.getClients`/`saveClients` were rewritten to read/write the table (mirroring the projects delete-missing + upsert-by-id pattern). Client reads/writes share a TTL read-cache (`getCachedClients`/`setCachedClients`), so a load is one read on cache miss and free thereafter, and clients are excluded from the `forceSyncToDatabase` bulk save (persisted only when a client actually changes). Adding a client uses a single-row `upsertClient` (1 Supabase call) rather than the full-list reconcile (2 calls).
  — `supabase/migrations/20260530_clients.sql` (new: table, indexes, RLS policies, backfill), `supabase/schema.sql` (clients table + RLS for fresh installs), `src/services/supabaseService.ts` (table-backed client persistence + `upsertClient`, removed localStorage-blob delegation), `src/services/dataService.ts` + `src/services/localStorageService/clients.ts` (`upsertClient`), `src/lib/supabase.ts` (client read-cache), `src/contexts/TimeTrackingContext.tsx` (`persistClient`/`persistClients`, `addClient` returns the created client)
- Client management with archive protection (and project archiving scoped in for consistency). Clients are now a managed entity: a dedicated Clients page lists active clients with inline add and per-row archive, plus a collapsed Archived section with restore. The project create/edit form replaces the free-text client input with a client dropdown (active clients only) that includes an inline "+ Add new client" option; client strings that don't match a managed client are shown as disabled "(unmanaged)" options so legacy data stays visible. A client cannot be archived while it still owns active (non-archived) projects — the attempt surfaces an inline `Alert` (with `AlertTriangle`) naming the blocking projects. **Project archiving was scoped into this feature** (not as a standalone feature) specifically to back the client archive guard: projects gained an optional `archived` flag (normalized at load with `project.archived ?? false`, no migration), and the project list grew per-row Archive/Restore actions with a collapsed Archived section. Clients persist under a new `CLIENTS` storage key; `SupabaseService` stores the client list as a JSON blob in localStorage to avoid a schema migration, and the client list is seeded once from existing project client names on first load.
  — `src/contexts/TimeTrackingContext.tsx` (`Client` type, `archived` on `Project`, `clients` state + seeding shim, `addClient`/`archiveClient`/`restoreClient`/`archiveProject`/`restoreProject`, client save in `forceSyncToDatabase`), `src/services/dataService.ts` (`saveClients`/`getClients` on `DataService`), `src/services/localStorageService/clients.ts` (new), `src/services/localStorageService/constants.ts` (`CLIENTS` key), `src/services/localStorageService/index.ts`, `src/services/supabaseService.ts` (JSON-blob client persistence), `src/components/ClientManagement.tsx` (new), `src/pages/Clients.tsx` (new), `src/App.tsx` (`/clients` route, lazy-loaded), `src/pages/ProjectList.tsx` (client `Select` + inline add, project Archive/Restore + Archived section), `src/components/ProjectManagement.tsx` (client `Select` + inline add), `src/pages/Settings.tsx` ("Manage Clients" link)
- Backdated entry creation — "Add Past Entry" button on the Archive page opens a multi-step dialog to log a full past workday (date picker, day-level start/end times, per-task time pickers with category/project selectors, markdown description support, live duration preview). Persists via `addBackdatedDay` which calls `dataService.saveArchivedDays` with optimistic rollback on failure.
  — `src/components/BackdatedEntryDialog.tsx` (new), `src/contexts/TimeTrackingContext.tsx` (`addBackdatedDay` method), `src/pages/Archive.tsx` (CirclePlus "Add Past Entry" action button)

### Fixed

- `forceSyncToDatabase` used the `projects` closure variable, which is stale when called immediately after a project mutation (before React re-renders). Project add, edit, delete, archive, and restore via `ProjectList` all called `forceSyncToDatabase` right after the mutation, causing the pre-mutation project list to be written to storage while the icon incorrectly turned green. Added `projectsRef` (mirroring `clientsRef`) updated synchronously by every project mutation and at load; `forceSyncToDatabase` now reads `projectsRef.current` so the correct list is always saved.
  — `src/contexts/TimeTrackingContext.tsx`
- `addClient`, `archiveClient`, and `restoreClient` called `setHasUnsavedChanges(true)` even though callers immediately persist the change via `persistClient` / `persistClients`. Since clients are excluded from `forceSyncToDatabase`'s bulk save, the only path to clear the flag was unrelated to the client write, leaving the save icon orange after every client operation despite the data being safely written. Removed the `setHasUnsavedChanges(true)` calls from all three client mutators.
  — `src/contexts/TimeTrackingContext.tsx`
- The project load merge always started from hardcoded defaults and only appended saved projects whose name+client did not match any default. Any edit to a default project (hourly rate, color, `isBillable`) was silently discarded on reload and replaced by the hardcoded default values. Changed the merge to replace the default entry with the saved version when name+client match, so user edits to default projects survive page reloads.
  — `src/contexts/TimeTrackingContext.tsx`
- `BackdatedEntryDialog` imported `useTimeTracking` from `@/contexts/TimeTrackingContext` (not exported there) — corrected to import the hook from `@/hooks/useTimeTracking` and types (`DayRecord`, `Task`) from the context
  — `src/components/BackdatedEntryDialog.tsx`

### Changed

- iOS navigation bar redesigned as a floating pill — rounded-full shape, frosted-glass background (`rgba(255,255,255,0.80)`), drop shadow, and `mb-2 mx-2` margins replacing the full-width border-top bar
  — `src/components/MobileNav.tsx`
- Page title heading hidden on non-iOS web builds (`hidden` class added to title `div` in `PageLayout`)
  — `src/components/PageLayout.tsx`
- Homepage stats grid changed from single-column to two-column on mobile (`grid-cols-2`)
  — `src/pages/Index.tsx`
- Todo list item alignment in `TaskTrackingPanel` changed from `items-start` to `items-center`
  — `src/components/TaskTrackingPanel.tsx`
- Theme accent color changed from `orange` to `blue`
  — `src/main.tsx`

### Added

- Apple HIG compliance pass for the native iOS app
  - **Bottom sheets** — `TaskEditDialog`, `StartDayDialog`, `ArchiveEditDialog`, and `DeleteConfirmationDialog` now render as swipe-to-dismiss vaul `Drawer` sheets on iOS (snap points tuned per dialog complexity) and fall back to the existing centered Radix `Dialog` on web. `DeleteConfirmationDialog` reverses button order on iOS (destructive action above Cancel) per UIAlertController convention.
    — `src/components/ui/adaptive-dialog.tsx` (new), `src/components/ui/drawer.tsx`, `src/components/TaskEditDialog.tsx`, `src/components/StartDayDialog.tsx`, `src/components/ArchiveEditDialog.tsx`, `src/components/DeleteConfirmationDialog.tsx`
  - **Haptic feedback** — `useHaptics` wraps `@capacitor/haptics`; light impact on tab switches and Edit, medium on Delete, heavy on destructive confirm, success notification on task creation and day archive, error notification on sync failure. No-op on web.
    — `src/hooks/useHaptics.ts` (new), `src/components/MobileNav.tsx`, `src/components/TaskItem.tsx`, `src/components/DeleteConfirmationDialog.tsx`, `src/contexts/TimeTrackingContext.tsx`
  - **App lifecycle persistence** — `useAppLifecycle` uses `@capacitor/app`'s `appStateChange` event (fires at the Swift layer before WKWebView freezes) instead of `visibilitychange` for the emergency localStorage backup, eliminating the race condition on rapid app backgrounding. Falls back to `visibilitychange` on web.
    — `src/hooks/useAppLifecycle.ts` (new), `src/contexts/TimeTrackingContext.tsx`
  - **Status bar theming** — `useStatusBar` syncs the iOS status bar text colour (white in dark mode, black in light mode) via `@capacitor/status-bar`; `apple-mobile-web-app-status-bar-style` updated to `black-translucent` so the web view extends behind the status bar region. No-op on web.
    — `src/hooks/useStatusBar.ts` (new), `src/App.tsx`, `index.html`
  - **iOS navigation header** — desktop `SiteNavigationMenu` is hidden on iOS builds and replaced with `IosPageHeader`: a sticky 17px SF-style title bar with safe-area-inset-top padding, back chevron, and right-side action slot. `ios-build` class added to `<body>` on iOS to prevent double-stacking of safe-area padding.
    — `src/components/IosPageHeader.tsx` (new), `src/components/PageLayout.tsx`, `src/main.tsx`, `public/pwa.css`
  - **Keyboard avoidance** — `@capacitor/keyboard` configured with `resize: body` so the viewport shrinks above the keyboard. `useKeyboardHeight` hook tracks keyboard height and applies it as `paddingBottom` on `DrawerContent` so form fields inside bottom sheets remain accessible. `scroll-margin-bottom: 24px` added for native scroll-into-view on input focus.
    — `src/hooks/useKeyboardHeight.ts` (new), `capacitor.config.ts`, `src/components/ui/drawer.tsx`, `public/pwa.css`
  - **Long-press context menus** — `useLongPress` fires a 500 ms hold callback; `TaskItem` wraps cards in a Radix `ContextMenu` (right-click on desktop, long-press on iOS) with Edit and Delete actions. Action buttons hidden on iOS builds where context menus serve as the primary affordance.
    — `src/hooks/useLongPress.ts` (new), `src/components/TaskItem.tsx`
  - **Page transition animations** — route changes in the iOS build play a subtle 280 ms slide-in from the right (`cubic-bezier(0.25, 0.46, 0.45, 0.94)`), scoped to `@supports (-webkit-touch-callout: none)` so the animation never runs on web.
    — `src/App.tsx` (`AnimatedRoutes` component), `public/pwa.css`
  - **New Capacitor plugins** installed: `@capacitor/app`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/keyboard` (all v8.x, matching the existing core/ios versions).

### Changed

- **Touch targets** — `Button` `size="sm"` raised from `h-9` (36 px) to `h-10` (40 px); mobile CSS now enforces `min-height: 44px` on all non-hidden buttons at ≤768 px (previously commented out).
  — `src/components/ui/button.tsx`, `public/pwa.css`
- **Rubber-band scroll bounce** — `overscroll-behavior-y` restored to `auto` on `#root` inside the iOS `@supports` block so the native bounce animation works again (was `contain` globally which suppressed it). vaul drawer elements gain `overscroll-behavior: contain` + `touch-action: pan-y` to prevent scroll bleed through open sheets.
  — `public/pwa.css`


- Tasks navigation item added to desktop top nav and mobile bottom nav; mobile nav grid updated to support up to five items for authenticated users
  — `src/components/Navigation.tsx`, `src/components/MobileNav.tsx`

- Contributing guidelines section in README with commit prefix table and approval requirements
  — `README.md` (documents `major`/`feat`/`fix`/`patch`/`bump`/`maint`/`refactor`/`a11y`/`docs` prefixes and which trigger releases)
- Persistent report summaries — generated summaries are auto-saved to localStorage
  keyed by week + tone (`ttp_report_{weekKey}_{tone}`); a banner prompts users to
  restore a prior summary when returning to a week/tone combo they've already generated
  — `src/hooks/useReportStorage.ts`, `src/pages/Report.tsx`
- Markdown preview toggle in report output panel — Edit/Preview button pair lets users
  render the summary as formatted markdown before exporting
  — `src/components/SummaryOutput.tsx` (uses existing `MarkdownDisplay`)
- Enhanced export actions — Download .txt (slugified filename) and Print/PDF button
  alongside existing Copy; print mode scopes output to summary region only
  — `src/components/SummaryOutput.tsx`, `public/print.css`

### Changed

- Refactored release CI workflow into three separate jobs: `detect`, `approve-major`, `release`
  — `.github/workflows/release.yml` (bump type detection runs in its own job and passes output via `needs`; major releases require approval via the `major-release` GitHub environment; changelog generation switched from raw git commits to `gh pr list` to include PR titles and descriptions)
- Added `major` bump prefix and `a11y` patch prefix to release detection; removed `chore` as a release trigger
  — `.github/workflows/release.yml`

### Fixed

- Fixed iOS task data loss where tasks entered during a session were not present after closing the app
  — `src/contexts/TimeTrackingContext.tsx` (React batches `setState` calls asynchronously, so `saveImmediately()` was reading a stale `latestStateRef` that did not yet include the newly added task; all mutation functions — `startDay`, `startNewTask`, `endDay`, `updateTask`, `deleteTask` — now compute state synchronously and call `dataService.saveCurrentDay()` directly with the correct snapshot; `updateTask` and `deleteTask` were not persisting at all previously; added `visibilitychange` listener as a synchronous `localStorage` backup for iOS app backgrounding since `beforeunload` does not fire reliably in Capacitor/WKWebView; fixed the existing `beforeunload` backup which was missing `_v: SCHEMA_VERSION`, causing it to be discarded on next load by the schema version check in `getCurrentDay()`)

- Reverted Xcode project filename from `TimeTrackerPro.xcodeproj` back to `App.xcodeproj`
  — `ios/App/App.xcodeproj/` (Capacitor CLI hardcodes `App.xcodeproj`; renaming it broke `npm run sync:ios` with ENOENT on `project.pbxproj`; the Xcode target/product name remains "TimeTrackerPro")
- Fixed `open:ios` npm script pointing to the old renamed project path
  — `package.json` (updated from `TimeTrackerPro.xcodeproj/project.xcworkspace` to `App.xcodeproj/project.xcworkspace`)
- Fixed `vite-plugin-pwa` not disabling PWA during iOS builds due to wrong option name
  — `vite.config.ts` (changed `disabled: isIosBuild` → `disable: isIosBuild`; plugin uses `disable`, not `disabled`, so `sw.js`, `workbox-*.js`, and `manifest.webmanifest` were being generated and synced into the iOS bundle on every build)
- Fixed outdated device capability declaration in iOS Info.plist
  — `ios/App/App/Info.plist` (changed `UIRequiredDeviceCapabilities` from `armv7` to `arm64`; Apple dropped 32-bit support in iOS 11 and this stale Capacitor template value can fail App Store validation)
- Removed stale `-DCOCOAPODS` Swift compiler flag from Xcode Debug build settings
  — `ios/App/App.xcodeproj/project.pbxproj` (project uses SPM, not CocoaPods; flag was a leftover from Capacitor's original CocoaPods template with no runtime effect)

### Added

- Capacitor iOS native app scaffolding (Phase 2)
  — `capacitor.config.ts`, `ios/` Xcode project, `package.json` (appId `com.adamjolicoeur.timetrackerpro`, iOS 15+ minimum via SPM, `sync:ios` script combines `build:ios` + `cap sync ios`; `ios/App/App/public` gitignored and regenerated on every sync)
- Renamed Xcode target and product from "App" to "TimeTrackerPro"
  — `ios/App/App.xcodeproj/project.pbxproj` (updated target name, productName, product path, and configuration list comments so Xcode shows "TimeTrackerPro"; project file itself remains `App.xcodeproj` per Capacitor's requirement)
- Capacitor iOS integration prep (Phase 1)
  — `src/App.tsx`, `src/components/Navigation.tsx`, `src/pages/Settings.tsx`, `vite.config.ts`, `.env.ios`, `index.html`, `package.json` (BrowserRouter → HashRouter for filesystem loading; `VITE_IOS_BUILD` flag disables PWA SW and hides auth/sync UI in native builds; CSP updated with `capacitor://localhost`; `build:ios` npm script added)
- `PageLayout` shared layout component for consistent page chrome
  — `src/components/PageLayout.tsx`, `src/components/PageLayout.test.tsx` (standardizes title + optional actions slot across all six pages; all page components migrated to use it)

### Fixed

- Carry over incomplete GFM checklist items as todo tasks when a day is archived
  — `src/contexts/TimeTrackingContext.tsx`, `src/contexts/TimeTracking.test.tsx` (unchecked `- [ ]` items from task descriptions are now extracted and appended as new todo tasks on archive; unique IDs and safe functional setState ensure no data loss on rollback)

### Accessibility

- Added `aria-label` to all icon-only buttons whose visible text label is hidden on mobile viewports: Restore and Edit in `ArchiveItem`, Restore/Delete/Edit in `ArchiveEditDialog` header, per-task Edit/Delete in `ArchiveEditDialog` task table, and Edit/Delete in `ProjectManagement`
- Replaced `focus:outline-none` with `focus-visible:outline-none` + `focus-visible:ring-2 focus-visible:ring-ring` on Radix `TabsTrigger` elements in `ArchiveItem` — the browser focus ring was previously stripped for all input methods; it is now suppressed only for pointer clicks while remaining fully visible for keyboard navigation
- Connected `Label`/`Textarea` pairs via `htmlFor`/`id` in `ArchiveEditDialog` (day notes field) and `TaskEditInArchiveDialog` (task description field) so screen readers announce the field label when the input receives focus

### Code Quality

- Replaced hardcoded Tailwind gray color classes (`text-gray-900`, `text-gray-600/500/400`) with theme variables (`text-foreground`, `text-muted-foreground`) across `ArchiveItem`, `ArchiveEditDialog`, `TaskEditInArchiveDialog`, `ProjectManagement`, and `ExportDialog`
- Replaced hardcoded red color classes (`text-red-*`, `bg-red-*`, `border-red-*`) with `text-destructive`, `bg-destructive/5`, and `border-destructive/20` in the `ArchiveEditDialog` delete confirmation card, `ExportDialog` import error alert, and `TaskEditInArchiveDialog` required-field indicator; switched icon-only Delete buttons to `variant="destructive"` in `ArchiveEditDialog` and `ProjectManagement`
- Replaced `data-[state=active]:border-blue-600` with `data-[state=active]:border-primary` on tab triggers in `ArchiveItem`; replaced `bg-gray-50 dark:bg-gray-800` note/summary panels with `bg-muted`
- Fixed inline style violations: `style={{ marginBottom: '1rem' }}` → `className="mb-4"` in `ArchiveEditDialog`; `style={{ display: 'none' }}` → `className="hidden"` in `ExportDialog`

### Performance

- **Archive page summary stats** (`src/pages/Archive.tsx`): Wrapped the four summary-stat `reduce()` calls (total hours, billable hours, non-billable hours, revenue) in a single `useMemo` keyed on `[filteredDays, projects, categories]`; previously they recomputed on every render regardless of whether the underlying data had changed. Also replaced unstable context method wrappers with stable module-level imports from `calculationUtils` so the memo invalidates only when data actually changes.
- **Archive item row rendering** (`src/components/ArchiveItem.tsx`): Per-day stats (`hoursWorked`, `billableHours`, `nonBillableHours`, `revenue`) are now computed in a `useMemo([day, projects, categories])` instead of inline on every render; also eliminates the duplicate `getRevenueForDay()` call that previously appeared twice in the revenue badge. Project and category lookups in the task table now use `Map.get()` (O(1)) instead of `Array.find()` (O(n)) per row via `useMemo`-cached lookup maps. The daily-summary `generateDailySummary()` call is memoized on `day.tasks` so it only runs when task descriptions change.

### Added

- Native HTML5 time picker component (`TimePicker`) following web standards and a11y best practices
  - Uses `<input type="time">` for familiar, intuitive UX
  - **15-minute intervals**: Time selection restricted to :00, :15, :30, and :45 using HTML5 `step` attribute
  - Automatic native time pickers on mobile devices (iOS/Android)
  - Keyboard-accessible time inputs on desktop
  - Full ARIA label support for screen readers
  - Styled with shadcn/ui design tokens for consistency

### Changed

- **Improved time selection UX**: Replaced custom scroll-wheel time picker with native HTML5 time inputs
  - Follows standard web conventions for familiar, intuitive user experience
  - Better desktop experience with keyboard-accessible inputs
  - Mobile browsers provide native time pickers automatically
  - Full accessibility (a11y) support with proper ARIA labels and keyboard navigation
  - Consistent with existing date input pattern in the application
  - Eliminates custom scroll logic in favor of browser-native functionality
  - **Start Day Dialog**: 1 time picker for day start time
  - **Task Edit Dialog**: 2 time pickers for task start/end times
  - **Archive Edit Dialog**: 4 time pickers (2 for day start/end, 2 for task start/end)
- Removed duplicate `generateTimeOptions()` helper functions from all dialog components

### Security

- Removed unsafe `as string` type assertions on `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `src/lib/supabase.ts` — the assertions hid the `string | undefined` type from TypeScript, preventing the compiler from enforcing the existing null-guard; variables are now correctly typed so the `?? ''` fallback and early warn are properly enforced
- Gated `getDbCallStats`, `resetDbCallStats`, and `clearDbCallLog` window attachments behind `import.meta.env.DEV` in `src/lib/supabase.ts` — internal database call telemetry was previously exposed to anyone with DevTools access in production; Vite now tree-shakes the attachment block out of production bundles
- Added explicit radix `10` to `parseInt()` call in CSV import (`src/utils/exportUtils.ts`) — implicit radix is deprecated and could silently misparse duration strings with leading zeros

### Removed

- Deleted `src/hooks/.useReportSummary-Claude.ts` — unused development dotfile that contained a direct Anthropic API key reference
- Deleted `src/utils/supabase.ts` — duplicate Supabase client that was never imported, creating a redundant connection
- Deleted `src/hooks/useRealtimeSync.ts` — hook whose body was fully disabled (`return;` / `return () => {}`) and was only referenced in a commented-out call
- Deleted `src/hooks/useOffline.tsx` — context accessor hook that was never called anywhere in the application
- Removed `saveCurrentDayRef` from `TimeTrackingContext` — a `useRef` that was declared but never assigned
- Removed `addToQueue`, `offlineQueue`, `processQueue`, and `SYNC_REQUIRED_EVENT` from `OfflineContext` — the offline action queue was implemented but `addToQueue` was never called, so the queue was permanently empty and the sync event was never dispatched; `OfflineContext` now exposes only `isOnline` with online/offline toast notifications

### Fixed

- Fixed online reconnection never triggering a backend sync for authenticated users
  — `src/contexts/TimeTrackingContext.tsx` (added native `online` window event listener that calls `forceSyncToDatabase()` when authenticated; the previous offline-queue mechanism was broken because the queue was never populated, so reconnection silently dropped any pending changes)
- Fixed `trackAuthCall` stub recording no log details
  — `src/lib/supabase.ts` (the function incremented `authCallCount` but created a `timestamp` variable it never used and pushed nothing to `dbCallLog`, making auth call debugging impossible; now writes a full log entry matching `trackDbCall` so `getDbCallStats()` shows auth calls alongside DB calls)
- Fixed `getCurrentDay()` crashing and silently discarding the stored day when the `tasks` field is absent from a localStorage record
  — `src/services/localStorageService.ts` (`data.tasks.map()` threw a TypeError on a missing/null field; replaced with `(data.tasks ?? []).map()` so a corrupt or partial record produces an empty task list instead of swallowing the entire day)
- Improved Weekly Report error messages to distinguish between distinct Gemini API failure modes
  — `src/hooks/useReportSummary.ts` (added `classifyGeminiError()` and `classifyFinishReason()` helpers; 429 rate limit vs. quota exhaustion, 503 overload, 500 server error, 504 timeout, 403 bad key, 400 precondition, 404 model not found, network failures, and content-blocked responses each produce specific actionable messages instead of Gemini's generic "high demand" text)
- Fixed Weekly Report page only reading archived data from localStorage, causing empty reports for authenticated (Supabase) users
  — `src/pages/Report.tsx`, `src/utils/reportUtils.ts` (replaced direct `localStorage.getItem()` call with `useTimeTracking().archivedDays` via new `dayRecordsToArchivedDays()` adapter; both storage modes now work correctly)
- Resolved merge conflicts in `src/index.css`

## [0.21.1] - 2026-02-06

### Initial Release Features

- Daily time tracking with start/stop functionality
- Task management with real-time duration tracking
- Rich text support with GitHub Flavored Markdown
- Projects & clients organization with hourly rates
- Custom categories with color coding
- Archive system for completed work days
- Revenue tracking and automatic calculations
- Invoice generation and export (CSV, JSON)
- CSV import for existing time data
- Progressive Web App with offline support
- Cross-platform compatibility (Windows, Mac, Linux, iOS, Android)
- Dual storage mode (guest/local or authenticated/cloud sync)
- Print-friendly archive views
- Mobile-optimized interface with touch navigation
- Dark mode support
- Authentication via Supabase (optional)
- Cloud sync across devices via Supabase (when authenticated)

---

## Version History

### Versioning Guidelines

- **Major** (X.0.0): Breaking changes, major feature overhauls
- **Minor** (0.X.0): New features, significant improvements, non-breaking changes
- **Patch** (0.0.X): Bug fixes, minor improvements, documentation updates

### Links

- [Unreleased Changes](https://github.com/AdamJ/TimeTrackerPro/compare/v0.54.0...HEAD)
- [Version 0.54.0](https://github.com/AdamJ/TimeTrackerPro/releases/tag/v0.54.0)
- [Version 0.21.1](https://github.com/AdamJ/TimeTrackerPro/releases/tag/v0.21.1)
