# Changelog

All notable changes to TimeTracker Pro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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

### Fixed
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
- [Unreleased Changes](https://github.com/AdamJ/TimeTrackerPro/compare/v0.21.1...HEAD)
- [Version 0.21.1](https://github.com/AdamJ/TimeTrackerPro/releases/tag/v0.21.1)
