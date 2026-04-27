# CLAUDE.md - AI Assistant Codebase Guide

**Last Updated:** 2026-04-26
**Version:** 2.2.0

TimeTracker Pro is a React 18 + TypeScript time tracking PWA for freelancers and consultants, with dual storage (localStorage guest mode and optional Supabase cloud sync). A native iOS app is also available via Capacitor.

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
| UI Framework | React 18 + TypeScript 5.8                   |
| Build        | Vite 5 + SWC                                |
| Routing      | React Router 6                              |
| Styling      | Tailwind CSS 3 + Radix UI + shadcn/ui       |
| Icons        | Radix Icons (primary), Lucide (fallback)    |
| Forms        | React Hook Form + Zod                       |
| Backend      | Supabase (optional) or localStorage         |
| PWA          | Vite PWA Plugin + Workbox                   |
| Native iOS   | Capacitor 8 (@capacitor/core + @capacitor/ios) |
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
| `src/contexts/TimeTrackingContext.tsx` | Main application state and logic (1400+ lines)   |
| `src/services/dataService.ts`          | Data persistence abstraction layer (1100+ lines) |
| `src/contexts/AuthContext.tsx`         | Authentication state management                  |
| `src/lib/supabase.ts`                  | Supabase client configuration and caching        |
| `src/config/categories.ts`             | Default category definitions                     |
| `src/config/projects.ts`               | Default project definitions                      |
| `src/components/PageLayout.tsx`        | Shared page chrome (title + optional actions slot) |
| `capacitor.config.ts`                  | Capacitor iOS configuration                      |
| `.env.ios`                             | iOS build env (VITE_IOS_BUILD=true, no Supabase) |

---

## iOS Environment Health Check

Before making any changes to iOS-related code or configs, run this health check and auto-fix any failures before proceeding.

**Checks to run:**

1. **swift-tools-version drift** — Verify `// swift-tools-version:` in `ios/App/CapApp-SPM/Package.swift` matches `experimental.ios.spm.swiftToolsVersion` in `capacitor.config.ts`
2. **Stale Package.resolved** — Run `swift package resolve` inside `ios/App/CapApp-SPM/` to confirm `Package.resolved` is current
3. **iOS build targets** — Verify all `IPHONEOS_DEPLOYMENT_TARGET` entries in `ios/App/App.xcodeproj/project.pbxproj` match the platform version in `Package.swift`
4. **Workspace integrity** — Confirm no `.xcworkspace` or `.pbxproj` file references paths that no longer exist
5. **Build validation** — Run `npm run build:ios` and capture any errors

**Auto-fix solutions:**

| Failure | Fix |
| ------- | --- |
| swift-tools-version drift | Update `experimental.ios.spm.swiftToolsVersion` in `capacitor.config.ts`, then run `npm run sync:ios` |
| Stale Package.resolved | Delete `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` and re-run `swift package resolve` |
| Build target mismatch | Update all `IPHONEOS_DEPLOYMENT_TARGET` entries in `project.pbxproj` to match `Package.swift` |

Report what was found and fixed, then proceed with the actual task.

---

## Capacitor iOS Build

The app ships as both a PWA and a native iOS app via Capacitor 8.

**Key differences in iOS builds:**

- `VITE_IOS_BUILD=true` disables the Vite PWA service worker and hides auth/sync UI (UserMenu, AuthDialog, SyncStatus, InstallPrompt, UpdateNotification)
- Routing uses `HashRouter` (required — Capacitor loads from filesystem, not a server)
- CSP includes `capacitor://localhost` for WKWebView asset loading
- Data storage is localStorage-only (no Supabase keys in `.env.ios`)

**iOS npm scripts:**

```bash
npm run build:ios      # vite build --mode ios (outputs to dist/)
npm run sync:ios       # build:ios + npx cap sync ios (copies dist/ into ios/ project)
```

**Working with the Xcode project:**

When working on iOS/Capacitor projects, remember that `cap sync` overwrites Package.swift. Always apply iOS build config changes in capacitor.config.ts, not directly in Xcode project files.

- `ios/App/App/public` is gitignored — it is regenerated by `cap sync ios`
- Open `ios/App/App.xcodeproj/project.xcworkspace` in Xcode (or run `npm run open:ios`)
- Bundle ID: `com.adamjolicoeur.timetrackerpro`
- Minimum iOS version: 26 (enforced via Package.swift SPM)

**When adding new features:**

- Gate any web-only UI (PWA install, auth, sync) behind `import.meta.env.VITE_IOS_BUILD !== "true"`
- Avoid `window.location.reload()` in iOS paths — use `window.location.replace()` to avoid interrupting the Capacitor JS bridge
- Test localStorage-only flow (no Supabase) before marking iOS features complete

---

## Pre-Commit Checklist

1. `npm run lint` — fix all errors
2. `npm run build` — ensure no type errors
3. Test changed functionality manually
4. Verify tabs (not spaces) and double quotes throughout

---

## Agent Sub-Documents

Read these files proactively based on what you're working on:

| When you're working on...                                       | Read this file            |
| --------------------------------------------------------------- | ------------------------- |
| Architecture, data flow, auth flow, contexts, DataService       | `agents/architecture.md`  |
| Naming conventions, TypeScript patterns, UI/styling rules       | `agents/conventions.md`   |
| Dev setup, npm commands, git workflow, Supabase                 | `agents/workflow.md`      |
| Adding components, pages, context methods, data service methods | `agents/operations.md`    |
| Testing, QA checklists, code quality requirements               | `agents/testing.md`       |
| Debugging, common mistakes, architecture gotchas, Gemini errors | `agents/pitfalls.md`      |
| UI/styling rules and Radix component usage                      | `agents/styles.md`        |
| Pull request guidelines                                         | `agents/pull_requests.md` |

---

**Note**: When in doubt, follow existing patterns and ask clarifying questions rather than making assumptions.
