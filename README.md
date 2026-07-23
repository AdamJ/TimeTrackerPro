# Timetraked

> Previously TimeTracker Pro

A Progressive Web App (PWA) for time tracking built with React, TypeScript, and Tailwind CSS. Installable on desktop and mobile with full offline support. Built for freelancers, consultants, and professionals who need to track time, manage projects, and generate invoices.

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white) ![Tauri](https://img.shields.io/badge/Tauri-Enabled-FFC131?style=for-the-badge&logo=tauri&logoColor=white)

![GitHub Release](https://img.shields.io/github/v/release/AdamJ/TimeTrackerPro?style=for-the-badge) ![GitHub Release Date](https://img.shields.io/github/release-date/AdamJ/TimeTrackerPro?style=for-the-badge) ![W3C Validation](https://img.shields.io/w3c-validation/default?targetUrl=https%3A%2F%2Ftimetrackerpro.adamjolicoeur.me&style=for-the-badge)


---

## Features

- **Daily Time Tracking** — start/stop your workday with clear daily boundaries
- **Task Management** — create, edit, and delete tasks with real-time duration tracking
- **Projects & Clients** — organize work by project with per-project hourly rates; projects and clients can be archived and restored
- **Client Management** — maintain a managed client list with address and contact details; add, edit, and archive clients (blocked while they still have active projects); pick clients from a dropdown when creating projects
- **Revenue Tracking** — automatic earnings calculation based on hourly rates
- **Custom Categories** — color-coded, billable/non-billable categorization
- **Rich Text Notes** — GitHub Flavored Markdown in task descriptions
- **Archive & Export** — permanent record with CSV, JSON, and invoice export formats
- **Backdated Entry Creation** — log work for past days directly from the Archive page via "Add Past Entry"
- **CSV Import** — bring in existing time data from other tools
- **Weekly Report** — AI-generated work summaries (standup, client, or retrospective tone)
- **Keyboard Shortcuts** — `N` new task, `Cmd/Ctrl+S` save, `Cmd/Ctrl+K` command palette, `?` for the shortcuts help dialog (web and Tauri desktop; the desktop app's native menu also offers `Cmd/Ctrl+N` for new task)
- **No Account Required** — full functionality with local storage; optional cloud sync via Supabase
- **Self-Hosted SQL Backend** — optionally run against your own PostgreSQL or MySQL database instead of Supabase or local storage (see [docs/SQL_BACKEND.md](docs/SQL_BACKEND.md))
- **PWA** — installable on desktop/mobile

---

## Quick Start

```bash
git clone https://github.com/AdamJ/TimeTrackerPro.git
cd TimeTrackerPro
pnpm install
pnpm dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

**First run:** click "Start Day" to begin tracking. No configuration required.

**Optional — cloud sync:** copy `.env.example` to `.env` and add your Supabase credentials (see [Authentication & Storage](README-EXT.md#authentication--storage)).

---

## Available Commands

```bash
# Development
pnpm dev                 # Start dev server (localhost:8080)
pnpm build               # Production build
pnpm preview             # Preview production build

# Code Quality
pnpm lint                # ESLint
pnpm test                # Vitest unit tests (395 tests across 38 files)

# PWA Screenshots
pnpm screenshots:install   # Install Playwright (first time)
pnpm screenshots           # Capture screenshots (headless)

# CSV Import Testing
pnpm test-csv-import
pnpm test-full-import
pnpm test-error-handling

# Self-Hosted SQL Backend (optional)
pnpm db:migrate          # apply schema to your Postgres/MySQL database
pnpm db:seed             # seed default categories/projects
pnpm server:dev          # run the backend API in watch mode
pnpm server:start        # run the backend API
```

---

## Development Setup

**Prerequisites:** Node.js 18+ and pnpm. Supabase account is optional (guest mode works without it).

```bash
pnpm install
pnpm dev
```

Before committing:

```bash
pnpm lint && pnpm build
```

See [AGENTS.md](AGENTS.md) for code style requirements (tabs, double quotes, `@/` imports). See [README-EXT.md](README-EXT.md) for full developer documentation.

---

## For Developers

Detailed documentation lives in [README-EXT.md](README-EXT.md):

- [How to Use](README-EXT.md#how-to-use) — daily workflow, project/category management, export/import, markdown
- [Progressive Web App](README-EXT.md#progressive-web-app) — install instructions and PWA feature details
- [Authentication & Storage](README-EXT.md#authentication--storage) — storage modes, cloud sync setup, auth flow, security
- [Technical Architecture](README-EXT.md#technical-architecture) — stack, patterns, data flow, project structure, conventions
- [Development Workflow](README-EXT.md#development-workflow) — git workflow, testing, adding features
- [Documentation Index](README-EXT.md#documentation-index) — links to all docs

### Contributing

When creating an issue or pull request, utilize the templates provided by this repository.

When creating a pull request, make sure that the commit message contains one of the accepted prefixes:

| Prefix                                     | Type                    | Release                 |
| ------------------------------------------ | ----------------------- | ----------------------- |
| `major`                                    | **MAJOR**               | Runs _after_ approval   |
| `feat:` / `feature:` / `fix:`              | **MINOR (FIX/FEATURE)** | Runs _without_ approval |
| `patch:`                                   | **PATCH (FIX)**         | Runs _without_ approval |
| `bump:` / `maint:` / `refactor:` / `a11y:` | **PATCH:**              | Runs _without_ approval |
| `docs:`                                    | -                       | No release              |

> **MAJOR** version bumps require approval from code owners.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full history of changes.

**Recent highlights:**

- **Keyboard shortcuts** — global `N`/`Cmd/Ctrl+S`/`Cmd/Ctrl+K` shortcuts and a `?` help dialog in the web/PWA build, plus native `Cmd/Ctrl+N`/`Cmd/Ctrl+S`/`Cmd/Ctrl+K` menu accelerators in the Tauri desktop build
- **Guest-mode data durability** — schema-mismatch backups, write-failure toasts, undo for hard deletes, Tauri desktop disk-based backup snapshots (independent of `localStorage`, including a final flush on app quit), and an in-app "Data Recovery" UI in Settings to preview and restore those backups
- **Self-hosted SQL backend** — opt-in PostgreSQL/MySQL support via a small REST API (`server/`), alongside the existing Supabase and local storage modes
- **Backdated entry creation** — "Add Past Entry" button on Archive page opens a multi-step dialog to log tasks for any past date
- **Kanban planning board** — drag-and-drop task planning view (`KanbanBoard`, `KanbanColumn`, `PlannedTaskCard`)
- Persistent report summaries saved to localStorage; markdown preview/export in the report output panel
- `AppSidebar` collapsible sidebar navigation with live session timer; `PageTitleContext` decouples page header state from layout

---

## License

MIT License — open source and free to use.

---

## Credits

- Originally started with [Lovable](https://lovable.dev) — [learn more](info/README-LOVABLE.md)
- Badges from [markdown-badges](https://github.com/Ileriayo/markdown-badges)
- UI components from [shadcn/ui](https://ui.shadcn.com) on [Radix UI](https://www.radix-ui.com)
- Icons from [Radix Icons](https://www.radix-ui.com/icons) and [Lucide](https://lucide.dev)
- Built with [React](https://react.dev), [Vite](https://vitejs.dev), and [Supabase](https://supabase.com)
