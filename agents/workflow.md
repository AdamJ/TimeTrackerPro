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

## Dependencies

Direct dependencies are pinned to exact versions in `package.json`, and `saveExact: true` in `pnpm-workspace.yaml` makes `pnpm add` pin too, so `pnpm update` does not move them.

```bash
pnpm add <pkg>@<version>   # bump or add one dependency on purpose (pinned automatically)
pnpm outdated              # see what newer releases exist
```

- `minimumReleaseAge: 43200` (30 days, in minutes) in `pnpm-workspace.yaml` makes pnpm refuse to resolve any release younger than that, for direct and transitive dependencies, including `pnpm update`. Asking for a younger version fails with `ERR_PNPM_NO_MATCHING_VERSION`; wait until it is 30 days old. Commit `package.json` and `pnpm-lock.yaml` together.
- `minimumReleaseAgeExclude` lists exact versions that were already in the lockfile when the policy was added (including the four security-floor overrides). Delete an entry once that release is 30 days old; do not add entries to force an install through. If `pnpm install` fails with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`, a locked version is younger than the policy, so inspect the lockfile change that introduced it.
- `pnpm update` can still move transitive dependencies within their parents' ranges (only to releases at least 30 days old), and `pnpm update --latest` rewrites the pins; check the lockfile diff before committing either.
- The `overrides` in `pnpm-workspace.yaml` are security floors (for example `body-parser: ">=2.4.0"`), so they are intentionally ranges.

## Available Commands

```bash
# Development
pnpm dev              # Start dev server (localhost:8080)
pnpm build            # Build for production
pnpm build:dev        # Build with development mode
pnpm preview          # Preview production build

# Code Quality
pnpm lint             # Run ESLint
pnpm check:design-tokens  # Flag default Tailwind palette / hex color classes in src/
pnpm check:a11y       # jsx-a11y lint (eslint.a11y.config.js)
pnpm lint:markdown    # markdownlint-cli2
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
