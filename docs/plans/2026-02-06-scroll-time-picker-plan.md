# Scroll Time Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all time-selection Select dropdowns with a scroll-wheel time picker (hour/minute/period columns) for better UX.

**Architecture:** A single reusable `ScrollTimePicker` component in `src/components/ui/scroll-time-picker.tsx` with the same `value`/`onValueChange` interface as the current Select dropdowns. Three CSS scroll-snap columns (Hour 1-12, Minute 00/15/30/45, Period AM/PM). Drop-in replacement across 3 files (4 dialog components).

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui design tokens

---

## Task 1: Create the ScrollTimePicker component

**Files:**

- Create: `src/components/ui/scroll-time-picker.tsx`

**Step 1: Create the component file**

Create `src/components/ui/scroll-time-picker.tsx` with the following implementation:

```tsx
import React, { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/util';

interface ScrollTimePickerProps {
  value: string; // "HH:MM" 24-hour format
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = [0, 15, 30, 45];
const PERIODS = ['AM', 'PM'] as const;

const ITEM_HEIGHT = 40; // px per item
const VISIBLE_ITEMS = 5; // show 5 items, center is selected

function parse24Hour(value: string): {
  hour12: number;
  minute: number;
  period: 'AM' | 'PM';
} {
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  hour12 = hour12 === 0 ? 12 : hour12;
  // Round minute to nearest 15
  const minute = Math.round(m / 15) * 15 === 60 ? 0 : Math.round(m / 15) * 15;
  return { hour12, minute, period };
}

function to24Hour(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour12;
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

interface WheelColumnProps {
  items: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
  formatItem?: (item: string | number) => string;
}

const WheelColumn: React.FC<WheelColumnProps> = ({
  items,
  selectedIndex,
  onSelect,
  disabled,
  formatItem = String
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Scroll to selected index on mount and when selectedIndex changes externally
  useEffect(() => {
    if (containerRef.current && !isScrollingRef.current) {
      const scrollTop = selectedIndex * ITEM_HEIGHT;
      containerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    isScrollingRef.current = true;

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));

      // Snap to position
      containerRef.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: 'smooth'
      });

      isScrollingRef.current = false;
      if (clampedIndex !== selectedIndex) {
        onSelect(clampedIndex);
      }
    }, 100);
  }, [items.length, selectedIndex, onSelect]);

  const handleItemClick = (index: number) => {
    if (disabled) return;
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: 'smooth'
      });
    }
    onSelect(index);
  };

  const paddingHeight = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT }}
    >
      {/* Selection highlight band */}
      <div
        className="absolute left-0 right-0 border-y border-border bg-accent/50 pointer-events-none z-10"
        style={{
          top: Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT,
          height: ITEM_HEIGHT
        }}
      />
      {/* Fade overlays */}
      <div
        className="absolute top-0 left-0 right-0 bg-gradient-to-b from-background to-transparent pointer-events-none z-20"
        style={{ height: ITEM_HEIGHT * 1.5 }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent pointer-events-none z-20"
        style={{ height: ITEM_HEIGHT * 1.5 }}
      />
      <div
        ref={containerRef}
        className={cn(
          'h-full overflow-y-auto scrollbar-hide',
          disabled && 'opacity-50 pointer-events-none'
        )}
        onScroll={handleScroll}
        style={{
          scrollSnapType: 'y mandatory'
        }}
      >
        {/* Top padding */}
        <div style={{ height: paddingHeight }} />
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className={cn(
              'flex items-center justify-center cursor-pointer transition-colors select-none',
              index === selectedIndex
                ? 'text-foreground font-semibold text-lg'
                : 'text-muted-foreground text-base'
            )}
            style={{
              height: ITEM_HEIGHT,
              scrollSnapAlign: 'start'
            }}
            onClick={() => handleItemClick(index)}
          >
            {formatItem(item)}
          </div>
        ))}
        {/* Bottom padding */}
        <div style={{ height: paddingHeight }} />
      </div>
    </div>
  );
};

export const ScrollTimePicker: React.FC<ScrollTimePickerProps> = ({
  value,
  onValueChange,
  disabled = false,
  className
}) => {
  const { hour12, minute, period } = parse24Hour(value || '09:00');

  const hourIndex = HOURS.indexOf(hour12);
  const minuteIndex = MINUTES.indexOf(minute);
  const periodIndex = PERIODS.indexOf(period);

  const handleHourChange = (index: number) => {
    onValueChange(to24Hour(HOURS[index], minute, period));
  };

  const handleMinuteChange = (index: number) => {
    onValueChange(to24Hour(hour12, MINUTES[index], period));
  };

  const handlePeriodChange = (index: number) => {
    onValueChange(to24Hour(hour12, minute, PERIODS[index]));
  };

  return (
    <div
      className={cn(
        'flex items-center rounded-md border border-input bg-background',
        disabled && 'opacity-50',
        className
      )}
    >
      <WheelColumn
        items={HOURS}
        selectedIndex={hourIndex >= 0 ? hourIndex : 0}
        onSelect={handleHourChange}
        disabled={disabled}
      />
      <div className="text-lg font-semibold text-foreground select-none">:</div>
      <WheelColumn
        items={MINUTES}
        selectedIndex={minuteIndex >= 0 ? minuteIndex : 0}
        onSelect={handleMinuteChange}
        disabled={disabled}
        formatItem={item => String(item).padStart(2, '0')}
      />
      <WheelColumn
        items={[...PERIODS]}
        selectedIndex={periodIndex >= 0 ? periodIndex : 0}
        onSelect={handlePeriodChange}
        disabled={disabled}
      />
    </div>
  );
};
```

**Step 2: Add scrollbar-hide utility**

Check `src/index.css` or Tailwind config for a `.scrollbar-hide` utility. If it doesn't exist, add to `src/index.css`:

```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

**Step 3: Verify the component builds**

Run: `npm run build`
Expected: No TypeScript or build errors

**Step 4: Commit**

```bash
git add src/components/ui/scroll-time-picker.tsx src/index.css
git commit -m "feat: add ScrollTimePicker component with scroll-wheel UI"
```

---

## Task 2: Integrate into StartDayDialog

**Files:**

- Modify: `src/components/StartDayDialog.tsx`

**Step 1: Replace Select with ScrollTimePicker**

In `src/components/StartDayDialog.tsx`:

1. Remove imports: `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
2. Add import: `import { ScrollTimePicker } from "@/components/ui/scroll-time-picker";`
3. Remove: `formatTime12Hour` function (lines 42-50)
4. Remove: `TimeOption` type and `generateTimeOptions` function (lines 52-65)
5. Remove: `const timeOptions = generateTimeOptions();` (line 75)
6. Replace the Select block (lines 122-133) with:

```tsx
<ScrollTimePicker value={selectedTime} onValueChange={setSelectedTime} />
```

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/StartDayDialog.tsx
git commit -m "feat: use ScrollTimePicker in StartDayDialog"
```

---

## Task 3: Integrate into TaskEditDialog

**Files:**

- Modify: `src/components/TaskEditDialog.tsx`

**Step 1: Replace Select time pickers with ScrollTimePicker**

In `src/components/TaskEditDialog.tsx`:

1. Remove Select-related imports (lines 12-18) — only if Select is no longer used (category and project still use Select, so keep them)
2. Add import: `import { ScrollTimePicker } from "@/components/ui/scroll-time-picker";`
3. Remove: `TimeOption` type, `formatTime12Hour` function, and `generateTimeOptions` function (lines 128-152)
4. Remove: `const timeOptions: TimeOption[] = generateTimeOptions();` (line 154)
5. Replace the Start Time Select block (lines 419-435) with:

```tsx
<ScrollTimePicker
  value={timeData.startTime}
  onValueChange={value => setTimeData(prev => ({ ...prev, startTime: value }))}
/>
```

6. Replace the End Time Select block (lines 442-463) with:

```tsx
<ScrollTimePicker
  value={timeData.endTime}
  onValueChange={value => setTimeData(prev => ({ ...prev, endTime: value }))}
  disabled={!task.endTime}
/>
```

7. Keep the Label for End Time as-is (with the "Currently Active" text)

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/TaskEditDialog.tsx
git commit -m "feat: use ScrollTimePicker in TaskEditDialog"
```

---

## Task 4: Integrate into ArchiveEditDialog

**Files:**

- Modify: `src/components/ArchiveEditDialog.tsx`

**Step 1: Replace all Select time pickers with ScrollTimePicker**

In `src/components/ArchiveEditDialog.tsx`:

1. Remove Select-related imports (lines 16-22) — category and project Selects in `TaskEditInArchiveDialog` still need them, so keep the imports
2. Add import: `import { ScrollTimePicker } from "@/components/ui/scroll-time-picker";`
3. Remove: `TimeOption` type and `generateTimeOptions` function (lines 88-103)
4. Remove: `const timeOptions = generateTimeOptions();` at line 129
5. Remove: `const timeOptions = generateTimeOptions();` at line 657

**In ArchiveEditDialog (day start/end):**

6. Replace day Start Time Select (lines 361-377) with:

```tsx
<ScrollTimePicker
  value={dayData.startTime}
  onValueChange={value => setDayData(prev => ({ ...prev, startTime: value }))}
/>
```

7. Replace day End Time Select (lines 383-397) with:

```tsx
<ScrollTimePicker
  value={dayData.endTime}
  onValueChange={value => setDayData(prev => ({ ...prev, endTime: value }))}
/>
```

**In TaskEditInArchiveDialog (task start/end):**

8. Replace task Start Time Select (lines 841-857) with:

```tsx
<ScrollTimePicker
  value={timeData.startTime}
  onValueChange={value => setTimeData(prev => ({ ...prev, startTime: value }))}
/>
```

9. Replace task End Time Select (lines 862-878) with:

```tsx
<ScrollTimePicker
  value={timeData.endTime}
  onValueChange={value => setTimeData(prev => ({ ...prev, endTime: value }))}
/>
```

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/ArchiveEditDialog.tsx
git commit -m "feat: use ScrollTimePicker in ArchiveEditDialog"
```

---

## Task 5: Final verification and cleanup

**Step 1: Run full lint**

Run: `npm run lint`
Expected: PASS (no new errors)

**Step 2: Run full build**

Run: `npm run build`
Expected: PASS

**Step 3: Verify no remaining generateTimeOptions references**

Search codebase for `generateTimeOptions` — should return 0 results.

**Step 4: Manual testing checklist**

- [ ] StartDayDialog: scroll wheel appears, can select time, starts day correctly
- [ ] TaskEditDialog: both start/end pickers work, end time disabled when task active
- [ ] ArchiveEditDialog: day start/end pickers work
- [ ] ArchiveEditDialog TaskEdit: task start/end pickers work
- [ ] Scroll-snap locks to items properly
- [ ] Mouse wheel scrolling works
- [ ] Click-to-select works
- [ ] Dark mode renders correctly
- [ ] Mobile viewport works (responsive)

**Step 5: Update CHANGELOG.md**

Add under `[Unreleased]` > `Changed`:

```markdown
- Replaced time selection dropdowns with scroll-wheel time picker for better UX
  — `src/components/ui/scroll-time-picker.tsx` (new), `StartDayDialog.tsx`, `TaskEditDialog.tsx`, `ArchiveEditDialog.tsx`
```

**Step 6: Final commit**

```bash
git add CHANGELOG.md
git commit -m "chore: update CHANGELOG for scroll time picker"
```
