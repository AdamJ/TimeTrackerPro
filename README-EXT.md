# TimeTracker Pro — Extended Reference

This document contains detailed usage guides, technical architecture, and developer workflow information.
For the main overview, see [README.md](README.md).

---

## Table of Contents

- [How to Use](#how-to-use)
  - [Daily Workflow](#daily-workflow)
  - [Project Management](#project-management)
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
- [Development Workflow](#development-workflow)
  - [Git Workflow](#git-workflow)
  - [Testing](#testing)
  - [Adding Features](#adding-features)
  - [Customizing Markdown Styles](#customizing-markdown-styles)
- [Documentation Index](#documentation-index)
- [iOS Screenshots](#ios-screenshots)

---

## How to Use

### Daily Workflow

**Morning:**

1. Click "Start Day" to begin tracking. The timer starts automatically.

**Throughout the Day:**

1. Click "New Task" to create a task.
2. Fill in task details:
   - **Title** (required) — brief description of the work
   - **Description** (optional) — detailed notes with markdown support
   - **Project** (optional) — assign to a client/project
   - **Category** (optional) — categorize the work type
3. Task duration calculates automatically.
4. Create new tasks as you switch between work items.

**Evening:**

1. Click "End Day" when finished.
2. Review your day summary (total time, revenue, task breakdown).
3. Click "Post Time to Archive" to save permanently.

**Ongoing:**

- View archived days on the **Archive** page.
- Manage projects and rates via **Archive → Projects**.
- Customize categories on the **Categories** page.
- Export data via **Archive → Export**.

### Project Management

1. Navigate to **Archive → Projects**.
2. Click **Add Project** and enter:
   - Project name and client name
   - Hourly rate
   - Billable / non-billable flag
3. Assign projects to tasks when creating or editing them.

Projects enable automatic revenue calculation, per-client invoice exports, and archive filtering.

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
npm run test-csv-import
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

1. Open TimeTracker Pro in your browser.
2. Click the install icon (⊕) in the address bar.
3. Click "Install" — the app opens in its own window.

**iOS (Safari):**

1. Open TimeTracker Pro in Safari.
2. Tap the Share button (□↑) → "Add to Home Screen" → "Add".
3. Toggle "Open as Web App" to On.

**Android (Chrome):**

1. Open TimeTracker Pro in Chrome.
2. Tap the menu (⋮) → "Install app" or "Add to Home screen".

### PWA Features

**Offline Capability:** All features work without internet; data syncs automatically when the connection is restored.

**Mobile Optimized:** Bottom navigation, 44×44 px minimum touch targets, safe-area support for notched devices, responsive layout.

**Seamless Updates:** New versions install automatically with a refresh prompt; no data is lost.

**Native-Like Experience:** Standalone window, app icon, splash screen on launch.

---

## Authentication & Storage

### Storage Modes

| Mode                         | Description                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Guest (default)**          | No account required. All data in `localStorage`. Full functionality, single-device only.                      |
| **Authenticated (optional)** | Sign in via Supabase. Data synced to PostgreSQL. Multi-device access with automatic `localStorage` migration. |

### How Data Storage Works

TimeTracker Pro uses a **manual sync** approach optimized for single-device usage:

1. **In-Memory First** — changes update React state immediately.
2. **Critical Event Saves** — data persists only on day end, window close, or manual sync.
3. **No Auto-Save** — prevents unnecessary API calls and rate limiting.

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

**5. Restart the dev server:** `npm run dev`

> ⚠️ Never commit your `.env` file to version control.

### Authentication Flow

**Sign Up:** Click "Sign In" → "Sign Up" tab → enter email and password → verify email → sign in.

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
| UI Framework | React 18 + TypeScript 5.8                   |
| Build        | Vite 5 + SWC                                |
| Routing      | React Router 6                              |
| Styling      | Tailwind CSS 3 + Radix UI + shadcn/ui       |
| Icons        | Radix Icons (primary), Lucide (fallback)    |
| Forms        | React Hook Form + Zod                       |
| Backend      | Supabase (optional) or localStorage         |
| PWA          | Vite PWA Plugin + Workbox                   |
| Native iOS   | Capacitor 8                                 |
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

Data persistence is abstracted through a factory that returns either `LocalStorageService` or `SupabaseService` depending on auth state:

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
- `useTimeTracking()` — time tracking operations
- `useOffline()` — offline queue management

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

**Critical save events:** day end (`postDay()`), window close (`beforeunload`), manual sync (`forceSyncToDatabase()`).

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
│   ├── ui/                   # Base components (49 files)
│   ├── ArchiveEditDialog.tsx
│   ├── ArchiveFilter.tsx
│   ├── ArchiveItem.tsx
│   ├── AuthDialog.tsx
│   ├── CategoryManagement.tsx
│   ├── DaySummary.tsx
│   ├── DeleteConfirmationDialog.tsx
│   ├── ExportDialog.tsx
│   ├── InstallPrompt.tsx
│   ├── MarkdownDisplay.tsx
│   ├── MobileNav.tsx
│   ├── Navigation.tsx
│   ├── NewTaskForm.tsx
│   ├── ProjectManagement.tsx
│   ├── StartDayDialog.tsx
│   ├── SyncStatus.tsx
│   ├── TaskEditDialog.tsx
│   ├── TaskItem.tsx
│   ├── UpdateNotification.tsx
│   └── UserMenu.tsx
├── config/
│   ├── categories.ts         # Default categories
│   └── projects.ts           # Default projects
├── contexts/
│   ├── AuthContext.tsx
│   ├── TimeTrackingContext.tsx
│   └── OfflineContext.tsx
├── hooks/
│   ├── useAuth.tsx
│   ├── useTimeTracking.tsx
│   ├── useOffline.tsx
│   └── use-toast.tsx
├── lib/
│   ├── supabase.ts           # Supabase client
│   └── utils.ts              # Helper functions
├── pages/
│   ├── Index.tsx             # Home / time tracker
│   ├── Archive.tsx           # Archived days
│   ├── ProjectList.tsx       # Project management
│   ├── Categories.tsx        # Category management
│   ├── Report.tsx            # AI weekly summary
│   ├── Settings.tsx          # App settings
│   └── NotFound.tsx          # 404 page
├── services/
│   └── dataService.ts        # Persistence abstraction
├── utils/
│   ├── timeUtil.ts           # Time formatting
│   └── reportUtils.ts        # Report grouping and formatting
├── App.tsx
└── main.tsx
```

### Code Conventions

| Rule        | Requirement                                          |
| ----------- | ---------------------------------------------------- |
| Indentation | Tabs only, 2-space display width                     |
| Quotes      | Double quotes always (`""`)                          |
| Imports     | `@/` alias — never relative paths (`../../`)         |
| Components  | PascalCase (`TaskItem.tsx`)                          |
| Hooks       | camelCase with `use` prefix (`useAuth.tsx`)          |
| Utilities   | camelCase (`timeUtil.ts`)                            |
| Constants   | UPPER_SNAKE_CASE (`STORAGE_KEYS`)                    |
| Styling     | Radix/theme variables — never custom Tailwind colors |

See [CLAUDE.md](CLAUDE.md) for comprehensive conventions.

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
# Types: feat, fix, refactor, docs, style, test, chore
```

**Pull Requests:** Title format `[TimeTrackerPro] Descriptive Title`. See [agents/pull_requests.md](agents/pull_requests.md) for full guidelines.

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
npm run test                 # Vitest unit tests
npm run test-csv-import      # Standard CSV import
npm run test-full-import     # Full CSV import
npm run test-error-handling  # CSV error handling
npm run screenshots:install  # Install Playwright (first time)
npm run screenshots          # Capture PWA screenshots
```

### Adding Features

**New component:**

```typescript
// Create in src/components/
// Use shadcn/ui components; import via @/ alias
import { MyFeature } from '@/components/MyFeature';
```

**New page:**

```typescript
// 1. Create in src/pages/
// 2. Lazy-load in App.tsx
const MyPage = lazy(() => import("./pages/MyPage"));
// 3. Add route
<Route path="/mypage" element={<MyPage />} />
// 4. Add navigation link in Navigation.tsx
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

**Global theme overrides (`tailwind.config.ts`):**

```typescript
typography: {
  DEFAULT: {
    css: {
      color: "#333",
      a: { color: "#3182ce", "&:hover": { color: "#2c5282" } }
    }
  }
}
```

---

## Documentation Index

| Document                                                               | Description                               |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| [CLAUDE.md](CLAUDE.md)                                                 | Comprehensive codebase guide — start here |
| [AGENTS.md](AGENTS.md)                                                 | Quick agent instructions and workflows    |
| [agents/styles.md](agents/styles.md)                                   | UI/UX style guidelines                    |
| [agents/pull_requests.md](agents/pull_requests.md)                     | PR creation and review rules              |
| [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)                       | Auth setup and configuration              |
| [docs/AUTH_DATA_PERSISTENCE_FIX.md](docs/AUTH_DATA_PERSISTENCE_FIX.md) | Persistence implementation details        |
| [docs/SCHEMA_COMPATIBILITY.md](docs/SCHEMA_COMPATIBILITY.md)           | Database schema history                   |
| [docs/MIGRATION.md](docs/MIGRATION.md)                                 | Supabase data migration guide             |
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

---

## iOS Screenshots

| View                  | Image                                                              |
| --------------------- | ------------------------------------------------------------------ |
| Dashboard             | <img src="screenshots/iOS/01TimeTrackerPro-iOS.png" width="200" alt="Timetracker screenshot 01" /> |
| Time Entry — Markdown | <img src="screenshots/iOS/02TimeTrackerPro-iOS.png" width="200" alt="Timetracker screenshot 02" /> |
| Time Entry — Preview  | <img src="screenshots/iOS/03TimeTrackerPro-iOS.png" width="200" alt="Timetracker screenshot 03" /> |
| Active Tasks          | <img src="screenshots/iOS/04TimeTrackerPro-iOS.png" width="200" alt="Timetracker screenshot 04" /> |
| Day Ended             | <img src="screenshots/iOS/06TimeTrackerPro-iOS.png" width="200" alt="Timetracker screenshot 06" /> |
| Archive               | <img src="screenshots/iOS/07TimeTrackerPro-iOS.png" width="200" alt="Timetracker screenshot 07" /> |
