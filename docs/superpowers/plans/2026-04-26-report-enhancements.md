# Report Page Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent summaries (localStorage, keyed by week+tone), a markdown preview toggle, and enhanced export (copy, download .txt, print/PDF) to the Report page.

**Architecture:** New `useReportStorage` hook handles localStorage independently of generation state. New `SummaryOutput` component replaces the inline `SummaryDraft` function with a mode toggle and export row. `Report.tsx` composes both hooks and renders a saved-summary banner when a prior summary exists for the selected week+tone.

**Tech Stack:** React 18, TypeScript, Vitest + React Testing Library, shadcn/ui (Button, Textarea, Label), Radix Icons, Lucide, existing `MarkdownDisplay` component, `localStorage`

**Spec:** `docs/superpowers/specs/2026-04-26-report-enhancements-design.md`

---

## File Map

| Action | File |
|--------|------|
| Create | `src/hooks/useReportStorage.ts` |
| Create | `src/hooks/useReportStorage.test.ts` |
| Modify | `src/hooks/useReportSummary.ts` — add `load()` method |
| Create | `src/components/SummaryOutput.tsx` |
| Create | `src/components/SummaryOutput.test.tsx` |
| Modify | `src/pages/Report.tsx` — wire storage hook, saved banner, `SummaryOutput` |
| Modify | `public/print.css` — add summary-only print region styles |

---

## Task 1: `useReportStorage` hook

**Files:**
- Create: `src/hooks/useReportStorage.ts`
- Create: `src/hooks/useReportStorage.test.ts`

- [ ] **Step 1.1: Write failing tests**

Create `src/hooks/useReportStorage.test.ts`:

```typescript
// src/hooks/useReportStorage.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReportStorage } from "@/hooks/useReportStorage";

describe("useReportStorage", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("returns null when nothing is saved", () => {
		const { result } = renderHook(() =>
			useReportStorage("2026-01-11", "standup")
		);
		expect(result.current.saved).toBeNull();
	});

	it("saves and returns a summary entry", () => {
		const { result } = renderHook(() =>
			useReportStorage("2026-01-11", "standup")
		);
		act(() => {
			result.current.save("Hello world", "Jan 11 – Jan 17, 2026");
		});
		expect(result.current.saved?.text).toBe("Hello world");
		expect(result.current.saved?.weekLabel).toBe("Jan 11 – Jan 17, 2026");
		expect(result.current.saved?.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it("clears a saved summary", () => {
		const { result } = renderHook(() =>
			useReportStorage("2026-01-11", "standup")
		);
		act(() => {
			result.current.save("Hello world", "Jan 11 – Jan 17, 2026");
		});
		act(() => {
			result.current.clear();
		});
		expect(result.current.saved).toBeNull();
	});

	it("returns null for a different tone when only standup is saved", () => {
		// Save under standup
		const { result: r1 } = renderHook(() =>
			useReportStorage("2026-01-11", "standup")
		);
		act(() => {
			r1.current.save("Standup text", "Jan 11 – Jan 17, 2026");
		});
		// Client tone should have nothing
		const { result: r2 } = renderHook(() =>
			useReportStorage("2026-01-11", "client")
		);
		expect(r2.current.saved).toBeNull();
	});

	it("reacts to weekKey change — returns null for new week with no data", () => {
		const { result, rerender } = renderHook(
			({ weekKey, tone }: { weekKey: string; tone: "standup" | "client" | "retrospective" }) =>
				useReportStorage(weekKey, tone),
			{ initialProps: { weekKey: "2026-01-11", tone: "standup" as const } }
		);
		act(() => {
			result.current.save("Week 1 text", "Jan 11 – Jan 17, 2026");
		});
		rerender({ weekKey: "2026-01-18", tone: "standup" });
		expect(result.current.saved).toBeNull();
	});

	it("save overwrites a previous entry for the same week+tone", () => {
		const { result } = renderHook(() =>
			useReportStorage("2026-01-11", "standup")
		);
		act(() => {
			result.current.save("First version", "Jan 11 – Jan 17, 2026");
		});
		act(() => {
			result.current.save("Second version", "Jan 11 – Jan 17, 2026");
		});
		expect(result.current.saved?.text).toBe("Second version");
	});
});
```

- [ ] **Step 1.2: Run tests — confirm they fail**

```bash
npx vitest run src/hooks/useReportStorage.test.ts
```

Expected: All tests fail with "Cannot find module '@/hooks/useReportStorage'".

- [ ] **Step 1.3: Implement `useReportStorage`**

Create `src/hooks/useReportStorage.ts`:

```typescript
// src/hooks/useReportStorage.ts
// Persists AI-generated report summaries to localStorage.
// Each entry is keyed by week (ISO Sunday date) + tone, giving one saved
// summary per week/tone combination.

import { useState, useEffect, useCallback } from "react";
import { ReportTone } from "@/utils/reportUtils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SavedSummary {
	text: string;
	generatedAt: string; // ISO timestamp
	weekLabel: string;   // e.g. "Jan 11 – Jan 17, 2026"
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function buildKey(weekKey: string, tone: ReportTone): string {
	return `ttp_report_${weekKey}_${tone}`;
}

function readEntry(key: string): SavedSummary | null {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as SavedSummary) : null;
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages one localStorage entry per (weekKey, tone) pair.
 * Reactively re-reads from storage when either argument changes.
 *
 * @param weekKey - ISO date string of the week's Sunday, e.g. "2026-01-11"
 * @param tone    - ReportTone ("standup" | "client" | "retrospective")
 */
export function useReportStorage(weekKey: string, tone: ReportTone) {
	const key = buildKey(weekKey, tone);

	const [saved, setSaved] = useState<SavedSummary | null>(() =>
		readEntry(key)
	);

	// Re-read when the key changes (week or tone switched)
	useEffect(() => {
		setSaved(readEntry(key));
	}, [key]);

	const save = useCallback(
		(text: string, weekLabel: string) => {
			const entry: SavedSummary = {
				text,
				generatedAt: new Date().toISOString(),
				weekLabel,
			};
			try {
				localStorage.setItem(key, JSON.stringify(entry));
				setSaved(entry);
			} catch {
				// localStorage quota exceeded — silently ignore
			}
		},
		[key]
	);

	const clear = useCallback(() => {
		localStorage.removeItem(key);
		setSaved(null);
	}, [key]);

	return { saved, save, clear };
}
```

- [ ] **Step 1.4: Run tests — confirm they pass**

```bash
npx vitest run src/hooks/useReportStorage.test.ts
```

Expected: All 6 tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add src/hooks/useReportStorage.ts src/hooks/useReportStorage.test.ts
git commit -m "feat: add useReportStorage hook for localStorage persistence"
```

---

## Task 2: Add `load()` to `useReportSummary`

Report.tsx needs a way to restore a saved summary directly into the success state without triggering the API. The existing hook has no such method.

**Files:**
- Modify: `src/hooks/useReportSummary.ts`
- Create: `src/hooks/useReportSummary.test.ts`

- [ ] **Step 2.1: Write failing test**

Create `src/hooks/useReportSummary.test.ts`:

```typescript
// src/hooks/useReportSummary.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReportSummary } from "@/hooks/useReportSummary";

vi.mock("@/lib/supabase", () => ({
	supabase: {
		functions: {
			invoke: vi.fn(),
		},
	},
}));

describe("useReportSummary — load()", () => {
	it("sets state to success and populates summary text", () => {
		const { result } = renderHook(() => useReportSummary());
		expect(result.current.state).toBe("idle");

		act(() => {
			result.current.load("Restored summary text");
		});

		expect(result.current.state).toBe("success");
		expect(result.current.summary).toBe("Restored summary text");
		expect(result.current.error).toBeNull();
	});
});
```

- [ ] **Step 2.2: Run test — confirm it fails**

```bash
npx vitest run src/hooks/useReportSummary.test.ts
```

Expected: Fails with "result.current.load is not a function".

- [ ] **Step 2.3: Add `load` to `useReportSummary`**

In `src/hooks/useReportSummary.ts`, make three changes:

**1. Add `load` to the `UseReportSummaryReturn` interface** (around line 30):

```typescript
export interface UseReportSummaryReturn {
  summary: string;
  state: GenerationState;
  error: string | null;
  generate: (week: WeekGroup, tone: ReportTone, todos?: TodoItem[]) => Promise<void>;
  load: (text: string) => void;
  updateSummary: (value: string) => void;
  reset: () => void;
}
```

**2. Add the `load` implementation** inside `useReportSummary()`, after the `generate` callback (around line 235):

```typescript
const load = useCallback((text: string) => {
  setSummary(text);
  setState("success");
  setError(null);
}, []);
```

**3. Add `load` to the return object** (at the bottom of the function):

```typescript
return { summary, state, error, generate, load, updateSummary, reset };
```

- [ ] **Step 2.4: Run test — confirm it passes**

```bash
npx vitest run src/hooks/useReportSummary.test.ts
```

Expected: 1 test passes.

- [ ] **Step 2.5: Commit**

```bash
git add src/hooks/useReportSummary.ts src/hooks/useReportSummary.test.ts
git commit -m "feat: add load() method to useReportSummary for restoring saved summaries"
```

---

## Task 3: `SummaryOutput` component

**Files:**
- Create: `src/components/SummaryOutput.tsx`
- Create: `src/components/SummaryOutput.test.tsx`

- [ ] **Step 3.1: Write failing tests**

Create `src/components/SummaryOutput.test.tsx`:

```typescript
// src/components/SummaryOutput.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SummaryOutput from "@/components/SummaryOutput";

vi.mock("@/components/MarkdownDisplay", () => ({
	MarkdownDisplay: ({ content }: { content: string }) => (
		<div data-testid="markdown-display">{content}</div>
	),
}));

const defaultProps = {
	summary: "This is a **test** summary.",
	weekLabel: "Jan 11 – Jan 17, 2026",
	onUpdate: vi.fn(),
	onRegenerate: vi.fn(),
};

describe("SummaryOutput", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders a textarea in edit mode by default", () => {
		render(<SummaryOutput {...defaultProps} />);
		expect(screen.getByRole("textbox")).toBeInTheDocument();
		expect(screen.queryByTestId("markdown-display")).not.toBeInTheDocument();
	});

	it("switches to preview mode and renders MarkdownDisplay", () => {
		render(<SummaryOutput {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: /preview/i }));
		expect(screen.getByTestId("markdown-display")).toBeInTheDocument();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	});

	it("switches back to edit mode from preview", () => {
		render(<SummaryOutput {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: /preview/i }));
		fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
		expect(screen.getByRole("textbox")).toBeInTheDocument();
	});

	it("calls onUpdate when the textarea value changes", () => {
		render(<SummaryOutput {...defaultProps} />);
		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "updated text" },
		});
		expect(defaultProps.onUpdate).toHaveBeenCalledWith("updated text");
	});

	it("calls onRegenerate when the regenerate button is clicked", () => {
		render(<SummaryOutput {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));
		expect(defaultProps.onRegenerate).toHaveBeenCalledTimes(1);
	});

	it("calls window.print when the print button is clicked", () => {
		const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
		render(<SummaryOutput {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: /print/i }));
		expect(printSpy).toHaveBeenCalledTimes(1);
		printSpy.mockRestore();
	});

	it("triggers a file download when the download button is clicked", () => {
		const createObjectURLSpy = vi
			.spyOn(URL, "createObjectURL")
			.mockReturnValue("blob:test");
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

		render(<SummaryOutput {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: /download/i }));

		expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
		createObjectURLSpy.mockRestore();
	});
});
```

- [ ] **Step 3.2: Run tests — confirm they fail**

```bash
npx vitest run src/components/SummaryOutput.test.tsx
```

Expected: All tests fail with "Cannot find module '@/components/SummaryOutput'".

- [ ] **Step 3.3: Implement `SummaryOutput`**

Create `src/components/SummaryOutput.tsx`:

```typescript
// src/components/SummaryOutput.tsx
// Output panel for the /report page: Edit/Preview toggle, editable textarea,
// markdown preview, and export row (copy, download .txt, print/PDF).

import { useState } from "react";
import {
	ReloadIcon,
	ClipboardCopyIcon,
	CheckIcon,
} from "@radix-ui/react-icons";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MarkdownDisplay } from "@/components/MarkdownDisplay";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SummaryOutputProps {
	summary: string;
	weekLabel: string;
	onUpdate: (v: string) => void;
	onRegenerate: () => void;
}

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	function handleCopy() {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleCopy}
			className="gap-1.5 transition-all"
		>
			{copied ? (
				<>
					<CheckIcon className="h-3.5 w-3.5 text-chart-2" />
					<span className="text-chart-2">Copied</span>
				</>
			) : (
				<>
					<ClipboardCopyIcon className="h-3.5 w-3.5" />
					Copy
				</>
			)}
		</Button>
	);
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

function slugifyLabel(label: string): string {
	return label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function downloadAsTxt(text: string, weekLabel: string): void {
	const blob = new Blob([text], { type: "text/plain" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `summary-${slugifyLabel(weekLabel)}.txt`;
	a.click();
	URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Print helper
// ---------------------------------------------------------------------------

function printSummary(): void {
	document.body.classList.add("print-summary-mode");
	const cleanup = () => {
		document.body.classList.remove("print-summary-mode");
		window.removeEventListener("afterprint", cleanup);
	};
	window.addEventListener("afterprint", cleanup);
	window.print();
}

// ---------------------------------------------------------------------------
// SummaryOutput
// ---------------------------------------------------------------------------

export default function SummaryOutput({
	summary,
	weekLabel,
	onUpdate,
	onRegenerate,
}: SummaryOutputProps) {
	const [mode, setMode] = useState<"edit" | "preview">("edit");

	return (
		<div className="space-y-2 animate-slideUpAndFade">
			{/* Header row */}
			<div className="flex items-center justify-between">
				<Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					Summary
				</Label>
				<div className="flex items-center gap-1">
					{/* Edit / Preview toggle */}
					<div className="flex items-center rounded-md border overflow-hidden">
						<Button
							variant={mode === "edit" ? "secondary" : "ghost"}
							size="sm"
							className="rounded-none h-7 px-2.5 text-xs"
							onClick={() => setMode("edit")}
							aria-pressed={mode === "edit"}
						>
							Edit
						</Button>
						<Button
							variant={mode === "preview" ? "secondary" : "ghost"}
							size="sm"
							className="rounded-none h-7 px-2.5 text-xs border-l"
							onClick={() => setMode("preview")}
							aria-pressed={mode === "preview"}
						>
							Preview
						</Button>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={onRegenerate}
						className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-7 px-2"
					>
						<ReloadIcon className="h-3 w-3" />
						Regenerate
					</Button>
				</div>
			</div>

			{/* Content area — also the print target */}
			<div className="summary-print-region">
				{mode === "edit" ? (
					<Textarea
						value={summary}
						onChange={e => onUpdate(e.target.value)}
						className="min-h-[160px] text-sm resize-none leading-relaxed focus-visible:ring-1 bg-muted/20"
						aria-label="Generated weekly summary — editable before exporting"
					/>
				) : (
					<div className="min-h-[160px] rounded-md border bg-muted/20 px-3 py-2">
						<MarkdownDisplay content={summary} />
					</div>
				)}
			</div>

			{/* Export row */}
			<div className="flex items-center gap-1.5 flex-wrap">
				<CopyButton text={summary} />
				<Button
					variant="outline"
					size="sm"
					className="gap-1.5"
					onClick={() => downloadAsTxt(summary, weekLabel)}
					aria-label="Download summary as text file"
				>
					<Download className="h-3.5 w-3.5" />
					Download .txt
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="gap-1.5"
					onClick={printSummary}
					aria-label="Print or save as PDF"
				>
					<Printer className="h-3.5 w-3.5" />
					Print / PDF
				</Button>
			</div>

			<p className="text-xs text-muted-foreground">
				Edit before exporting. Changes are auto-saved.
			</p>
		</div>
	);
}
```

- [ ] **Step 3.4: Run tests — confirm they pass**

```bash
npx vitest run src/components/SummaryOutput.test.tsx
```

Expected: All 7 tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add src/components/SummaryOutput.tsx src/components/SummaryOutput.test.tsx
git commit -m "feat: add SummaryOutput component with markdown preview and export actions"
```

---

## Task 4: Wire `Report.tsx`, add print styles, final check

**Files:**
- Modify: `src/pages/Report.tsx`
- Modify: `public/print.css`

- [ ] **Step 4.1: Add print-summary-mode styles to `public/print.css`**

At the **end** of `public/print.css`, append the following block:

```css
/* Report page: print only the summary region when triggered by Print/PDF button */
body.print-summary-mode * {
  visibility: hidden;
}

body.print-summary-mode .summary-print-region,
body.print-summary-mode .summary-print-region * {
  visibility: visible;
}

body.print-summary-mode .summary-print-region {
  position: fixed;
  top: 0.75in;
  left: 0.75in;
  right: 0.75in;
  width: auto;
}
```

- [ ] **Step 4.2: Update imports in `Report.tsx`**

Replace the import block at the top of `src/pages/Report.tsx` with the following (adds `weekKey`, `Cross2Icon`, `useReportStorage`, `SavedSummary`, `SummaryOutput`; removes now-unused `ClipboardCopyIcon`, `CheckIcon`, `FileTextIcon`):

```typescript
// src/pages/Report.tsx

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  MixerHorizontalIcon,
  ReloadIcon,
  InfoCircledIcon,
  Cross2Icon,
} from '@radix-ui/react-icons';
import { CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  dayRecordsToArchivedDays,
  groupByCalendarWeek,
  groupByDateRange,
  getMostRecentCompleteWeek,
  formatDuration,
  serializeWeekForPrompt,
  weekKey,
  WeekGroup,
  ReportTone,
  TONE_INSTRUCTIONS,
  getToneSystemPrompt
} from '@/utils/reportUtils';
import { useReportSummary } from '@/hooks/useReportSummary';
import { useReportStorage, SavedSummary } from '@/hooks/useReportStorage';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { PageLayout } from "@/components/PageLayout";
import SummaryOutput from '@/components/SummaryOutput';
```

- [ ] **Step 4.3: Delete the `CopyButton` and `SummaryDraft` inline functions from `Report.tsx`**

Remove the entire `CopyButton` function (lines 188–218 in the original file) and the entire `SummaryDraft` function (lines 341–380). They are replaced by `SummaryOutput`.

Also remove `OutputPanelIdle` — it will be inlined. **Keep** `WeekPreview`, `ToneSelector`, `DateRangePopover`, `GeneratingState`, and `ErrorState` — they are unchanged.

Replace `OutputPanelIdle` with a simple inline JSX in the render (see Step 4.6).

- [ ] **Step 4.4: Add `SavedSummaryBanner` component inside `Report.tsx`**

Add this function **before** the `export default function Report()` declaration:

```typescript
// ---------------------------------------------------------------------------
// Saved summary banner
// ---------------------------------------------------------------------------

function SavedSummaryBanner({
  tone,
  saved,
  onLoad,
  onDismiss,
}: {
  tone: ReportTone;
  saved: SavedSummary;
  onLoad: () => void;
  onDismiss: () => void;
}) {
  const date = new Date(saved.generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const toneLabel = tone.charAt(0).toUpperCase() + tone.slice(1);

  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center justify-between gap-3 animate-slideDownAndFade">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">You have a saved summary for this week</p>
        <p className="text-xs text-muted-foreground">
          {toneLabel} · Generated {date}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={onLoad}
          className="text-xs h-7 px-2.5"
        >
          Load summary
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDismiss}
          className="h-7 w-7"
          aria-label="Dismiss saved summary"
        >
          <Cross2Icon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4.5: Update the `Report` component body**

Replace the `export default function Report()` implementation with the following. The key additions are:
1. `currentWeekKey` derived from `selectedWeek`
2. `storage` hook call
3. `load` destructured from `useReportSummary`
4. Auto-save `useEffect`
5. `handleSummaryUpdate` wrapper

```typescript
export default function Report() {
  const { archivedDays: rawArchivedDays, todoItems } = useTimeTracking();
  const archivedDays = useMemo(
    () => dayRecordsToArchivedDays(rawArchivedDays),
    [rawArchivedDays]
  );
  const calendarWeeks = useMemo(
    () => groupByCalendarWeek(archivedDays),
    [archivedDays]
  );

  const [selectedWeek, setSelectedWeek] = useState<WeekGroup | null>(null);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [calendarIndex, setCalendarIndex] = useState(0);
  const [tone, setTone] = useState<ReportTone>('standup');

  const { summary, state, error, generate, load, updateSummary, reset } =
    useReportSummary();

  // Derive the localStorage key for the current week+tone
  const currentWeekKey = selectedWeek ? weekKey(selectedWeek.weekStart) : "";
  const {
    saved: savedSummary,
    save: saveSummary,
    clear: clearSavedSummary,
  } = useReportStorage(currentWeekKey, tone);

  // Auto-save whenever generation succeeds or the user edits the summary
  useEffect(() => {
    if (state === "success" && summary && selectedWeek) {
      saveSummary(summary, selectedWeek.label);
    }
  }, [state, summary, selectedWeek, saveSummary]);

  useEffect(() => {
    const initial = getMostRecentCompleteWeek(calendarWeeks);
    if (initial) setSelectedWeek(initial);
  }, [calendarWeeks]);

  function handlePrevWeek() {
    const next = calendarIndex + 1;
    if (next < calendarWeeks.length) {
      setCalendarIndex(next);
      setSelectedWeek(calendarWeeks[next]);
      setIsCustomRange(false);
      reset();
    }
  }

  function handleNextWeek() {
    const next = calendarIndex - 1;
    if (next >= 0) {
      setCalendarIndex(next);
      setSelectedWeek(calendarWeeks[next]);
      setIsCustomRange(false);
      reset();
    }
  }

  function handleCustomRange(from: Date, to: Date) {
    const group = groupByDateRange(archivedDays, from, to);
    setSelectedWeek(group);
    setIsCustomRange(true);
    reset();
  }

  function handleToneChange(v: ReportTone) {
    setTone(v);
    reset();
  }

  function handleGenerate() {
    if (!selectedWeek) return;
    generate(selectedWeek, tone, todoItems);
  }

  function handleSummaryUpdate(v: string) {
    updateSummary(v);
    // Auto-save is handled by the useEffect watching [state, summary]
  }

  function handleLoadSaved() {
    if (savedSummary) {
      load(savedSummary.text);
    }
  }

  const canGoPrev = !isCustomRange && calendarIndex < calendarWeeks.length - 1;
  const canGoNext = !isCustomRange && calendarIndex > 0;
  const hasNoData = selectedWeek?.days.length === 0;

  // Empty state — no archived data at all
  if (archivedDays.length === 0) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
          <div className="rounded-full bg-muted p-4">
            <CalendarCheck className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">No archived days yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Archive at least one completed day in TimeTracker Pro to generate
              your first weekly summary.
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Weekly report"
      icon={<CalendarCheck className="w-6 h-6 shrink-0" />}
      description="Generate an AI-written summary of your work week."
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-12 print:p-2">
        <Separator className="mb-6" />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-8 items-start">

          {/* ── Left column: controls ── */}
          <div className="space-y-6">

            {/* Week navigation */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Week
              </Label>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handlePrevWeek}
                    disabled={!canGoPrev}
                    aria-label="Previous week"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1.5 px-1">
                    {isCustomRange && (
                      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm font-medium min-w-[148px] text-center">
                      {selectedWeek?.label ?? '—'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleNextWeek}
                    disabled={!canGoNext}
                    aria-label="Next week"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
                <DateRangePopover onApply={handleCustomRange} />
              </div>

              {isCustomRange && (
                <div className="animate-slideDownAndFade">
                  <button
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                    onClick={() => {
                      setIsCustomRange(false);
                      setSelectedWeek(calendarWeeks[calendarIndex]);
                      reset();
                    }}
                  >
                    Back to calendar weeks
                  </button>
                </div>
              )}
            </div>

            {/* Week preview */}
            {selectedWeek && <WeekPreview week={selectedWeek} />}

            {/* Tone selector */}
            {selectedWeek && !hasNoData && (
              <ToneSelector value={tone} onChange={handleToneChange} />
            )}

            {/* Generate button */}
            {selectedWeek && !hasNoData && state !== 'loading' && (
              <Button className="w-full" onClick={handleGenerate}>
                {state === 'success'
                  ? 'Regenerate summary'
                  : 'Generate summary'}
              </Button>
            )}

            {/* Dev-only prompt preview */}
            {import.meta.env.DEV && selectedWeek && (
              <details className="text-xs text-muted-foreground border rounded-md overflow-hidden">
                <summary className="cursor-pointer select-none px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors">
                  Prompt preview (dev only)
                </summary>
                <pre className="px-3 py-3 whitespace-pre-wrap text-[11px] leading-relaxed overflow-x-auto bg-muted/10">
                  {serializeWeekForPrompt(selectedWeek)}
                </pre>
              </details>
            )}
          </div>

          {/* ── Right column: output ── */}
          <div className="space-y-4">
            {/* Saved summary banner — shown above idle state when a prior summary exists */}
            {state === 'idle' && savedSummary && (
              <SavedSummaryBanner
                tone={tone}
                saved={savedSummary}
                onLoad={handleLoadSaved}
                onDismiss={clearSavedSummary}
              />
            )}

            {state === 'idle' && (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8 py-16 rounded-lg border border-dashed">
                <div className="rounded-full bg-muted p-3">
                  <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Your summary will appear here
                  </p>
                  <p className="text-xs text-muted-foreground max-w-[200px]">
                    Select a week and tone, then generate to see your AI-written summary.
                  </p>
                </div>
              </div>
            )}

            {state === 'loading' && selectedWeek && (
              <GeneratingState weekLabel={selectedWeek.label} />
            )}

            {state === 'error' && error && (
              <ErrorState message={error} onRetry={handleGenerate} />
            )}

            {state === 'success' && summary && selectedWeek && (
              <SummaryOutput
                summary={summary}
                weekLabel={selectedWeek.label}
                onUpdate={handleSummaryUpdate}
                onRegenerate={handleGenerate}
              />
            )}
          </div>

        </div>
      </div>
    </PageLayout>
  );
}
```

- [ ] **Step 4.6: Run the full test suite**

```bash
npx vitest run
```

Expected: All existing tests plus the new ones pass. Zero failures.

- [ ] **Step 4.7: Run the build to check for TypeScript errors**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 4.8: Commit**

```bash
git add src/pages/Report.tsx public/print.css
git commit -m "feat: wire Report page with persistent summaries, markdown preview, and export"
```

---

## Task 5: Final integration check and CHANGELOG

- [ ] **Step 5.1: Start the dev server and manually verify**

```bash
npm run dev
```

Open `http://localhost:8080` and navigate to the Report page. Verify:
1. Generate a summary → navigate away → return → saved banner appears
2. Click "Load summary" → `SummaryOutput` loads with the saved text
3. Click "Preview" → markdown renders
4. Click "Edit" → textarea returns
5. Edit text → navigate away → return → banner shows updated text
6. Click "Download .txt" → file downloads with correct filename
7. Click "Print / PDF" → print dialog opens showing only the summary text
8. Click "✕" on the banner → banner dismisses, idle state shows
9. Change tone → different saved banner (or none if not yet generated)

- [ ] **Step 5.2: Update CHANGELOG.md**

Add under `## [Unreleased]` in `CHANGELOG.md`:

```markdown
### Added
- Persistent report summaries — generated summaries are auto-saved to localStorage
  keyed by week + tone (`ttp_report_{weekKey}_{tone}`); a banner prompts users to
  restore a prior summary when returning to a week/tone combo they've already generated
  — `src/hooks/useReportStorage.ts`, `src/pages/Report.tsx`
- Markdown preview toggle in report output panel — Edit/Preview button pair lets users
  render the summary as formatted markdown before exporting
  — `src/components/SummaryOutput.tsx` (uses existing `MarkdownDisplay`)
- Enhanced export actions — Download .txt (slugified filename) and Print/PDF button
  alongside existing Copy; print mode scopes output to summary region only
  — `src/components/SummaryOutput.tsx`, `public/print.css`
```

- [ ] **Step 5.3: Final commit**

```bash
git add CHANGELOG.md
git commit -m "chore: update CHANGELOG for report enhancements"
```
