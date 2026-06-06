# CLAUDE.md - AI Assistant Codebase Guide

**Last Updated:** 2026-05-30
**Version:** 2.4.0

Timetraked is a React 18 + TypeScript time tracking PWA for freelancers and consultants, with dual storage (localStorage guest mode and optional Supabase cloud sync). A native iOS app is also available via Capacitor.

## Documentation

After making changes, always sync documentation files before opening a PR. Use the **sync-docs** skill (`.claude/skills/sync-docs/SKILL.md`) to update CHANGELOG.md, README.md, README-EXT.md, and CLAUDE.md to reflect the current codebase state, then commit the updates.

## Git Workflow

Always create feature branches for changes instead of committing directly to main. Never commit directly to main unless explicitly told to.

## Quality Checks

After implementing changes, run lint and tests before considering a task complete. Fix any failures before reporting success.

---

## Technology Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| UI Framework | React 18 + TypeScript 5.9                   |
| Build        | Vite 5 + SWC                                |
| Routing      | React Router 6                              |
| Styling      | Tailwind CSS 3 + Radix UI + shadcn/ui       |
| Icons        | Radix Icons (primary), Lucide (fallback)    |
| Forms        | React Hook Form + Zod                       |
| Backend      | Supabase (optional) or localStorage         |
| PWA          | Vite PWA Plugin + Workbox                   |
| Native iOS   | Capacitor 8 (@capacitor/core + @capacitor/ios + @capacitor/app + @capacitor/haptics + @capacitor/status-bar + @capacitor/keyboard) |
| Testing      | Vitest + React Testing Library + Playwright |

---

## Critical Code Style — NON-NEGOTIABLE

⚠️ **These are hard project requirements enforced by the linter. Violating them causes build failures.**

- **Indentation**: Tabs (not spaces), tab width = 2
- **Quotes**: Always double quotes (`""`) — never single quotes (`''`)
- **Imports**: Always use `@/` alias — never relative paths like `../../`
- **Colors**: Always use Radix/theme variables — never custom Tailwind colors like `bg-blue-500`
- **Components**: Always use shadcn/ui components — never raw HTML with custom styles

```typescript
// ✅ CORRECT
export const MyComponent = () => {
  return <div className="bg-primary text-primary-foreground">Hello</div>;
};

// ❌ WRONG — spaces, single quotes, custom color
export const MyComponent = () => {
  return <div className='bg-blue-500'>Hello</div>;
};
```

---

## Key Files

| File                                   | Purpose                                          |
| -------------------------------------- | ------------------------------------------------ |
| `src/contexts/TimeTrackingContext.tsx` | Main application state and logic (1200+ lines)   |
| `src/services/dataService.ts`          | Data persistence factory — returns `LocalStorageService` or `SupabaseService` |
| `src/services/supabaseService.ts`      | Supabase data persistence implementation (1100+ lines) |
| `src/services/localStorageService/`    | localStorage data persistence implementation (split into per-entity modules) |
| `src/contexts/AuthContext.tsx`         | Authentication state management                  |
| `src/lib/supabase.ts`                  | Supabase client configuration and caching        |
| `src/config/categories.ts`             | Default category definitions                     |
| `src/config/projects.ts`               | Default project definitions                      |
| `src/components/ClientManagement.tsx`  | Client list UI: add, archive (with active-project guard), and restore clients |
| `src/pages/Clients.tsx`                | Thin page wrapper around `ClientManagement` (route `/clients`) |
| `src/services/localStorageService/clients.ts` | Client persistence module for guest mode (versioned localStorage blob) |
| `supabase/migrations/20260530_clients.sql` | `clients` table + RLS + one-time backfill from distinct project clients |
| `src/components/PageLayout.tsx`        | Shared page chrome (title + optional actions slot); renders `IosPageHeader` on iOS |
| `src/components/IosPageHeader.tsx`     | iOS-only sticky nav bar with safe-area-inset-top, back chevron, and action slot |
| `src/components/ui/adaptive-dialog.tsx` | Renders vaul `Drawer` on iOS, Radix `Dialog` on web |
| `src/components/BackdatedEntryDialog.tsx` | Multi-step dialog for logging past workdays; uses `addBackdatedDay` from context |
| `src/hooks/useHaptics.ts`             | `@capacitor/haptics` wrapper (light/medium/heavy, success/error) |
| `src/hooks/useAppLifecycle.ts`        | `@capacitor/app` appStateChange hook for reliable background persistence |
| `src/hooks/useLongPress.ts`           | 500 ms hold detector for context menu trigger on touch |
| `capacitor.config.ts`                  | Capacitor iOS configuration (Keyboard resize plugin configured here) |
| `.env.ios`                             | iOS build env (VITE_IOS_BUILD=true, no Supabase) |

---

## iOS Environment Health Check

Before making any changes to iOS-related code or configs, run the **ios-health-check** skill (`.claude/skills/ios-health-check/SKILL.md`). It runs five checks, auto-fixes any failures, and reports results before proceeding with the actual task.

---

## Client Management

Clients are a managed entity (added in the client-management feature) that backs the project form's client dropdown.

- **`Client` type** (`src/contexts/TimeTrackingContext.tsx`): `{ id: string; name: string; archived: boolean; createdAt: string }`. Exported alongside `Project` and consumed by `dataService.ts`.
- **`STORAGE_KEYS.CLIENTS`** (`"timetracker_clients"`): added in both `localStorageService/constants.ts` and the context's local key map. Persisted via `getClients()` / `saveClients()` on `DataService`. Guest mode uses the localStorage blob (`localStorageService/clients.ts`); authenticated mode uses a dedicated Supabase `clients` table (`supabase/migrations/20260530_clients.sql`) so clients sync across devices. The migration backfills the table once from each user's distinct project client names.
- **Seeding/reconcile guard**: on every load the context init block reconciles the client list against the unique `client` name strings on `projects` — any project client name not already present (active or archived) is appended as an active client and the list is saved. Idempotent; covers both first run and clients introduced later (e.g. CSV import). Silent, runs in-app only.
- **`archived` on `Project`**: optional field, normalized at load time with `project.archived ?? false` so legacy projects need no migration. Project archiving was introduced **as part of this feature to support the client archive guard** (a client cannot be archived while it still owns active projects) rather than as a standalone feature.
- **New context methods**: `clients`, `addClient(name)`, `archiveClient(id) → string | null` (returns an error message naming blocking active projects, or `null` on success), `restoreClient(id)`, `archiveProject(id)`, `restoreProject(id)`. Project methods don't auto-save — consumers call `forceSyncToDatabase()` (same pattern as `addProject`).
- **Client persistence**: to minimize Supabase calls, clients are **not** part of `forceSyncToDatabase`'s bulk save. The three client mutations keep a `clientsRef` in sync synchronously, and consumers persist explicitly:
  - **Add** uses `persistClient(client)` → `dataService.upsertClient` — a single-row upsert (**1** Supabase call), since adding never removes a row. `addClient(name)` returns the created `Client` (or `null` if blank) for this.
  - **Archive/restore** use `persistClients()` → `dataService.saveClients` — the full-list reconcile (select-missing + upsert = **2** calls).
  - `SupabaseService.getClients`/`saveClients`/`upsertClient` share the read-cache (`getCachedClients`/`setCachedClients` in `src/lib/supabase.ts`), so a load is one read on cache miss and free thereafter; `upsertClient` updates the cache in place.

---

## Capacitor iOS Build

The app ships as both a PWA and a native iOS app via Capacitor 8.

**Key differences in iOS builds:**

- `VITE_IOS_BUILD=true` disables the Vite PWA service worker and hides auth/sync UI (UserMenu, AuthDialog, SyncStatus, InstallPrompt, UpdateNotification)
- Routing uses `HashRouter` (required — Capacitor loads from filesystem, not a server)
- CSP includes `capacitor://localhost` for WKWebView asset loading
- Data storage is localStorage-only (no Supabase keys in `.env.ios`)
- Desktop `SiteNavigationMenu` is hidden; `IosPageHeader` renders instead (sticky, safe-area-aware, back chevron)
- All edit/confirm dialogs (`TaskEditDialog`, `StartDayDialog`, `ArchiveEditDialog`, `DeleteConfirmationDialog`) become bottom sheets via `AdaptiveDialog`; on web the existing Radix Dialog renders unchanged
- Haptic feedback fires on every meaningful interaction via `useHaptics`
- `@capacitor/app` `appStateChange` event used for emergency data persistence (more reliable than `visibilitychange`)
- `@capacitor/status-bar` syncs status bar text colour with system dark/light mode
- `@capacitor/keyboard` configured with `resize: body`; viewport shrinks above the keyboard so bottom-sheet form fields stay accessible
- Long-press on task cards opens a context menu (Edit / Delete); on-card action buttons are hidden

**Installed Capacitor plugins** (all v8.x):

| Package | Purpose |
| ------- | ------- |
| `@capacitor/core` + `@capacitor/ios` | Core bridge (pre-existing) |
| `@capacitor/app` | Native app lifecycle events (pause/resume) |
| `@capacitor/haptics` | Tactile feedback |
| `@capacitor/status-bar` | Status bar style control |
| `@capacitor/keyboard` | Keyboard height events and viewport resize |

**iOS npm scripts:**

```bash
npm run build:ios      # vite build --mode ios (outputs to dist/)
npm run sync:ios       # build:ios + npx cap sync ios (copies dist/ into ios/ project)
```

**Working with the Xcode project:**

When working on iOS/Capacitor projects, remember that `cap sync` overwrites Package.swift. Always apply iOS build config changes in capacitor.config.ts, not directly in Xcode project files.

- `ios/App/App/public` is gitignored — it is regenerated by `cap sync ios`
- Open `ios/App/App.xcodeproj/project.xcworkspace` in Xcode (or run `npm run open:ios`)
- Bundle ID: `com.adamjolicoeur.Timetraked`
- Minimum iOS version: 26 (enforced via Package.swift SPM)

**When adding new features:**

- Gate any web-only UI (PWA install, auth, sync) behind `import.meta.env.VITE_IOS_BUILD !== "true"`
- Avoid `window.location.reload()` in iOS paths — use `window.location.replace()` to avoid interrupting the Capacitor JS bridge
- Test localStorage-only flow (no Supabase) before marking iOS features complete
- For new dialogs/modals: use `AdaptiveDialog` (`src/components/ui/adaptive-dialog.tsx`) instead of `Dialog` directly — it automatically renders a bottom sheet on iOS
- Add haptic feedback for new interactions via `useHaptics` (`src/hooks/useHaptics.ts`): `lightImpact` for navigation/selection, `mediumImpact` for intent to delete, `heavyImpact` for confirmed destructive actions, `successNotify`/`errorNotify` for outcomes
- All new Capacitor plugin calls should be gated with `Capacitor.isNativePlatform()` or imported dynamically (see existing hooks for the pattern) so the web build never fails at runtime on missing native APIs

---

## Electron Desktop Build

The app can also be packaged as a native Mac (DMG) or Windows (NSIS) desktop app via Electron.

**Key files:**

| File | Purpose |
| ---- | ------- |
| `electron/main.ts` | Electron main process — BrowserWindow, CSP header, dev/prod load logic |
| `electron/tsconfig.json` | Compiles `electron/` to CJS in `dist-electron/` (isolated from the app tsconfig) |
| `vite.electron.config.ts` | Dedicated Vite config for bundling only the main process (no VitePWA, no React) |

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

**When adding Electron-specific features:**

- Gate Electron-only code on `process.env.ELECTRON_DEV` or check `app.isPackaged` in the main process
- Do not add `nodeIntegration: true` — use `contextBridge` + `ipcRenderer` if the renderer needs Node access
- Never modify `electron/tsconfig.json`'s `"module": "commonjs"` — it must stay CJS

---

## Pre-Commit Checklist

1. `npm run lint` — fix all errors
2. `npm run build` — ensure no type errors
3. Test changed functionality manually
4. Verify tabs (not spaces) and double quotes throughout

---

## Agent Sub-Documents

Read these files proactively based on what you're working on:

| When you're working on...                                       | Read this file                              |
| --------------------------------------------------------------- | ------------------------------------------- |
| Architecture, data flow, auth flow, contexts, DataService       | `agents/architecture.md`                    |
| Naming conventions, TypeScript patterns, UI/styling rules       | `agents/conventions.md`                     |
| Dev setup, npm commands, git workflow, Supabase                 | `agents/workflow.md`                        |
| Adding components, pages, context methods, data service methods | `agents/operations.md`                      |
| Testing, QA checklists, code quality requirements               | `agents/testing.md`                         |
| Debugging, common mistakes, architecture gotchas, Gemini errors | `agents/pitfalls.md`                        |
| UI/styling rules and Radix component usage                      | `agents/styles.md`                          |
| Pull request guidelines                                         | `agents/pull_requests.md`                   |
| Adding a new feature (TDD workflow)                             | `.claude/skills/new-feature/SKILL.md`       |
| Syncing docs before a PR                                        | `.claude/skills/sync-docs/SKILL.md`         |
| Any iOS/Capacitor changes                                       | `.claude/skills/ios-health-check/SKILL.md`  |

---

**Note**: When in doubt, follow existing patterns and ask clarifying questions rather than making assumptions.
