# Timetraked — Extended Reference

This document contains detailed usage guides, technical architecture, and developer workflow information.
For the main overview, see [README.md](README.md).

---

## Table of Contents

- [How to Use](#how-to-use)
  - [Daily Workflow](#daily-workflow)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
  - [Project Management](#project-management)
  - [Client Management](#client-management)
  - [Category Management](#category-management)
  - [Data Export & Import](#data-export--import)
  - [Markdown in Task Descriptions](#markdown-in-task-descriptions)
- [Progressive Web App](#progressive-web-app)
  - [Installing as an App](#installing-as-an-app)
  - [PWA Features](#pwa-features)
- [Authentication & Storage](#authentication--storage)
  - [Storage Modes](#storage-modes)
  - [How Data Storage Works](#how-data-storage-works)
  - [Setting Up Cloud Sync](#setting-up-cloud-sync)
  - [Authentication Flow](#authentication-flow)
  - [Security](#security)
- [Technical Architecture](#technical-architecture)
  - [Technology Stack](#technology-stack)
  - [Architecture Patterns](#architecture-patterns)
  - [Data Flow](#data-flow)
  - [Project Structure](#project-structure)
  - [Code Conventions](#code-conventions)
- [Theming](#theming)
- [Development Workflow](#development-workflow)
  - [Git Workflow](#git-workflow)
  - [Testing](#testing)
  - [Adding Features](#adding-features)
  - [Customizing Markdown Styles](#customizing-markdown-styles)
- [Documentation Index](#documentation-index)

---

## How to Use

### Daily Workflow

**Morning:**

1. Click "Start Day" on the dashboard to begin tracking. The app navigates to the **Tasks** page automatically.

**Throughout the Day:**

1. Click "New Task" on the Tasks page to create a task.
2. Fill in task details:
   - **Title** (required) — brief description of the work
   - **Description** (optional) — detailed notes with markdown support
   - **Project** (optional) — assign to a client/project
   - **Category** (optional) — categorize the work type
3. Task duration calculates automatically.
4. Create new tasks as you switch between work items.

**Evening:**

1. Click "End Day" on the Tasks page (or the Dashboard) when finished.
2. Review your day summary (total time, revenue, task breakdown).
3. Click "Post Time to Archive" to save permanently.

**Ongoing:**

- View archived days on the **Archive** page.
- Manage projects and rates via **Archive → Projects**.
- Customize categories on the **Categories** page.
- Export data via **Archive → Export**.

### Keyboard Shortcuts

Available in both the web/PWA build and the Electron desktop app:

| Shortcut | Action |
| --- | --- |
| `N` | Create a new task (Dashboard only — a no-op elsewhere, it never redirects you) |
| `Cmd/Ctrl+S` | Save changes (triggers a manual sync) |
| `Cmd/Ctrl+K` | Open the command palette — jump to any page or run an action |
| `?` | Show the keyboard shortcuts help dialog |

New Task uses a plain `N` rather than `Cmd/Ctrl+N` in the web/PWA build because Chrome and Firefox reserve that combination for opening a new browser window and never deliver it to page JavaScript from a regular tab — it's unpreventable outside of an installed PWA. The command palette and help dialog are also reachable from the keyboard icon in the page header.

On Electron, `Cmd/Ctrl+S`/`Cmd/Ctrl+K` are native menu accelerators (File/View menus) dispatched to the renderer over the existing `menu:action` IPC channel; New Task keeps the native `Cmd/Ctrl+N` accelerator there too, since Electron doesn't have the browser's reservation. `?` has no native accelerator but works identically on both platforms since it isn't intercepted by the OS menu layer.

### Project Management

1. Navigate to **Settings → Manage Projects** (or **Archive → Projects**).
2. Click **Add Project** and enter:
   - Project name
   - **Client** — choose an existing client from the dropdown, or pick **+ Add new client** to create one inline without leaving the form. Projects whose client was set before client management existed show their client as a disabled "(unmanaged)" entry so the legacy value stays visible.
   - Hourly rate
   - Billable / non-billable flag
3. Assign projects to tasks when creating or editing them.
4. **Archive / Restore** — use the archive action on a project row to move it into the collapsed **Archived** section; restore it from there at any time. Archiving keeps historical data intact while hiding the project from the active list.

Projects enable automatic revenue calculation, per-client invoice exports, and archive filtering.

### Client Management

1. Navigate to **Settings → Manage Clients**.
2. Click **Add Client** to create a client (name only).
3. **Archive / Restore** — archive clients you no longer work with from the active list; restore them from the collapsed **Archived** section.
4. A client cannot be archived while it still owns active (non-archived) projects. Attempting to do so shows an inline warning naming the blocking projects — archive those projects first.

Clients populate the project form's client dropdown. On first run the client list is seeded automatically from the client names already referenced by existing projects.

### Category Management

1. Navigate to **Categories** from the main menu.
2. Click **Add Category** to create a custom category with a name, color, and billable flag.

**Default categories:** Meeting, Development, Design, Research, Administration, Testing, Documentation, Client Communication.

### Data Export & Import

**Exporting:**

1. Navigate to **Archive → Export**.
2. Choose a format:
   - **CSV** — for spreadsheets or accounting software
   - **JSON** — for backup or programmatic access
   - **Invoice** — client-ready invoice format
3. Optionally filter by date range, project, or client, then download.

**Importing:**

Prepare a CSV using the [template format](docs/CSV_TEMPLATES_README.md), then use the import functionality or run a test script:

```bash
pnpm test-csv-import
```

### Markdown in Task Descriptions

Task descriptions support **GitHub Flavored Markdown (GFM)**:

- **Bold** and _italic_ text
- Lists (bulleted and numbered), task lists with checkboxes
- Tables and ~~strikethrough~~
- Links and code blocks
- Headings with automatic line breaks

**Example:**

```markdown
## Client Meeting Notes

**Attendees:** John, Sarah, Mike

**Action Items:**

- [ ] Send meeting minutes
- [ ] Update project roadmap
```

---

## Progressive Web App

### Installing as an App

**Desktop (Chrome / Edge / Firefox):**

1. Open Timetraked in your browser.
2. Click the install icon (⊕) in the address bar.
3. Click "Install" — the app opens in its own window.

**iOS (Safari):**

1. Open Timetraked in Safari.
2. Tap the Share button (□↑) → "Add to Home Screen" → "Add".
3. Toggle "Open as Web App" to On.

**Android (Chrome):**

1. Open Timetraked in Chrome.
2. Tap the menu (⋮) → "Install app" or "Add to Home screen".

### PWA Features

**Offline Capability:** All features work without internet; data syncs automatically when the connection is restored.

**Mobile Optimized:** Bottom navigation, 44×44 px minimum touch targets, safe-area support for notched devices, responsive layout, native OS picker (instead of an in-page popover) for dropdowns like category/project/client selection.

**Seamless Updates:** New versions install automatically with a refresh prompt; no data is lost.

**Native-Like Experience:** Standalone window, app icon, splash screen on launch.

---

## Authentication & Storage

### Storage Modes

| Mode                         | Description                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Guest (default)**          | No account required. All data in `localStorage`. Full functionality, single-device only.                      |
| **Authenticated (optional)** | Sign in via Supabase. Data synced to PostgreSQL. Multi-device access with automatic `localStorage` migration. |
| **Self-hosted SQL (optional)** | Opt-in via `VITE_DATA_BACKEND=sql`. Talks to the small REST API in `server/` backed by your own Postgres or MySQL database. See [docs/SQL_BACKEND.md](docs/SQL_BACKEND.md). |

### How Data Storage Works

Timetraked uses an **action-triggered save** approach optimized for single-device usage:

1. **In-Memory First** — changes update React state immediately.
2. **Action Saves** — every task mutation (start, update, delete) and day lifecycle event (start day, end day) triggers an immediate `saveCurrentDay()` call with the freshly computed state, keeping localStorage and Supabase in sync without a debounce delay.
3. **Emergency Backups** — on web, `visibilitychange` and `beforeunload` write a synchronous localStorage snapshot as a last-resort fallback before JavaScript execution is suspended.
4. **Manual Sync** — the sync button in the navigation saves all data types (tasks, projects, categories, archived days, todos) in one batch, useful after recovering from an error. Bulk saves are upsert-only and never delete rows missing from the local snapshot — deleting a project, category, or todo persists immediately as its own explicit single-row delete, so a stale snapshot on one device can't wipe out data added from another.
5. **Electron Disk Backups** — on the desktop build, the same save events (plus the app's `before-quit` lifecycle) additionally write a JSON snapshot to a disk file under the OS user-data directory (pruned to the most recent 20), a failure domain independent of `localStorage`. No-ops on web/PWA builds.
6. **In-App Recovery** — in guest mode, Settings → "Data Recovery" lists the schema-mismatch `localStorage` backups and (on desktop) the disk snapshots above, with an entity-count preview before restoring. Restoring writes the backup back into the live storage keys and reloads the app.

When you sign in, your `localStorage` data automatically migrates to Supabase (timestamps compared to prevent overwriting newer data, no data loss). When you sign out, Supabase data syncs back to `localStorage`.

### Setting Up Cloud Sync

**1. Create a Supabase project** at [supabase.com](https://supabase.com).

**2. Get API credentials** from Project Settings → API (copy the Project URL and anon/public key).

**3. Configure your environment:**

```bash
cp .env.example .env
# Edit .env:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**4. Apply the database schema** from `supabase/migrations/` (see [Schema Compatibility](docs/SCHEMA_COMPATIBILITY.md)).

**5. Restart the dev server:** `pnpm dev`

> ⚠️ Never commit your `.env` file to version control.

### Setting Up a Self-Hosted SQL Backend

For local deployments that don't want Supabase, Timetraked can run against your own PostgreSQL or MySQL database via a small bundled REST API (`server/`). This mode is fully opt-in — leaving `VITE_DATA_BACKEND` unset keeps the existing Supabase/`localStorage` behavior unchanged.

**1. Configure the backend** in `.env` (see `.env.example` for the full list): `DB_CLIENT` (`pg` or `mysql2`), `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

**2. Apply the schema and seed default data:**

```bash
pnpm run db:migrate
pnpm run db:seed
```

**3. Start the backend API:**

```bash
pnpm run server:dev
```

**4. Point the frontend at it** in `.env`:

```bash
VITE_DATA_BACKEND=sql
VITE_SQL_API_URL=http://localhost:4001/api
```

See [docs/SQL_BACKEND.md](docs/SQL_BACKEND.md) for full setup details.

### Authentication Flow

**Sign In:** Click "Sign In" → enter credentials → data migrates from `localStorage`.

**Sign Out:** Click user menu → "Sign Out" → data syncs back to `localStorage`.

### Security

- All API calls over HTTPS.
- Row-level security (RLS) enabled on Supabase — users access only their own data.
- Passwords hashed and salted by Supabase Auth (minimum 8 characters).
- No sensitive data stored in `localStorage`.

See [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) and [docs/SECURITY.md](docs/SECURITY.md) for full details.

---

## Technical Architecture

### Technology Stack

| Category     | Technology                                  |
| ------------ | ------------------------------------------- |
| UI Framework | React 18 + TypeScript 5.9                   |
| Build        | Vite 5 + SWC                                |
| Routing      | React Router 6                              |
| Styling      | Tailwind CSS 4 + Radix UI + shadcn/ui       |
| Icons        | Radix Icons (primary), Lucide (fallback)    |
| Forms        | React Hook Form + Zod                       |
| Backend      | Supabase (optional) or localStorage         |
| PWA          | Vite PWA Plugin + Workbox                   |
| Testing      | Vitest + React Testing Library + Playwright |

### Architecture Patterns

#### 1. Context-Driven Architecture

```text
App.tsx
└── AuthProvider (authentication state)
    └── TimeTrackingProvider (time tracking state)
        └── OfflineProvider (offline queue)
            └── Pages & Components
```

#### 2. Service Layer Pattern

Data persistence is abstracted through a factory that returns `LocalStorageService`, `SupabaseService`, or `SqlApiService` depending on auth state and the `VITE_DATA_BACKEND` env var:

```typescript
interface DataService {
  loadCurrentDay(): Promise<DayData>;
  saveCurrentDay(data: DayData): Promise<void>;
  loadArchivedDays(): Promise<ArchivedDay[]>;
  saveArchivedDays(days: ArchivedDay[]): Promise<void>;
}

const service = createDataService(isAuthenticated);
```

#### 3. Custom Hooks Pattern

- `useAuth()` — authentication state and methods
- `useTimeTracking()` — time tracking state and operations
- `useLongPress()` — 500 ms hold detector for touch context menus
- `useReportStorage()` — persists and restores generated AI report summaries
- `useReportSummary()` — calls Gemini API to generate weekly summaries

### Data Flow

```text
User Action
  ↓
Component Event Handler
  ↓
Context Method (useTimeTracking)
  ↓
State Update (React setState)
  ↓
UI Re-render
  ↓
(On critical events only)
  ↓
DataService.save()
  ↓
localStorage OR Supabase
```

**Save triggers:** every task mutation and day lifecycle event calls `dataService.saveCurrentDay()` directly; `postDay()` additionally saves archived days and todos; `visibilitychange` and `beforeunload` write synchronous localStorage backups; `forceSyncToDatabase()` (manual sync) saves all data types in parallel. On the Electron desktop build, `postDay()` and `forceSyncToDatabase()` also write a disk-based JSON backup via IPC, plus a final one on app quit — see "Electron Disk Backups" above.

**Service Worker caching:**

```javascript
NetworkFirst:  Supabase API calls (fresh data preferred)
CacheFirst:    Google Fonts (static assets)
Precache:      App shell (HTML, CSS, JS, icons)
```

### Project Structure

```text
src/
├── components/
│   ├── ui/                       # Base components (49+ files, including adaptive-dialog, kbd, command)
│   ├── AppSidebar.tsx            # Collapsible sidebar nav (replaces top Navigation)
│   ├── ArchiveEditDialog.tsx
│   ├── ArchiveFilter.tsx
│   ├── ArchiveItem.tsx
│   ├── AuthDialog.tsx
│   ├── BackdatedEntryDialog.tsx
│   ├── CategoryManagement.tsx
│   ├── CategorySheet.tsx
│   ├── ClientManagement.tsx
│   ├── ClientSheet.tsx
│   ├── CommandPalette.tsx        # Cmd/Ctrl+K "jump to" navigation + actions (built on ui/command)
│   ├── DaySummary.tsx
│   ├── DeleteConfirmationDialog.tsx
│   ├── ExportDialog.tsx
│   ├── InstallPrompt.tsx
│   ├── KanbanBoard.tsx            # Kanban planning board
│   ├── KanbanColumn.tsx
│   ├── KeyboardShortcutsDialog.tsx # "?" help dialog listing shortcuts (uses ui/kbd)
│   ├── MarkdownDisplay.tsx
│   ├── MobileNav.tsx
│   ├── Navigation.tsx
│   ├── NewTaskForm.tsx
│   ├── PageLayout.tsx             # Delegates title/badge/actions to PageTitleContext
│   ├── PlannedTaskCard.tsx
│   ├── PlannedTaskDialog.tsx
│   ├── ProjectManagement.tsx
│   ├── ProjectSheet.tsx
│   ├── PwaUpdatePrompt.tsx
│   ├── StaleDayDialog.tsx
│   ├── StartDayDialog.tsx
│   ├── SummaryOutput.tsx
│   ├── SyncStatus.tsx
│   ├── TaskEditDialog.tsx
│   ├── TaskItemInArchiveDialog.tsx
│   ├── TaskItem.tsx
│   ├── TaskTrackingPanel.tsx
│   ├── UpdateNotification.tsx
│   └── UserMenu.tsx
├── config/
│   ├── categories.ts             # Default categories
│   └── projects.ts               # Default projects
├── contexts/
│   ├── AuthContext.tsx
│   ├── OfflineContext.tsx         # Online/offline detection and toasts
│   ├── PageTitleContext.tsx
│   └── TimeTrackingContext.tsx
├── hooks/
│   ├── use-mobile.tsx            # Mobile-specific state management
│   ├── use-toast.tsx             # Toast notification state management
│   ├── useAuth.tsx               # Authentication state management
│   ├── useElectronMenuActions.ts # Electron menu:action IPC → navigate/save/command-palette/help
│   ├── useKeyboardShortcuts.ts   # Global web/PWA keyboard shortcuts (N, Cmd/Ctrl+S/K, ?)
│   ├── useLongPress.ts           # 500 ms hold detector
│   ├── usePageTitle.ts           # Page title state management
│   ├── useReportStorage.ts       # Persist generated report summaries
│   ├── useReportSummary.ts       # Gemini AI summary generation
│   └── useTimeTracking.tsx       # Time tracking state management
├── lib/
│   ├── electronMenuActions.ts     # Pending menu-action stash consumed by page-mount effects
│   ├── platform.ts                # isMac/modKey — shortcut hint glyph per platform
│   ├── supabase.ts               # Supabase client and call telemetry
│   └── utils.ts                  # Helper functions
├── pages/
│   ├── Archive.tsx               # Archived days
│   ├── Categories.tsx            # Category management
│   ├── Client.tsx                # Client management
│   ├── Index.tsx                 # Dashboard (start/end day, stats)
│   ├── NotFound.tsx              # 404 page
│   ├── ProjectList.tsx           # Project management
│   ├── Report.tsx                # AI weekly summary
│   ├── Settings.tsx              # App settings
│   └── TaskList.tsx              # Active task list and NewTaskForm
├── services/
│   ├── localStorageService/      # localStorage implementation (per-entity modules)
│   ├── dataService.ts            # Factory — returns LocalStorage, Supabase, or SqlApi impl
│   ├── supabaseService.ts        # Supabase implementation (1100+ lines)
│   └── sqlApiService.ts          # REST client for the self-hosted server/ backend
├── utils/
│   ├── calculationUtils.ts       # Revenue and hours calculations
│   ├── checklistUtils.ts         # GFM checklist extraction
│   ├── exportUtils.ts            # CSV import/export
│   ├── reportUtils.ts            # Report grouping and formatting
│   └── timeUtil.ts               # Time formatting
├── App.css
├── App.tsx
├── index.css
└── main.tsx
```

### Code Conventions

| Rule        | Requirement                                          |
| ----------- | ---------------------------------------------------- |
| Indentation | Spaces (not tabs), width = 2 display width           |
| Quotes      | Double quotes always (`""`)                          |
| Imports     | `@/` alias — never relative paths (`../../`)         |
| Components  | PascalCase (`TaskItem.tsx`)                          |
| Hooks       | camelCase with `use` prefix (`useAuth.tsx`)          |
| Utilities   | camelCase (`timeUtil.ts`)                            |
| Constants   | UPPER_SNAKE_CASE (`STORAGE_KEYS`)                    |
| Styling     | Prefer semantic tokens (`bg-primary`, `bg-muted`, etc.) for theming. Radix scale classes (`bg-mauve-3`, `text-blue-11`, `border-violet-6`) are allowed for explicit color needs — use steps 1-2 for backgrounds, 3-5 for component fills, 6-8 for borders, 9-10 for solid fills, 11-12 for text. Never use arbitrary Tailwind palette colors like `bg-blue-500`. |

See [CLAUDE.md](CLAUDE.md) for comprehensive conventions.

---

## Theming

Tailwind CSS v4 (CSS-first config — no `tailwind.config.ts`). All theme tokens live in `src/index.css`:

- **`@theme` block** — maps semantic tokens (`--color-background`, `--color-primary`, `--color-border`, etc.) and Radix color scales (`--color-gray-1`...`--color-gray-12`, etc.) to CSS custom properties so Tailwind generates utilities like `bg-background`, `text-primary`, `bg-mauve-3`.
- **`:root` / `.dark`** (`@layer base`) — define the actual HSL values for `--background`, `--foreground`, `--primary`, `--border`, `--ring`, `--sidebar-*`, etc. Switching themes = overriding these in `.dark`.
- **`@radix-ui/colors`** — light/dark scale imports for the colors actually used in the app (`gray`, `mauve`, `slate`, `red`, `purple`, `violet`, `indigo`, `blue`, `cyan`, `green`, `brown`, `orange`) provide the `--gray-1`...`--gray-12` etc. raw values consumed by `@theme`. Add a new scale's import + `@theme` mapping only when a component needs it.
- **`components.json`** — `"tailwind": { "config": "" }` (v4 has no JS config), `cssVariables: true`, `baseColor: "neutral"`.

**Rules:**

- Use semantic tokens (`bg-primary`, `bg-muted`, `text-foreground`) for theming first.
- For explicit colors, use Radix scale classes (`bg-mauve-3`, `text-blue-11`, `border-violet-6`) — steps 1–2 backgrounds, 3–5 component fills, 6–8 borders, 9–10 solid fills, 11–12 text.
- Never use arbitrary Tailwind palette colors (`bg-blue-500`).
- Don't add a second design system (e.g. `@radix-ui/themes`) — its `<Theme>` wrapper sets its own `--color-background` etc. on `.radix-themes`, which collides with and overrides the shadcn `@theme` tokens above, breaking `bg-background` app-wide. Use Radix Primitives + shadcn/ui only.

To add a new theme color: add the HSL value to `:root`/`.dark`, then map it in `@theme` as `--color-<name>: hsl(var(--<name>))`.

---

## Development Workflow

### Git Workflow

**Branch naming:**

```bash
feature/your-feature-name
fix/bug-description
refactor/area-name
```

**Commit messages:**

```bash
# Format: <type>: <description>
git commit -m "feat: add billable category option"
git commit -m "fix: resolve data recovery issue"
git commit -m "refactor: split localStorageService into modules"
```

**Release-triggering prefixes** (used in PR titles — determines CI version bump):

| Prefix                                     | Bump  | Approval required?                               |
| ------------------------------------------ | ----- | ------------------------------------------------ |
| `major:`                                   | Major | Yes (code owner via `major-release` environment) |
| `feat:` / `feature:` / `fix:`              | Minor | No                                               |
| `patch:`                                   | Patch | No                                               |
| `bump:` / `maint:` / `refactor:` / `a11y:` | Patch | No                                               |
| `docs:` / `chore:` / others                | None  | —                                                |

**Pull Requests:** Title format `[prefix]: Descriptive Title`. See [agents/pull_requests.md](agents/pull_requests.md) for full guidelines.

### Testing

**Manual checklist:**

- [ ] Guest mode (no auth)
- [ ] Authenticated mode
- [ ] Mobile viewport (DevTools)
- [ ] Data persistence after page refresh
- [ ] Export/import functionality
- [ ] No console errors
- [ ] Responsive design

**PWA checklist:**

- [ ] Service worker registers (DevTools → Application → Service Workers)
- [ ] App works offline (DevTools → Network → Offline)
- [ ] Install prompt appears
- [ ] Update notification works

**Automated tests:**

```bash
pnpm test                 # Vitest unit tests
pnpm run test-csv-import      # Standard CSV import
pnpm run test-full-import     # Full CSV import
pnpm run test-error-handling  # CSV error handling
pnpm run screenshots:install  # Install Playwright (first time)
pnpm run screenshots          # Capture PWA screenshots
```

### Adding Features

**New component:**

```typescript
// Create in src/components/
// Use shadcn/ui components; import via @/ alias
import { MyFeature } from "@/components/MyFeature";
```

**New page:**

```typescript
// 1. Create in src/pages/
// 2. Lazy-load in App.tsx
const MyPage = lazy(() => import("./pages/MyPage"));
// 3. Add route
<Route path="/mypage" element={<MyPage />} />
// 4. Add navigation link in AppSidebar.tsx
```

**New context method:**

1. Define in context interface.
2. Implement in provider.
3. Export in context value.
4. Consume via the relevant hook.

### Customizing Markdown Styles

**Utility classes (recommended):**

```tsx
<MarkdownDisplay
  content={text}
  className="prose-p:text-blue-500 prose-headings:underline"
/>
```

**Global theme overrides (`src/index.css`, inside `@theme`):**

```css
@theme {
  --color-prose-body: #333;
  --color-prose-links: #3182ce;
}
```

---

## Documentation Index

| Document                                                               | Description                               |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| [CLAUDE.md](CLAUDE.md)                                                 | Specific for Claude - references AGENTS.md |
| [AGENTS.md](AGENTS.md)                                                 | Comprehensive guide    |
| [agents/styles.md](agents/styles.md)                                   | UI/UX style guidelines                    |
| [agents/pull_requests.md](agents/pull_requests.md)                     | PR creation and review rules              |
| [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)                       | Auth setup and configuration              |
| [docs/AUTH_DATA_PERSISTENCE_FIX.md](docs/AUTH_DATA_PERSISTENCE_FIX.md) | Persistence implementation details        |
| [docs/SCHEMA_COMPATIBILITY.md](docs/SCHEMA_COMPATIBILITY.md)           | Database schema history                   |
| [docs/MIGRATION.md](docs/MIGRATION.md)                                 | Supabase data migration guide             |
| [docs/SQL_BACKEND.md](docs/SQL_BACKEND.md)                             | Self-hosted SQL (Postgres/MySQL) backend setup |
| [docs/SECURITY.md](docs/SECURITY.md)                                   | Security configuration and practices      |
| [docs/CSV_TEMPLATES_README.md](docs/CSV_TEMPLATES_README.md)           | CSV import/export format                  |
| [docs/FEATURES.md](docs/FEATURES.md)                                   | Feature requests and improvement notes    |
| [info/README-LOVABLE.md](info/README-LOVABLE.md)                       | Project origin and history                |

**External references:**

- [Radix UI](https://www.radix-ui.com) — component primitives
- [shadcn/ui](https://ui.shadcn.com) — component library
- [Tailwind CSS](https://tailwindcss.com) — CSS framework
- [React Router](https://reactrouter.com) — routing
- [Supabase Docs](https://supabase.com/docs) — backend
- [Vite](https://vitejs.dev) — build tool
