# Development Workflow — Timetraked

## Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd TimeTrackerPro

# Install dependencies
pnpm install

# Setup environment (optional — for cloud sync)
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
pnpm dev
# Opens on http://localhost:8080
```

## Available Commands

```bash
# Development
pnpm dev              # Start dev server (localhost:8080)
pnpm build            # Build for production
pnpm build:dev        # Build with development mode
pnpm preview          # Preview production build

# Code Quality
pnpm lint             # Run ESLint
pnpm test             # Run Vitest tests

# Testing Scripts
pnpm test-full-import      # Test full CSV import
pnpm test-error-handling   # Test CSV error handling
pnpm test-csv-import       # Test standard CSV import

# PWA Screenshot Generation
pnpm screenshots:install   # Install Playwright browsers (first time only)
pnpm screenshots           # Capture PWA screenshots (headless)
pnpm screenshots:headed    # Capture screenshots with visible browser
```

**PWA Screenshot Usage:**

1. `npm run screenshots:install` — Install Playwright browsers (~300MB, one-time)
2. `npm run dev` — Start dev server (keep running)
3. `npm run screenshots` — Generate screenshots in new terminal
4. Screenshots saved to `public/screenshots/`

See `tests/SCREENSHOTS_README.md` for detailed documentation.

---

## Git Workflow

### Branch Naming

- Feature branches: `claude/claude-md-<session-id>-<feature>`
- Always work on designated branch from session instructions

### Commit Messages

```bash
# Format: <type>: <description>
git commit -m "feat: add billable category option"
git commit -m "fix: data recovery issues"
git commit -m "refactor: improve data service caching"
```

**Release-triggering prefixes** (used in PR titles — determines CI version bump):

| Prefix | Bump | Approval required? |
| --- | --- | --- |
| `major:` | Major | Yes (code owner via `major-release` environment) |
| `feat:` / `feature:` / `fix:` | Minor | No |
| `patch:` | Patch | No |
| `bump:` / `maint:` / `refactor:` / `a11y:` | Patch | No |
| `docs:` / `chore:` / others | None | — |

### Creating Pull Requests

1. **Title Format**: `[Timetraked] <Descriptive Title>`
2. **Description**: Clear explanation of changes
3. **Run checks locally**: `pnpm lint && pnpm build && pnpm test`
4. **Wait for CI**: Don't merge until all checks pass
5. **Add labels**: Appropriate PR labels
6. **See**: `agents/pull_requests.md` for full guidelines

**Release-triggering prefixes** (determines CI version bump):

| Prefix | Bump | Approval |
| --- | --- | --- |
| `major:` | Major | Code owner required |
| `feat:` / `feature:` / `fix:` | Minor | No |
| `patch:` | Patch | No |
| `bump:` / `maint:` / `refactor:` / `a11y:` | Patch | No |
| `docs:` / `chore:` / others | None | — |

---

## Working with Supabase

### Environment Setup

```bash
# .env file (never commit this!)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Database Schema Location

- Schema definitions: `supabase/migrations/`
- See `docs/SCHEMA_COMPATIBILITY.md` for schema history
