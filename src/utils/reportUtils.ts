// src/utils/reportUtils.ts
// Utility functions for the /report route in TimeTracker Pro.
// Data is sourced via the TimeTrackingContext (which handles both localStorage
// and Supabase depending on auth state).

import { DayRecord } from '@/contexts/TimeTrackingContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Task {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number; // milliseconds
  project?: string;
  client?: string;
  category?: string;
}

export interface ArchivedDay {
  id: string;
  date: string; // e.g. "Thu Jan 15 2026"
  startTime: string;
  endTime: string;
  totalDuration: number; // milliseconds
  tasks: Task[];
}

export interface WeekGroup {
  weekStart: Date; // Sunday
  weekEnd: Date; // Saturday
  label: string; // e.g. "Jan 11 – Jan 17, 2026"
  days: ArchivedDay[];
  totalDuration: number;
  projects: string[];
}

export type ReportTone = 'standup' | 'client' | 'retrospective';

// ---------------------------------------------------------------------------
// Conversion from context DayRecord[] to ArchivedDay[]
// ---------------------------------------------------------------------------

/**
 * Converts DayRecord[] from TimeTrackingContext (where dates are Date objects)
 * to the ArchivedDay[] format used by report utilities (where dates are strings).
 * This is the correct data source for Report.tsx — it works for both guest
 * (localStorage) and authenticated (Supabase) users.
 */
export function dayRecordsToArchivedDays(records: DayRecord[]): ArchivedDay[] {
  return records.map(day => ({
    id: day.id,
    date: day.date,
    startTime: day.startTime.toISOString(),
    endTime: day.endTime.toISOString(),
    totalDuration: day.totalDuration,
    tasks: day.tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      startTime: t.startTime.toISOString(),
      endTime: t.endTime?.toISOString() ?? '',
      duration: t.duration ?? 0,
      project: t.project,
      client: t.client,
      category: t.category
    }))
  }));
}

// ---------------------------------------------------------------------------
// Week boundaries
// ---------------------------------------------------------------------------

/** Returns the Sunday at or before the given date, at midnight local time. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // rewind to Sunday
  return d;
}

/** Returns the Saturday at or after the given date, at end-of-day local time. */
export function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Stable ISO string key for a week: "2026-01-11" (the Sunday). */
export function weekKey(weekStart: Date): string {
  return weekStart.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/**
 * Groups all archived days into calendar weeks (Sun–Sat).
 * Returns weeks sorted most-recent-first.
 */
export function groupByCalendarWeek(days: ArchivedDay[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>();

  for (const day of days) {
    const dayDate = new Date(day.date);
    if (isNaN(dayDate.getTime())) continue;

    const ws = getWeekStart(dayDate);
    const key = weekKey(ws);

    if (!map.has(key)) {
      const we = getWeekEnd(ws);
      map.set(key, {
        weekStart: ws,
        weekEnd: we,
        label: formatWeekLabel(ws, we),
        days: [],
        totalDuration: 0,
        projects: []
      });
    }

    const group = map.get(key)!;
    group.days.push(day);
    group.totalDuration += day.totalDuration;

    // Collect unique non-empty project names
    for (const task of day.tasks) {
      if (task.project && !group.projects.includes(task.project)) {
        group.projects.push(task.project);
      }
    }
  }

  // Sort days within each week chronologically
  for (const group of map.values()) {
    group.days.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  // Return weeks most-recent-first
  return Array.from(map.values()).sort(
    (a, b) => b.weekStart.getTime() - a.weekStart.getTime()
  );
}

/**
 * Filters archived days to a custom date range (inclusive) and wraps
 * them in a single WeekGroup-shaped object for consistent downstream handling.
 */
export function groupByDateRange(
  days: ArchivedDay[],
  from: Date,
  to: Date
): WeekGroup {
  const fromMs = new Date(from).setHours(0, 0, 0, 0);
  const toMs = new Date(to).setHours(23, 59, 59, 999);

  const filtered = days.filter(day => {
    const t = new Date(day.date).getTime();
    return t >= fromMs && t <= toMs;
  });

  filtered.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const projects: string[] = [];
  let totalDuration = 0;

  for (const day of filtered) {
    totalDuration += day.totalDuration;
    for (const task of day.tasks) {
      if (task.project && !projects.includes(task.project)) {
        projects.push(task.project);
      }
    }
  }

  return {
    weekStart: new Date(from),
    weekEnd: new Date(to),
    label: formatWeekLabel(new Date(from), new Date(to)),
    days: filtered,
    totalDuration,
    projects
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const SHORT_MONTH = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

function formatWeekLabel(start: Date, end: Date): string {
  const startStr = `${SHORT_MONTH[start.getMonth()]} ${start.getDate()}`;
  const endStr =
    start.getFullYear() === end.getFullYear()
      ? `${SHORT_MONTH[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
      : `${SHORT_MONTH[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  return `${startStr} – ${endStr}`;
}

/** Converts milliseconds to a human-readable "Xh Ym" string. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Short day label: "Mon Jan 15" */
function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${SHORT_MONTH[d.getMonth()]} ${d.getDate()}`;
}

// Categories to exclude from the summary prompt (non-work noise)
const EXCLUDED_CATEGORIES = new Set([
  'break-time',
  'break',
  'lunch',
  'personal',
  'admin'
]);

// ---------------------------------------------------------------------------
// Prompt serialization
// ---------------------------------------------------------------------------

/**
 * Serializes a WeekGroup into a lean, human-readable string suitable
 * for inclusion in the Anthropic API prompt. Strips IDs, timestamps,
 * and non-work tasks. Preserves the narrative content of descriptions.
 */
export function serializeWeekForPrompt(week: WeekGroup): string {
  const lines: string[] = [`Week of ${week.label}`, ''];

  for (const day of week.days) {
    const workTasks = day.tasks.filter(
      t => !EXCLUDED_CATEGORIES.has(t.category?.toLowerCase() ?? '')
    );
    if (workTasks.length === 0) continue;

    const dayHours = formatDuration(
      workTasks.reduce((sum, t) => sum + t.duration, 0)
    );
    lines.push(`${formatDayLabel(day.date)} (${dayHours})`);

    for (const task of workTasks) {
      const project = task.project ? ` [${task.project}]` : '';
      const desc = task.description?.trim();
      const taskHours = formatDuration(task.duration);
      if (desc) {
        lines.push(`- ${task.title}${project} (${taskHours}): ${desc}`);
      } else {
        lines.push(`- ${task.title}${project} (${taskHours})`);
      }
    }

    lines.push('');
  }

  return lines.join('\n').trim();
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

const TONE_INSTRUCTIONS: Record<ReportTone, string> = {
  standup:
    'Write in a concise first-person style suitable for a weekly team standup or async update. Focus on what was accomplished and any notable shifts in focus.',
  client:
    'Write in a professional first-person style suitable for sharing with a client or stakeholder. Emphasize outcomes and progress on deliverables.',
  retrospective:
    'Write in a reflective first-person style suitable for a personal weekly retrospective. Note themes, what went well, and what shifted during the week.'
};

/**
 * Builds the full prompt to send to the Anthropic API.
 * Returns a messages array ready for the /v1/messages endpoint.
 */
export function buildSummaryPrompt(
  week: WeekGroup,
  tone: ReportTone = 'standup'
): { system: string; userMessage: string } {
  const system = `You are a professional writing assistant that creates concise weekly work summaries from time tracking data.

Your summaries are:
- 3 to 5 sentences in length
- Written in first person
- Focused on themes and key accomplishments, not a task-by-task recounting
- Natural and conversational, not bulleted or list-like
- Free of filler phrases like "this week I..." or "during the week of..."

${TONE_INSTRUCTIONS[tone]}

Omit breaks, lunch, and any purely administrative tasks. If multiple days covered the same project or theme, synthesize them into a single coherent statement rather than repeating.`;

  const userMessage = `Please summarize the following work week:\n\n${serializeWeekForPrompt(week)}`;

  return { system, userMessage };
}

// ---------------------------------------------------------------------------
// Week availability helpers (for UI state)
// ---------------------------------------------------------------------------

/**
 * Returns a Set of week keys (ISO date strings of Sundays) that have data.
 * Used by the week picker to highlight available weeks.
 */
export function getAvailableWeekKeys(days: ArchivedDay[]): Set<string> {
  const keys = new Set<string>();
  for (const day of days) {
    const d = new Date(day.date);
    if (!isNaN(d.getTime())) {
      keys.add(weekKey(getWeekStart(d)));
    }
  }
  return keys;
}

/**
 * Returns the most recent complete calendar week that has archived data.
 * "Complete" means the week's Saturday has already passed.
 * Falls back to the most recent week with data if none are complete.
 */
export function getMostRecentCompleteWeek(
  weeks: WeekGroup[]
): WeekGroup | null {
  if (weeks.length === 0) return null;
  const now = new Date();
  const complete = weeks.find(w => w.weekEnd < now);
  return complete ?? weeks[0];
}
