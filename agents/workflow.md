# Development Workflow — TimeTracker Pro

## Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd TimeTrackerPro

# Install dependencies
npm install

# Setup environment (optional — for cloud sync)
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
# Opens on http://localhost:8080
```

## Available Commands

```bash
# Development
npm run dev              # Start dev server (localhost:8080)
npm run build            # Build for production
npm run build:dev        # Build with development mode
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run test             # Run Vitest tests

# Testing Scripts
npm run test-full-import      # Test full CSV import
npm run test-error-handling   # Test CSV error handling
npm run test-csv-import       # Test standard CSV import

# PWA Screenshot Generation
npm run screenshots:install   # Install Playwright browsers (first time only)
npm run screenshots           # Capture PWA screenshots (headless)
npm run screenshots:headed    # Capture screenshots with visible browser
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
# Types: feat, fix, refactor, docs, style, test, chore

git commit -m "feat: add billable category option"
git commit -m "fix: data recovery issues"
git commit -m "refactor: improve data service caching"
```

### Creating Pull Requests

1. **Title Format**: `[TimeTrackerPro] <Descriptive Title>`
2. **Description**: Clear explanation of changes
3. **Wait for checks**: Don't merge until all tests pass
4. **Add labels**: Appropriate PR labels
5. **See**: `agents/pull_requests.md` for full guidelines

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
