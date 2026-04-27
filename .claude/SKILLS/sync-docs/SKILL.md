---
name: sync-docs
description: >
  Syncs CHANGELOG.md, README.md, README-EXT.md, and CLAUDE.md with the current codebase changes after a major feature or fix, then commits the updates.
  Use before opening a PR or after completing significant work.
---

# Sync Docs — TimeTracker Pro

## When to Use

Run this skill after completing a major feature, bug fix, or refactor — **before creating a PR**.
It keeps the four documentation files consistent with the actual codebase state.

## Files Updated

| File | Updated when... |
|------|----------------|
| `CHANGELOG.md` | Any user-visible or developer-visible change |
| `README.md` | Features, commands, install steps, or quick-start change |
| `README-EXT.md` | Detailed usage, architecture, stack, conventions, or workflow change |
| `CLAUDE.md` | Tech stack, critical code style rules, key files, or iOS config change |

## Steps

### 1 — Gather the diff

```bash
git diff main...HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx' \
  'package.json' 'vite.config.ts' 'tailwind.config.ts' \
  'capacitor.config.ts' 'eslint.config.js'
```

If still on the same branch without a comparison target, use:

```bash
git diff HEAD~1 -- '*.ts' '*.tsx' '*.js' '*.jsx' \
  'package.json' 'vite.config.ts' 'tailwind.config.ts' \
  'capacitor.config.ts' 'eslint.config.js'
```

Read the diff output carefully before touching any documentation file.

### 2 — Update CHANGELOG.md

- Add entries under the `## [Unreleased]` section.
- Use this entry format (from the project's existing pattern):

  ```markdown
  - [Brief description of what changed]
    — `path/to/file.ts`, `path/to/other.ts` ([context/reason])
  ```

- One bullet per **logical change**, not per file.
- Do **not** add an entry if identical wording already exists.
- Do **not** add speculative or future-tense entries.

### 3 — Update README.md

Update only if one or more of the following changed:

- A user-facing feature was added or removed
- An `npm run` command was added, renamed, or removed
- The install/quick-start steps changed
- The "Recent highlights" section in the Changelog block is stale

Keep the README brief — it links out to README-EXT.md for detail.

### 4 — Update README-EXT.md

Update only the section(s) directly affected by the diff:

- **How to Use** — if task/project/category/export workflows changed
- **Progressive Web App** — if PWA manifest, service worker, or install flow changed
- **Authentication & Storage** — if auth flow, storage strategy, or Supabase setup changed
- **Technical Architecture → Technology Stack** — if a dependency was added or removed
- **Technical Architecture → Project Structure** — if new files/directories were added
- **Technical Architecture → Code Conventions** — if lint rules or style requirements changed
- **Development Workflow → Testing** — if test commands or checklists changed
- **Development Workflow → Adding Features** — if patterns for new components/pages changed
- **Documentation Index** — if a new doc file was added or an existing one renamed

Do **not** rewrite or reformat sections that are unaffected.

### 5 — Update CLAUDE.md

Update only if one or more of the following changed:

- **Technology Stack table** — new or removed dependency
- **Critical Code Style** — lint rule or formatting convention change
- **Key Files table** — a key file was added, renamed, or its purpose changed
- **iOS Environment / Capacitor** — iOS build config, scripts, or deployment target changed
- **Pre-Commit Checklist** — new required check added

Do **not** modify the "Agent Sub-Documents" table or general narrative unless the files it references changed.

### 6 — Verify consistency

Quickly cross-check that the four files don't contradict each other:

- CHANGELOG entry matches what README/README-EXT describe
- Any new npm script in CLAUDE.md also appears in README.md's commands table
- Tech stack table in CLAUDE.md and README-EXT.md agree

### 7 — Commit the updates

```bash
git add CHANGELOG.md README.md README-EXT.md CLAUDE.md
git diff --staged --stat
```

Only commit if there are actual changes:

```bash
git commit -m "docs: sync documentation with recent changes"
```

Do **not** use `--no-verify`. Do **not** stage any source files — documentation only.

## Rules

- Modify only the four files listed above.
- Never guess at intent — derive every entry directly from the diff.
- Never add emojis, praise, or filler language.
- Never reformat unchanged sections (no whitespace-only diffs).
- If none of the four files need changes, say so and do nothing.
