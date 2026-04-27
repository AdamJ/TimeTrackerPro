---
name: new-feature
description: >
  Implements a new feature using a strict TDD workflow: read codebase patterns, write failing tests first, implement iteratively until all tests pass and lint is clean, then summarize decisions. Use when asked to add a feature or when "implement [FEATURE]" is requested.
---

# New Feature — TimeTracker Pro

## Clarification (if needed)

If the feature has not been stated, ask:

> "What feature would you like to implement? Please describe what it does and
> any relevant context (which page it lives on, what data it touches, etc.)."

Do not proceed until the feature is clearly defined.

---

## Autonomous Workflow

Follow these steps strictly and in order. Do not skip steps or combine them.

### Step 1 — Read the codebase

Before writing a single line of code, read:

1. **Existing tests** for the area you're touching:
   - `src/components/*.test.{ts,tsx}`
   - `src/contexts/*.test.{ts,tsx}`
   - `src/services/*.test.{ts,tsx}`
   - `src/utils/*.test.{ts,tsx}`
2. **The component or context closest to the new feature** — understand existing patterns before introducing new ones.
3. **[agents/conventions.md](../../agents/conventions.md)** — naming, TypeScript usage, and styling rules.
4. **[agents/architecture.md](../../agents/architecture.md)** — data flow, context structure, and service layer patterns.
5. **[agents/operations.md](../../agents/operations.md)** — how to add components, pages, context methods, and data service methods.

Do not proceed until you have enough context to write correct tests.

### Step 2 — Write failing tests first

Create or update test files **before implementing the feature**.

Cover all of the following:

- **Happy path** — the feature works under normal conditions
- **Edge cases** — empty state, boundary values, loading states, no data
- **Known error patterns** (from this project's history):
  - Wrong function signatures passed as props
  - State updates triggered during render (causes React warnings)
  - Undefined references when context value is not yet initialized
  - localStorage read/write failures (mock these explicitly)
  - Supabase calls in guest mode (must be no-ops, not errors)

Run the tests to confirm they fail for the right reason:

```bash
npm run test -- --run
```

All new tests must fail at this point. If a test passes without implementation, the test is too weak — strengthen it.

### Step 3 — Implement iteratively

Build the feature in small increments, running tests after each meaningful change:

```bash
npm run test -- --run
npm run lint
```

Follow project code style — **non-negotiable**:

- Tabs, not spaces (2-space display width)
- Double quotes `""` always
- `@/` import alias — never relative paths like `../../`
- shadcn/ui components — never raw HTML with custom styles
- Radix/theme color variables — never custom Tailwind colors like `bg-blue-500`

Follow project architecture patterns:

- New UI → `src/components/` using shadcn/ui primitives
- New page → `src/pages/` with lazy load added in `App.tsx`
- New state/logic → method on `TimeTrackingContext` consumed via `useTimeTracking()`
- New persistence → method on `DataService` interface, implemented in both
  `LocalStorageService` and `SupabaseService`
- New utility → `src/utils/` (pure functions, easy to unit-test)

### Step 4 — Do not stop until green

Continue iterating until:

- [ ] All new tests pass
- [ ] All pre-existing tests still pass
- [ ] `npm run lint` exits with no errors
- [ ] `npm run build` succeeds

**Do not ask for help or report partial progress.** Debug failures yourself:

1. Read the full error output — do not skim it.
2. Identify the root cause before changing code.
3. Fix one issue at a time, then re-run tests.
4. If stuck after two attempts on the same failure, step back and re-read the relevant context or service file from scratch.

### Step 5 — Commit the work

Stage only files related to the feature:

```bash
git add <files>
git status   # verify nothing unintended is staged
git commit -m "feat: <concise description of the feature>"
```

Do not use `--no-verify`. Do not commit test artifacts or build output.

### Step 6 — Write a summary

After committing, output a brief summary covering:

1. **What was built** — one-paragraph description of the feature
2. **Files added/changed** — list with one-line purpose for each
3. **Architectural decisions** — any non-obvious choices made (e.g., why state lives in context vs. local, why a new service method was needed)
4. **Known limitations** — anything deferred or out of scope
5. **Next step** — remind to run the `sync-docs` skill before opening a PR

---

## Rules

- Never implement before tests exist.
- Never declare success while any test or lint failure remains.
- Never bypass linting (`--no-verify`, `eslint-disable` without justification).
- Never introduce new raw HTML elements where a shadcn/ui equivalent exists.
- Never use relative import paths.
- Never commit directly to `main` — always use a feature branch.
