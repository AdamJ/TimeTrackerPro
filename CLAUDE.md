# CLAUDE.md - AI Assistant Codebase Guide

**Last Updated:** 2025-11-21
**Version:** 1.0.1

This document provides comprehensive guidance for AI assistants working with the TimeTracker Pro codebase. It covers architecture, conventions, workflows, and best practices.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [File Organization](#file-organization)
5. [Data Flow & State Management](#data-flow--state-management)
6. [Key Conventions](#key-conventions)
7. [Development Workflow](#development-workflow)
8. [Common Operations](#common-operations)
9. [Testing & Quality](#testing--quality)
10. [Pitfalls & Gotchas](#pitfalls--gotchas)
11. [AI-Specific Guidance](#ai-specific-guidance)

---

## Project Overview

### What is TimeTracker Pro?

TimeTracker Pro is a modern time tracking application built for freelancers, consultants, and professionals. It enables users to:

- Track work hours by task, project, and client
- Manage billable and non-billable time
- Generate invoices and export data
- Sync data across devices (optional cloud sync)
- Work offline with local storage

### Key Features

- **Dual Storage Mode**: Works with or without authentication
  - **Guest Mode**: localStorage only, no account needed
  - **Authenticated Mode**: Supabase cloud sync across devices
- **Time Tracking**: Start/stop day, create tasks, automatic duration calculation
- **Project Management**: Hourly rates, client assignments, billable/non-billable flags
- **Category System**: Organize tasks with custom categories
- **Archive System**: Permanent record of completed work days
- **Export/Import**: CSV and JSON formats, database-compatible schema
- **Revenue Tracking**: Automatic calculation based on hourly rates
- **Responsive Design**: Works on desktop and mobile

### Project Origin

Originally created via Lovable.dev prompts, now actively maintained. See `info/README-LOVABLE.md` for history.

---

## Technology Stack

### Core Technologies

- **React 18** - UI framework with TypeScript
- **TypeScript 5.8** - Type safety and developer experience
- **Vite 5** - Build tool and dev server
- **React Router 6** - Client-side routing

### UI & Styling

- **Tailwind CSS 3** - Utility-first CSS framework
- **Radix UI** - Accessible, unstyled component primitives
- **shadcn/ui** - Pre-built component library built on Radix
- **Lucide React** - Icon library (primary)
- **Radix Icons** - Icon library (fallback)
- **next-themes** - Dark mode support

### Data & Backend

- **Supabase** - Backend as a Service (optional)
  - PostgreSQL database
  - Authentication (email/password)
  - Real-time capabilities (currently disabled for single-device usage)
- **localStorage** - Browser storage for offline/guest mode

### State Management

- **React Context API** - Global state management
- **Custom Hooks** - Reusable stateful logic
  - `useAuth` - Authentication state
  - `useTimeTracking` - Time tracking operations
  - `useRealtimeSync` - Database sync (currently disabled)

### Forms & Validation

- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **@hookform/resolvers** - Form resolver integration

### Progressive Web App (PWA)

- **Vite PWA Plugin** - Service worker and manifest generation
- **Workbox** - Service worker caching strategies
- **Service Worker** - Offline support and caching
- **Web App Manifest** - App metadata and icons

### Build & Development

- **Vite + SWC** - Fast builds and hot module replacement
- **ESLint 9** - Code quality and style checking
- **Vitest** - Unit testing framework
- **@testing-library/react** - Component testing utilities
- **Playwright** - Automated screenshot generation and E2E testing

---

## Architecture Patterns

### Overall Architecture

TimeTracker Pro follows a **context-driven architecture** with **service-oriented data layer**:

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                             │
│  ┌────────────────────────────────────────────────────┐ │
│  │           AuthProvider (Context)                   │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │     TimeTrackingProvider (Context)           │ │ │
│  │  │                                              │ │ │
│  │  │  ┌────────────────────────────────────────┐ │ │ │
│  │  │  │         Pages & Components              │ │ │ │
│  │  │  └────────────────────────────────────────┘ │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   DataService Layer   │
              │  (Factory Pattern)    │
              └───────────────────────┘
                    │           │
        ┌───────────┘           └───────────┐
        ▼                                   ▼
┌──────────────────┐            ┌──────────────────┐
│ LocalStorage     │            │ Supabase         │
│ Service          │            │ Service          │
└──────────────────┘            └──────────────────┘
```

### Key Patterns

#### 1. Context Provider Pattern

All global state is managed through React Context:
- `AuthContext` - User authentication and session
- `TimeTrackingContext` - All time tracking operations

#### 2. Service Layer Pattern

Data persistence is abstracted through the `DataService` interface:
- **Interface**: `DataService` defines all data operations
- **Implementations**:
  - `LocalStorageService` - For guest/offline mode
  - `SupabaseService` - For authenticated/cloud mode
- **Factory**: `createDataService(isAuthenticated)` returns appropriate implementation

#### 3. Custom Hook Pattern

Complex logic is extracted into custom hooks:
- `useAuth()` - Access authentication state and methods
- `useTimeTracking()` - Access time tracking state and methods
- `useRealtimeSync()` - Real-time sync (currently disabled)

#### 4. Lazy Loading Pattern

Pages are lazy-loaded for code splitting:
```typescript
const Index = lazy(() => import('./pages/Index'));
```

#### 5. Optimistic UI Updates

UI updates immediately, then syncs to backend:
```typescript
setTasks(prev => [...prev, newTask]); // Update UI
await dataService.saveCurrentDay(state); // Sync to backend
```

---

## File Organization

### Directory Structure

```
TimeTrackerPro/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui base components (49 files)
│   │   ├── ArchiveEditDialog.tsx    # Archive entry editing
│   │   ├── ArchiveItem.tsx          # Archive display component
│   │   ├── AuthDialog.tsx           # Authentication modal
│   │   ├── CategoryManagement.tsx   # Category management UI
│   │   ├── DaySummary.tsx           # Day summary display
│   │   ├── DeleteConfirmationDialog.tsx  # Deletion confirmations
│   │   ├── ExportDialog.tsx         # Export functionality UI
│   │   ├── InstallPrompt.tsx        # PWA install prompt
│   │   ├── MobileNav.tsx            # Mobile bottom navigation (PWA)
│   │   ├── Navigation.tsx           # App navigation
│   │   ├── NewTaskForm.tsx          # Task creation form
│   │   ├── ProjectManagement.tsx    # Project management UI
│   │   ├── SyncStatus.tsx           # Sync status indicator
│   │   ├── TaskEditDialog.tsx       # Task editing dialog
│   │   ├── TaskItem.tsx             # Task display component
│   │   ├── UpdateNotification.tsx   # PWA update notification
│   │   └── UserMenu.tsx             # User menu dropdown
│   ├── config/             # Configuration files
│   │   ├── categories.ts   # Default task categories
│   │   └── projects.ts     # Default projects
│   ├── contexts/           # React Context providers
│   │   ├── AuthContext.tsx           # Authentication
│   │   ├── OfflineContext.tsx        # Offline queue (PWA)
│   │   └── TimeTrackingContext.tsx   # Time tracking
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.tsx              # Auth hook
│   │   ├── useOffline.tsx           # Offline state hook (PWA)
│   │   ├── useTimeTracking.tsx      # Time tracking hook
│   │   ├── use-toast.tsx            # Toast notifications
│   │   └── useRealtimeSync.ts       # Database sync
│   ├── lib/                # Utility libraries
│   │   ├── supabase.ts     # Supabase client & helpers
│   │   └── util.ts         # Utility functions
│   ├── pages/              # Page components
│   │   ├── Index.tsx       # Home/time tracker
│   │   ├── Archive.tsx     # Archived days
│   │   ├── ProjectList.tsx # Project management
│   │   ├── Categories.tsx  # Category management
│   │   ├── Settings.tsx    # App settings
│   │   └── NotFound.tsx    # 404 page
│   ├── services/           # Business logic services
│   │   └── dataService.ts  # Data persistence layer
│   ├── utils/              # Utility functions
│   │   ├── timeUtil.ts     # Time formatting helpers
│   │   └── supabase.ts     # Supabase utilities
│   ├── App.tsx             # Root component
│   ├── main.tsx            # Application entry point
│   └── vite-env.d.ts       # Vite type definitions
├── public/                 # Static assets
│   ├── icons/              # PWA app icons (8 sizes: 72-512px)
│   ├── screenshots/        # PWA screenshots (desktop + mobile)
│   ├── manifest.json       # PWA web app manifest
│   ├── pwa.css            # PWA-specific styles
│   └── ...                # Other static assets
├── docs/                   # Documentation
│   ├── ARCHIVING_DAYS.md           # Archive system guide
│   ├── AUTHENTICATION.md           # Auth setup and flow
│   ├── AUTH_DATA_PERSISTENCE_FIX.md  # Auth data fix history
│   ├── CSV_TEMPLATES_README.md     # CSV import/export templates
│   ├── FEATURES.md                 # Feature documentation
│   ├── MIGRATION.md                # Data migration guide
│   ├── SCHEMA_COMPATIBILITY.md     # Database schema history
│   ├── SECURITY.md                 # Security guidelines
│   └── chatbot.md                  # Chatbot integration info
├── agents/                 # AI agent guidelines
│   ├── styles.md          # Style rules
│   └── pull_requests.md   # PR guidelines
├── tests/                  # Test scripts
├── supabase/              # Supabase schema & migrations
├── .env.example           # Environment template
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind configuration
├── AGENTS.md              # Agent instructions
├── README.md              # Project documentation
└── CLAUDE.md              # This file
```

### Key Files to Know

| File | Purpose |
|------|---------|
| `src/contexts/TimeTrackingContext.tsx` | Main application state and logic (1400+ lines) |
| `src/services/dataService.ts` | Data persistence abstraction layer (1100+ lines) |
| `src/contexts/AuthContext.tsx` | Authentication state management |
| `src/lib/supabase.ts` | Supabase client configuration and caching |
| `src/config/categories.ts` | Default category definitions |
| `src/config/projects.ts` | Default project definitions |

---

## Data Flow & State Management

### Authentication Flow

```
1. User opens app
   ↓
2. AuthProvider checks for existing session
   ↓
3. If authenticated → Load from Supabase
   If guest → Load from localStorage
   ↓
4. AuthContext provides: { user, isAuthenticated, loading, signIn, signUp, signOut }
```

### Time Tracking Flow

```
1. User starts day
   ↓
2. TimeTrackingContext updates state
   ↓
3. User creates tasks
   ↓
4. Tasks saved to state (in-memory)
   ↓
5. Manual sync OR critical events (end day, window close)
   ↓
6. DataService persists to localStorage or Supabase
```

### Data Service Selection

```typescript
// Factory pattern selects service based on auth state
const service = createDataService(isAuthenticated);
// Returns: LocalStorageService OR SupabaseService
```

### State Management Strategy

**Current Design: Manual Sync (Single-Device Optimized)**

- **No automatic saves** - Saves only on critical events
- **Critical save events**:
  1. Day end (`postDay()`)
  2. Window close (`beforeunload`)
  3. Manual sync button (`forceSyncToDatabase()`)
- **Why?** Optimized for single-device usage, reduces unnecessary database calls
- **Trade-off**: Users must manually sync or complete critical events

### Data Migration

**localStorage ↔ Supabase**

- **Login**: Migrates localStorage data to Supabase (smart merge)
- **Logout**: Syncs Supabase data to localStorage for offline access
- **Logic**: Compares data freshness, prevents overwriting newer data

---

## Key Conventions

### Code Style (CRITICAL)

⚠️ **These rules MUST be followed - they are project requirements**

#### Indentation & Quotes
- **Tabs, not spaces** - Always use tabs
- **Tab width**: 2 spaces
- **Quotes**: Always double quotes (`""`) never single quotes (`''`)

#### Component Patterns
```typescript
// ✅ CORRECT
export const MyComponent = () => {
	return (
		<div className="container">
			<p>Hello World</p>
		</div>
	);
};

// ❌ WRONG - Uses spaces and single quotes
export const MyComponent = () => {
  return (
    <div className='container'>
      <p>Hello World</p>
    </div>
  );
};
```

#### File Naming
- **Components**: PascalCase (e.g., `TaskItem.tsx`, `NewTaskForm.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.tsx`)
- **Utilities**: camelCase (e.g., `timeUtil.ts`)
- **Config**: camelCase (e.g., `categories.ts`)

#### Import Aliases
```typescript
// Use @ alias for src imports
import { Task } from "@/contexts/TimeTrackingContext";
import { Button } from "@/components/ui/button";

// Not relative imports like ../../
```

### UI & Styling Conventions

#### Design System
- **Follow Radix UI guidelines**: [https://www.radix-ui.com](https://www.radix-ui.com)
- **Use Radix Colors**: [https://www.radix-ui.com/colors](https://www.radix-ui.com/colors)
- **Avoid custom colors** - Use theme variables instead

#### Icons
1. **Primary**: Radix Icons - [https://www.radix-ui.com/icons](https://www.radix-ui.com/icons)
2. **Fallback**: Lucide - [https://lucide.dev](https://lucide.dev)

#### Spacing & Typography
- **Follow Radix spacing**: [https://www.radix-ui.com/themes/docs/theme/spacing](https://www.radix-ui.com/themes/docs/theme/spacing)
- **Follow Radix typography**: [https://www.radix-ui.com/themes/docs/theme/typography](https://www.radix-ui.com/themes/docs/theme/typography)
- **Don't use custom spacing or font sizes** - Use theme values

#### Component Usage
```typescript
// ✅ CORRECT - Using shadcn/ui components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

<Button variant="default">Save</Button>

// ❌ WRONG - Creating custom button styles
<button className="bg-blue-500 px-4 py-2">Save</button>
```

### TypeScript Conventions

#### Type Definitions
```typescript
// Main types in contexts
export interface Task {
	id: string;
	title: string;
	description?: string; // Optional fields use ?
	startTime: Date;
	endTime?: Date;
	duration?: number;
	project?: string;
	client?: string;
	category?: string;
}

// Use Partial<> for updates
updateTask: (taskId: string, updates: Partial<Task>) => void;
```

#### Loose Type Checking
- `noImplicitAny: false` - Allows implicit any
- `strictNullChecks: false` - Allows null/undefined without explicit checks
- Use types where helpful, but not strictly enforced

### Naming Conventions

#### Functions
- **Actions**: `startDay()`, `endDay()`, `startNewTask()`
- **Getters**: `getTotalDayDuration()`, `getCurrentTaskDuration()`
- **Setters**: `setIsDayStarted()`, `setTasks()`
- **Handlers**: `handleClick()`, `handleSubmit()`

#### State Variables
- **Boolean**: `isDayStarted`, `isAuthenticated`, `loading`, `isSyncing`
- **Collections**: `tasks`, `projects`, `categories`, `archivedDays`
- **Single items**: `currentTask`, `user`, `dataService`

#### Constants
- **UPPER_SNAKE_CASE**: `STORAGE_KEYS`, `DEFAULT_CATEGORIES`

---

## Development Workflow

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd TimeTrackerPro

# Install dependencies
npm install

# Setup environment (optional - for cloud sync)
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
# Opens on http://localhost:8080
```

### Available Commands

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
1. `npm run screenshots:install` - Install Playwright browsers (~300MB, one-time)
2. `npm run dev` - Start dev server (keep running)
3. `npm run screenshots` - Generate screenshots in new terminal
4. Screenshots saved to `public/screenshots/`

See `tests/SCREENSHOTS_README.md` for detailed documentation.

### Pre-Commit Checklist

✅ **Before committing code:**
1. Run `npm run lint` - Fix all errors
2. Run `npm run build` - Ensure no type errors
3. Test functionality manually
4. Verify tabs (not spaces) and double quotes
5. Follow PR guidelines from `agents/pull_requests.md`

### Git Workflow

#### Branch Naming
- Feature branches: `claude/claude-md-<session-id>-<feature>`
- Always work on designated branch from session instructions

#### Commit Messages
```bash
# Good commit messages
git commit -m "feat: add billable category option"
git commit -m "fix: data recovery issues"
git commit -m "refactor: improve data service caching"

# Format: <type>: <description>
# Types: feat, fix, refactor, docs, style, test, chore
```

#### Creating Pull Requests
1. **Title Format**: `[TimeTrackerPro] <Descriptive Title>`
2. **Description**: Clear explanation of changes
3. **Wait for checks**: Don't merge until all tests pass
4. **Add labels**: Appropriate PR labels
5. **See**: `agents/pull_requests.md` for full guidelines

### Working with Supabase

#### Environment Setup
```bash
# .env file (never commit this!)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Database Schema Location
- Schema definitions: `supabase/migrations/`
- See `docs/SCHEMA_COMPATIBILITY.md` for schema history

---

## Common Operations

### Adding a New Feature Component

```typescript
// 1. Create component file
// src/components/MyFeature.tsx

import { useState } from "react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Button } from "@/components/ui/button";

export const MyFeature = () => {
	const { tasks, addTask } = useTimeTracking();
	const [value, setValue] = useState("");

	return (
		<div className="space-y-4">
			{/* Component content */}
		</div>
	);
};

// 2. Import in page
// src/pages/Index.tsx
import { MyFeature } from "@/components/MyFeature";
```

### Adding a New Page

```typescript
// 1. Create page component
// src/pages/MyPage.tsx
import { Navigation } from "@/components/Navigation";

const MyPage = () => {
	return (
		<div className="min-h-screen bg-background">
			<Navigation />
			<main className="container mx-auto p-4">
				{/* Page content */}
			</main>
		</div>
	);
};

export default MyPage;

// 2. Add route in App.tsx
import { lazy } from "react";
const MyPage = lazy(() => import("./pages/MyPage"));

// In Routes:
<Route path="/mypage" element={<MyPage />} />
```

### Adding a New Context Method

```typescript
// 1. Define in interface (TimeTrackingContext.tsx)
interface TimeTrackingContextType {
	// ... existing methods
	myNewMethod: (param: string) => void;
}

// 2. Implement in provider
const myNewMethod = (param: string) => {
	// Implementation
	console.log("Method called with:", param);
};

// 3. Export in value
return (
	<TimeTrackingContext.Provider
		value={{
			// ... existing values
			myNewMethod,
		}}
	>
		{children}
	</TimeTrackingContext.Provider>
);

// 4. Use in components
const { myNewMethod } = useTimeTracking();
myNewMethod("test");
```

### Adding a Data Service Method

```typescript
// 1. Add to interface (dataService.ts)
export interface DataService {
	// ... existing methods
	myDataOperation: (data: MyData) => Promise<void>;
}

// 2. Implement in LocalStorageService
class LocalStorageService implements DataService {
	async myDataOperation(data: MyData): Promise<void> {
		localStorage.setItem("my_key", JSON.stringify(data));
	}
}

// 3. Implement in SupabaseService
class SupabaseService implements DataService {
	async myDataOperation(data: MyData): Promise<void> {
		const user = await getCachedUser();
		await supabase.from("my_table").insert(data);
	}
}
```

### Modifying Database Schema

```typescript
// 1. Update Supabase migration
// supabase/migrations/YYYYMMDD_description.sql

ALTER TABLE tasks ADD COLUMN new_field TEXT;

// 2. Update TypeScript types
// src/contexts/TimeTrackingContext.tsx

export interface Task {
	// ... existing fields
	newField?: string;
}

// 3. Update data service to handle new field
// src/services/dataService.ts

const taskData = {
	// ... existing fields
	new_field: task.newField,
};
```

---

## Testing & Quality

### Running Tests

```bash
# Unit tests
npm run test

# Linting
npm run lint

# Type checking
npm run build
```

### Manual Testing Checklist

**Before submitting changes:**

- [ ] Test in guest mode (no authentication)
- [ ] Test in authenticated mode
- [ ] Test on mobile viewport
- [ ] Test data persistence (refresh page)
- [ ] Test export/import functionality
- [ ] Verify no console errors
- [ ] Check responsive design

**PWA-Specific Testing:**

- [ ] Service worker registers successfully (DevTools → Application → Service Workers)
- [ ] App works offline (DevTools → Network → Offline)
- [ ] Install prompt appears (wait 30 seconds or test manually)
- [ ] App installs correctly on desktop (Chrome/Edge)
- [ ] Bottom navigation visible on mobile viewports
- [ ] Touch targets are large enough (44×44px minimum)
- [ ] Manifest loads without errors (DevTools → Application → Manifest)
- [ ] Update notification works when service worker updates

### Code Quality Requirements

1. **All lint errors must be fixed** before committing
2. **All TypeScript errors must be fixed** before merging
3. **Manual testing** of changed functionality required
4. **No breaking changes** without documentation

---

## Pitfalls & Gotchas

### Common Mistakes

#### 1. Using Spaces Instead of Tabs
```typescript
// ❌ WRONG
export const Component = () => {
  return <div>Content</div>; // Uses spaces
};

// ✅ CORRECT
export const Component = () => {
	return <div>Content</div>; // Uses tabs
};
```

#### 2. Using Single Quotes
```typescript
// ❌ WRONG
const message = 'Hello World';

// ✅ CORRECT
const message = "Hello World";
```

#### 3. Not Using @ Alias
```typescript
// ❌ WRONG
import { Task } from "../../contexts/TimeTrackingContext";

// ✅ CORRECT
import { Task } from "@/contexts/TimeTrackingContext";
```

#### 4. Creating Custom Colors
```typescript
// ❌ WRONG
<div className="bg-blue-500 text-white">Content</div>

// ✅ CORRECT
<div className="bg-primary text-primary-foreground">Content</div>
```

#### 5. Forgetting to Save Data
```typescript
// ❌ WRONG - Data not persisted
setTasks([...tasks, newTask]);

// ✅ CORRECT - Explicitly save
setTasks([...tasks, newTask]);
await forceSyncToDatabase(); // Or wait for critical event
```

### Architecture Gotchas

#### 1. Manual Sync Required
- **Issue**: Data doesn't auto-save every change
- **Solution**: Use `forceSyncToDatabase()` or trigger critical events
- **Why**: Optimized for single-device usage

#### 2. Category Lookup by ID
```typescript
// ❌ WRONG - Looking up by name
const category = categories.find(c => c.name === task.category);

// ✅ CORRECT - Looking up by ID
const category = categories.find(c => c.id === task.category);
```

#### 3. Date Handling
```typescript
// ❌ WRONG - Date as string
const startTime = "2024-11-18";

// ✅ CORRECT - Date object
const startTime = new Date("2024-11-18");
```

#### 4. Supabase User Caching
```typescript
// ❌ WRONG - Repeated auth calls (slow)
const { data: { user } } = await supabase.auth.getUser();

// ✅ CORRECT - Use cached user
const user = await getCachedUser();
```

### Performance Gotchas

#### 1. Avoiding Unnecessary Re-renders
- Use `useCallback` for stable function references
- Use `useRef` for values that don't need re-renders
- Context updates trigger all consumers

#### 2. Lazy Loading
- Pages are lazy-loaded - don't preload unnecessarily
- Use `<Suspense>` with fallback for lazy components

---

## AI-Specific Guidance

### When Working on This Codebase

#### 1. Always Read First
Before making changes:
- Read the relevant context file (`TimeTrackingContext.tsx` or `AuthContext.tsx`)
- Read the data service implementation (`dataService.ts`)
- Check existing patterns in similar components

#### 2. Follow Existing Patterns
- **Don't reinvent**: Use existing patterns for new features
- **Don't refactor**: Unless explicitly asked or fixing bugs
- **Don't optimize**: Unless there's a performance problem

#### 3. Respect the Style Guide
- Tabs (2 spaces width), double quotes - NON-NEGOTIABLE
- Use Radix UI components and styling
- Follow existing naming conventions

#### 4. Test Your Changes
Before claiming completion:
```bash
npm run lint    # Must pass
npm run build   # Must pass
# Manual testing required
```

#### 5. Understand Data Flow
```
User Action
  ↓
Context Method
  ↓
State Update (in-memory)
  ↓
(Optional) DataService Call
  ↓
localStorage or Supabase
```

### Common AI Assistant Tasks

#### Task: Add a new task property
1. Update `Task` interface in `TimeTrackingContext.tsx`
2. Update task creation in `startNewTask()`
3. Update database schema if using Supabase
4. Update `dataService.ts` to save/load new property
5. Update UI components to display/edit property
6. Test in both guest and authenticated modes

#### Task: Add a new page
1. Create page component in `src/pages/`
2. Add route in `App.tsx` with lazy loading
3. Add navigation link in `Navigation.tsx`
4. Follow existing page layout patterns
5. Test routing and navigation

#### Task: Fix a bug
1. **Reproduce**: Understand the bug completely
2. **Locate**: Find the relevant code
3. **Fix**: Make minimal changes to fix the issue
4. **Test**: Verify fix in all modes (guest + authenticated)
5. **Document**: Add comments if logic is complex

#### Task: Add export/import functionality
1. Study existing `exportToCSV()` and `importFromCSV()`
2. Follow the exact CSV schema format
3. Handle errors gracefully
4. Validate data before import
5. Test with sample data files in `tests/` directory

### Questions to Ask Yourself

Before making changes, verify:

- [ ] Does this follow the tab/double-quote convention?
- [ ] Am I using @ import aliases?
- [ ] Am I using existing UI components (not creating custom)?
- [ ] Have I checked how similar features are implemented?
- [ ] Will this work in both guest and authenticated modes?
- [ ] Do I need to update the data service for persistence?
- [ ] Have I tested the change manually?
- [ ] Will `npm run lint` and `npm run build` pass?

---

## Additional Resources

### Documentation

- **Main README**: `README.md` - User-facing documentation
- **CLAUDE.md**: `CLAUDE.md` - This file - AI assistant guide
- **Agent Guidelines**: `AGENTS.md` - Quick agent instructions
- **Archive System**: `docs/ARCHIVING_DAYS.md` - Archive system guide
- **Authentication**: `docs/AUTHENTICATION.md` - Auth setup and flow
- **Auth Data Fix**: `docs/AUTH_DATA_PERSISTENCE_FIX.md` - Auth data fix history
- **CSV Templates**: `docs/CSV_TEMPLATES_README.md` - CSV import/export templates
- **Features**: `docs/FEATURES.md` - Feature documentation
- **Migration**: `docs/MIGRATION.md` - Data migration guide
- **Schema**: `docs/SCHEMA_COMPATIBILITY.md` - Database schema history
- **Security**: `docs/SECURITY.md` - Security guidelines
- **Chatbot**: `docs/chatbot.md` - Chatbot integration info
- **Agent Styles**: `agents/styles.md` - UI/UX guidelines
- **Pull Requests**: `agents/pull_requests.md` - PR guidelines

### External References

- **Radix UI**: [https://www.radix-ui.com](https://www.radix-ui.com)
- **shadcn/ui**: [https://ui.shadcn.com](https://ui.shadcn.com)
- **Tailwind CSS**: [https://tailwindcss.com](https://tailwindcss.com)
- **React Router**: [https://reactrouter.com](https://reactrouter.com)
- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Vite**: [https://vitejs.dev](https://vitejs.dev)

### Getting Help

- **Issues**: Report bugs or request features via GitHub Issues
- **Documentation**: Check `docs/` folder for detailed guides
- **Code Examples**: Look at existing components for patterns

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.1 | 2025-11-21 | Updated component list, documentation references, and current state |
| 1.0.0 | 2025-11-18 | Initial CLAUDE.md creation |

---

**Note to AI Assistants**: This document should be your first reference when working on TimeTracker Pro. When in doubt, follow existing patterns and ask clarifying questions rather than making assumptions.
