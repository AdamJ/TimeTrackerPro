# Conventions — TimeTracker Pro

## Code Style (CRITICAL)

⚠️ **These rules MUST be followed — they are project requirements enforced by the linter.**

### Indentation & Quotes

- **Tabs, not spaces** — Always use tabs
- **Tab width**: 2 spaces
- **Quotes**: Always double quotes (`""`) — never single quotes (`''`)

### Component Patterns

```typescript
// ✅ CORRECT
export const MyComponent = () => {
  return (
    <div className="container">
      <p>Hello World</p>
    </div>
  );
};

// ❌ WRONG — Uses spaces and single quotes
export const MyComponent = () => {
  return (
    <div className='container'>
      <p>Hello World</p>
    </div>
  );
};
```

### File Naming

- **Components**: PascalCase (e.g., `TaskItem.tsx`, `NewTaskForm.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.tsx`)
- **Utilities**: camelCase (e.g., `timeUtil.ts`)
- **Config**: camelCase (e.g., `categories.ts`)

### Import Aliases

```typescript
// ✅ CORRECT — Use @ alias for src imports
import { Task } from '@/contexts/TimeTrackingContext';
import { Button } from '@/components/ui/button';

// ❌ WRONG — Never use relative paths
import { Task } from '../../contexts/TimeTrackingContext';
```

---

## UI & Styling Conventions

### Design System

- **Follow Radix UI guidelines**: [https://www.radix-ui.com](https://www.radix-ui.com)
- **Use Radix Colors**: [https://www.radix-ui.com/colors](https://www.radix-ui.com/colors)
- **Avoid custom colors** — Use theme variables instead

### Icons

1. **Primary**: Radix Icons — [https://www.radix-ui.com/icons](https://www.radix-ui.com/icons)
2. **Fallback**: Lucide — [https://lucide.dev](https://lucide.dev)

### Spacing & Typography

- **Follow Radix spacing**: [https://www.radix-ui.com/themes/docs/theme/spacing](https://www.radix-ui.com/themes/docs/theme/spacing)
- **Follow Radix typography**: [https://www.radix-ui.com/themes/docs/theme/typography](https://www.radix-ui.com/themes/docs/theme/typography)
- **Don't use custom spacing or font sizes** — Use theme values

### Component Usage

```typescript
// ✅ CORRECT — Using shadcn/ui components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

<Button variant="default">Save</Button>

// ❌ WRONG — Creating custom button styles
<button className="bg-blue-500 px-4 py-2">Save</button>
```

---

## TypeScript Conventions

### Type Definitions

```typescript
// Main types defined in contexts
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

### Loose Type Checking

- `noImplicitAny: false` — Allows implicit any
- `strictNullChecks: false` — Allows null/undefined without explicit checks
- Use types where helpful, but not strictly enforced

---

## Naming Conventions

### Functions

- **Actions**: `startDay()`, `endDay()`, `startNewTask()`
- **Getters**: `getTotalDayDuration()`, `getCurrentTaskDuration()`
- **Setters**: `setIsDayStarted()`, `setTasks()`
- **Handlers**: `handleClick()`, `handleSubmit()`

### State Variables

- **Boolean**: `isDayStarted`, `isAuthenticated`, `loading`, `isSyncing`
- **Collections**: `tasks`, `projects`, `categories`, `archivedDays`
- **Single items**: `currentTask`, `user`, `dataService`

### Constants

- **UPPER_SNAKE_CASE**: `STORAGE_KEYS`, `DEFAULT_CATEGORIES`
