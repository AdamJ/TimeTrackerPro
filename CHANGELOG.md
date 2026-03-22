# Changelog

All notable changes to TimeTracker Pro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

### Removed
- Deleted `src/hooks/.useReportSummary-Claude.ts` — unused development dotfile that contained a direct Anthropic API key reference
- Deleted `src/utils/supabase.ts` — duplicate Supabase client that was never imported, creating a redundant connection
- Deleted `src/hooks/useRealtimeSync.ts` — hook whose body was fully disabled (`return;` / `return () => {}`) and was only referenced in a commented-out call
- Deleted `src/hooks/useOffline.tsx` — context accessor hook that was never called anywhere in the application
- Removed `saveCurrentDayRef` from `TimeTrackingContext` — a `useRef` that was declared but never assigned
- Removed `addToQueue`, `offlineQueue`, `processQueue`, and `SYNC_REQUIRED_EVENT` from `OfflineContext` — the offline action queue was implemented but `addToQueue` was never called, so the queue was permanently empty and the sync event was never dispatched; `OfflineContext` now exposes only `isOnline` with online/offline toast notifications

### Fixed
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
