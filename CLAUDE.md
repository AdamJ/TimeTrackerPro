# CLAUDE.md - AI Assistant Codebase Guide

**Last Updated:** 2026-03-09
**Version:** 2.0.0

TimeTracker Pro is a React 18 + TypeScript time tracking PWA for freelancers and consultants, with dual storage (localStorage guest mode and optional Supabase cloud sync).

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
