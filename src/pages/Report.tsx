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

// ---------------------------------------------------------------------------
// Week Preview
// ---------------------------------------------------------------------------

function WeekPreview({ week }: { week: WeekGroup }) {
  const EXCLUDED = new Set(['break-time', 'break', 'lunch', 'personal']);

  const workDays = week.days
    .map(day => ({
      ...day,
      workTasks: day.tasks.filter(
        t => !EXCLUDED.has(t.category?.toLowerCase() ?? '')
      )
    }))
    .filter(d => d.workTasks.length > 0);

  if (workDays.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          No work entries found for this week.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Week breakdown
        </span>
        <span className="text-xs font-medium tabular-nums">
          {formatDuration(week.totalDuration)} total
        </span>
      </div>
      <div className="divide-y">
        {workDays.map(day => {
          const dayDuration = day.workTasks.reduce(
            (s, t) => s + t.duration,
            0
          );
          const dayProjects = [
            ...new Set(day.workTasks.map(t => t.project).filter(Boolean))
          ] as string[];

          return (
            <div key={day.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{day.date}</span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {formatDuration(dayDuration)}
                </span>
              </div>
              {dayProjects.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {dayProjects.map(p => (
                    <Badge
                      key={p}
                      variant="secondary"
                      className="text-xs font-normal px-1.5 py-0"
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tone Selector
// ---------------------------------------------------------------------------

const TONE_LABELS: Record<ReportTone, string> = {
  standup: 'Team update or async standup',
  client: 'Client or stakeholder facing',
  retrospective: 'Personal weekly reflection'
};

function ToneSelector({
  value,
  onChange
}: {
  value: ReportTone;
  onChange: (v: ReportTone) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tone
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              aria-label="View full system prompt for this tone"
            >
              <InfoCircledIcon className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 space-y-3" align="end">
            <div>
              <p className="text-sm font-medium capitalize">{value} prompt</p>
              <p className="text-xs text-muted-foreground mt-0.5">{TONE_LABELS[value]}</p>
            </div>
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-md p-3 max-h-[280px] overflow-y-auto font-mono">
              {getToneSystemPrompt(value)}
            </pre>
          </PopoverContent>
        </Popover>
      </div>
      <Tabs value={value} onValueChange={v => onChange(v as ReportTone)}>
        <TabsList className="w-full h-auto p-1 grid grid-cols-3">
          {(['standup', 'client', 'retrospective'] as ReportTone[]).map(
            tone => (
              <TabsTrigger
                key={tone}
                value={tone}
                className="py-2 h-auto text-xs capitalize data-[state=active]:shadow-sm"
              >
                {tone}
              </TabsTrigger>
            )
          )}
        </TabsList>
      </Tabs>
      <p className="text-xs text-muted-foreground">{TONE_INSTRUCTIONS[value]}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date Range Popover
// ---------------------------------------------------------------------------

function DateRangePopover({
  onApply
}: {
  onApply: (from: Date, to: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const isValid = from && to && new Date(from) <= new Date(to);

  function handleApply() {
    if (!isValid) return;
    onApply(new Date(from), new Date(to));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <MixerHorizontalIcon className="h-3.5 w-3.5" />
          Custom range
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-4" align="end">
        <div>
          <p className="text-sm font-medium">Custom date range</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate a summary across any date range with archived data.
          </p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="range-from" className="text-xs">From</Label>
            <Input
              id="range-from"
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="range-to" className="text-xs">To</Label>
            <Input
              id="range-to"
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
        <Button
          size="sm"
          className="w-full"
          disabled={!isValid}
          onClick={handleApply}
        >
          Apply range
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Right panel states
// ---------------------------------------------------------------------------

function GeneratingState({ weekLabel }: { weekLabel: string }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden animate-slideUpAndFade">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Generating summary
        </span>
        <ReloadIcon className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      </div>
      <div className="px-4 py-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          Summarizing{' '}
          <span className="text-foreground font-medium">{weekLabel}</span>…
        </p>
        <div className="space-y-2">
          <div className="h-2.5 bg-muted rounded-full w-full animate-pulse" />
          <div className="h-2.5 bg-muted rounded-full w-5/6 animate-pulse [animation-delay:150ms]" />
          <div className="h-2.5 bg-muted rounded-full w-4/5 animate-pulse [animation-delay:300ms]" />
          <div className="h-2.5 bg-muted rounded-full w-3/4 animate-pulse [animation-delay:450ms]" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 overflow-hidden animate-slideUpAndFade">
      <div className="px-4 py-3 border-b border-destructive/20">
        <p className="text-sm font-medium text-destructive">
          Generation failed
        </p>
      </div>
      <div className="px-4 py-3 space-y-3">
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-1.5"
        >
          <ReloadIcon className="h-3.5 w-3.5" />
          Try again
        </Button>
      </div>
    </div>
  );
}

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

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

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
  // Empty string when no week is selected yet; useReportStorage will return null
  // for this key and save() is gated behind the generate button (requires selectedWeek)
  const currentWeekKey = selectedWeek ? weekKey(selectedWeek.weekStart) : "";
  const {
    saved: savedSummary,
    save: saveSummary,
    clear: clearSavedSummary,
  } = useReportStorage(currentWeekKey, tone);

  // Auto-save whenever generation succeeds or the user edits the summary
  useEffect(() => {
    if (state !== "success" || !summary || !selectedWeek) return;
    // Debounce saves to avoid write-on-every-keystroke (important for iOS WebView)
    const timer = setTimeout(() => {
      saveSummary(summary, selectedWeek.label);
    }, 300);
    return () => clearTimeout(timer);
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
    // The auto-save useEffect watches [state, summary] and fires on every
    // summary change (including keystrokes) when state === "success"
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
            {/* Saved summary banner — shown only in idle state so it doesn't overlap an
                active or loading summary. Changing tone calls reset() → idle, so the
                banner re-appears correctly for the new tone.
                Note: dismissing clears the saved entry for this week+tone. If the user
                subsequently generates a new summary, auto-save writes a new entry and the
                banner will re-appear on next visit — intentional, as it is a new summary. */}
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
