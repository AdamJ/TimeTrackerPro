# TimeTracker Pro

A Progressive Web App (PWA) for time tracking built with React, TypeScript, and Tailwind CSS. Installable on desktop and mobile with full offline support. Built for freelancers, consultants, and professionals who need to track time, manage projects, and generate invoices.

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white) ![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white) ![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)

---

## Features

- **Daily Time Tracking** — start/stop your workday with clear daily boundaries
- **Task Management** — create, edit, and delete tasks with real-time duration tracking
- **Projects & Clients** — organize work by project with per-project hourly rates
- **Revenue Tracking** — automatic earnings calculation based on hourly rates
- **Custom Categories** — color-coded, billable/non-billable categorization
- **Rich Text Notes** — GitHub Flavored Markdown in task descriptions
- **Archive & Export** — permanent record with CSV, JSON, and invoice export formats
- **CSV Import** — bring in existing time data from other tools
- **Weekly Report** — AI-generated work summaries (standup, client, or retrospective tone)
- **No Account Required** — full functionality with local storage; optional cloud sync via Supabase
- **PWA + Native iOS** — installable on desktop/mobile; distributed as a native iOS app via Capacitor 8

---

## Quick Start

```bash
git clone https://github.com/AdamJ/TimeTrackerPro.git
cd TimeTrackerPro
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

**First run:** click "Start Day" to begin tracking. No configuration required.

**Optional — cloud sync:** copy `.env.example` to `.env` and add your Supabase credentials (see [Authentication & Storage](README-EXT.md#authentication--storage)).

---

## Available Commands

```bash
# Development
npm run dev              # Start dev server (localhost:8080)
npm run build            # Production build
npm run preview          # Preview production build

# Code Quality
npm run lint             # ESLint
npm run test             # Vitest unit tests

# iOS / Capacitor
npm run build:ios        # Vite build for iOS (no PWA/auth UI)
npm run sync:ios         # build:ios + cap sync ios

# PWA Screenshots
npm run screenshots:install   # Install Playwright (first time)
npm run screenshots           # Capture screenshots (headless)

# CSV Import Testing
npm run test-csv-import
npm run test-full-import
npm run test-error-handling
```

---

## Development Setup

**Prerequisites:** Node.js 18+ and npm. Supabase account is optional (guest mode works without it).

```bash
npm install
npm run dev
```

Before committing:

```bash
npm run lint && npm run build
```

See [CLAUDE.md](CLAUDE.md) for code style requirements (tabs, double quotes, `@/` imports). See [README-EXT.md](README-EXT.md) for full developer documentation.

---

## For Developers

Detailed documentation lives in [README-EXT.md](README-EXT.md):

- [How to Use](README-EXT.md#how-to-use) — daily workflow, project/category management, export/import, markdown
- [Progressive Web App](README-EXT.md#progressive-web-app) — install instructions and PWA feature details
- [Authentication & Storage](README-EXT.md#authentication--storage) — storage modes, cloud sync setup, auth flow, security
- [Technical Architecture](README-EXT.md#technical-architecture) — stack, patterns, data flow, project structure, conventions
- [Development Workflow](README-EXT.md#development-workflow) — git workflow, testing, adding features
- [Documentation Index](README-EXT.md#documentation-index) — links to all docs
- [iOS Screenshots](README-EXT.md#ios-screenshots)

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full history of changes.

**Recent highlights:**

- Native iOS app via Capacitor 8 with iOS-specific build mode (`build:ios` / `sync:ios`)
- `PageLayout` shared component standardizes page chrome across all pages
- Incomplete checklist items carry over as todo tasks when archiving a day
- Weekly Report distinguishes Gemini API failure modes (rate limit, quota, overload, key issues)
- Fixed Weekly Report for authenticated users (data sourced from Supabase)

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
