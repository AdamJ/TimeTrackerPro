# Common Operations — TimeTracker Pro

## Adding a New Feature Component

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

---

## Adding a New Page

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

// 2. Add route in App.tsx with lazy loading
import { lazy } from "react";
const MyPage = lazy(() => import("./pages/MyPage"));

// In Routes:
<Route path="/mypage" element={<MyPage />} />

// 3. Add navigation link in Navigation.tsx
```

---

## Using the TimePicker Component

The `TimePicker` is a native HTML5 time input wrapped with shadcn/ui styling.

**Component File**: `src/components/ui/scroll-time-picker.tsx`

**Props Interface**:

```typescript
interface TimePickerProps {
  value: string; // "HH:MM" 24-hour format (e.g., "14:30")
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}
```

**Usage Example**:

```typescript
import { TimePicker } from "@/components/ui/scroll-time-picker";
import { Label } from "@/components/ui/label";
import { useState } from "react";

const MyComponent = () => {
  const [time, setTime] = useState("09:00");

  return (
    <div>
      <Label htmlFor="my-time">Select Time</Label>
      <TimePicker
        id="my-time"
        value={time}
        onValueChange={setTime}
        aria-label="Select your preferred time"
      />
    </div>
  );
};
```

**Key Details**:

- 15-minute intervals via `step={900}` (`:00`, `:15`, `:30`, `:45`)
- Mobile browsers show native time pickers automatically
- Used in: `StartDayDialog.tsx`, `TaskEditDialog.tsx`, `ArchiveEditDialog.tsx`

---

## Adding a New Context Method

```typescript
// 1. Define in interface (TimeTrackingContext.tsx)
interface TimeTrackingContextType {
  // ... existing methods
  myNewMethod: (param: string) => void;
}

// 2. Implement in provider
const myNewMethod = (param: string) => {
  // Implementation
};

// 3. Export in value object
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

---

## Adding a Data Service Method

```typescript
// 1. Add to interface (dataService.ts)
export interface DataService {
  // ... existing methods
  myDataOperation: (data: MyData) => Promise<void>;
}

// 2. Implement in LocalStorageService
class LocalStorageService implements DataService {
  async myDataOperation(data: MyData): Promise<void> {
    localStorage.setItem('my_key', JSON.stringify(data));
  }
}

// 3. Implement in SupabaseService
class SupabaseService implements DataService {
  async myDataOperation(data: MyData): Promise<void> {
    const user = await getCachedUser();
    await supabase.from('my_table').insert(data);
  }
}
```

---

## Modifying Database Schema

```typescript
// 1. Create Supabase migration
// supabase/migrations/YYYYMMDD_description.sql
ALTER TABLE tasks ADD COLUMN new_field TEXT;

// 2. Update TypeScript types (TimeTrackingContext.tsx)
export interface Task {
  // ... existing fields
  newField?: string;
}

// 3. Update dataService.ts to save/load new field
const taskData = {
  // ... existing fields
  new_field: task.newField,
};
```

---

## AI Task Checklists

### Add a new task property

1. Update `Task` interface in `src/contexts/TimeTrackingContext.tsx`
2. Update task creation in `startNewTask()`
3. Update database schema if using Supabase
4. Update `src/services/dataService.ts` to save/load new property
5. Update UI components to display/edit property
6. Test in both guest and authenticated modes

### Add a new page

1. Create page component in `src/pages/`
2. Add route in `App.tsx` with lazy loading
3. Add navigation link in `Navigation.tsx`
4. Follow existing page layout patterns
5. Test routing and navigation

### Fix a bug

1. **Reproduce**: Understand the bug completely
2. **Locate**: Find the relevant code
3. **Fix**: Make minimal changes
4. **Test**: Verify fix in both guest and authenticated modes
5. **Document**: Add comments if logic is complex

### Add export/import functionality

1. Study existing `exportToCSV()` and `importFromCSV()`
2. Follow the exact CSV schema format
3. Handle errors gracefully
4. Validate data before import
5. Test with sample data files in `tests/` directory
