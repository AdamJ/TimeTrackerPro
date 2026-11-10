import type { Initiative } from "@/contexts/TimeTrackingContext";

// Last calendar day of the given standard calendar quarter (Q1=Jan-Mar ... Q4=Oct-Dec).
export function getQuarterEndDate(quarter: number, year: number): Date {
  return new Date(Date.UTC(year, quarter * 3, 0));
}

// Parses a plain "YYYY-MM-DD" string (e.g. from <input type="date">) as local
// midnight rather than UTC midnight — `new Date("YYYY-MM-DD")` reads as UTC
// midnight, which displays and compares as the previous calendar day in any
// timezone west of UTC.
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Formats a Date as the local calendar day "YYYY-MM-DD" (the value format of
// <input type="date">). toISOString() would give the UTC day, which is
// tomorrow's date for an evening user west of UTC.
export function toLocalDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function resolveInitiativeDeadline(initiative: Initiative): Date | null {
  if (initiative.deadlineType === "date") {
    return initiative.deadlineDate ? parseLocalDate(initiative.deadlineDate) : null;
  }
  if (initiative.deadlineQuarter == null || initiative.deadlineYear == null) return null;
  return getQuarterEndDate(initiative.deadlineQuarter, initiative.deadlineYear);
}

// Start of the initiative's span: the explicit start date when set, otherwise
// the creation timestamp (the pre-start-date behavior, so legacy rows render
// unchanged).
export function resolveInitiativeStart(initiative: Initiative): Date {
  return initiative.startDate ? parseLocalDate(initiative.startDate) : new Date(initiative.createdAt);
}

// Compares at local calendar-day granularity rather than exact instant, so
// choosing "today" as a deadline is never rejected due to the time-of-day
// already elapsed when the initiative was created.
export function isDeadlineBeforeCreation(createdAt: string, deadline: Date): boolean {
  return isDeadlineBeforeStart(new Date(createdAt), deadline);
}

// True when `deadline` falls on an earlier local calendar day than `start`.
export function isDeadlineBeforeStart(start: Date, deadline: Date): boolean {
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const deadlineDay = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  return deadlineDay < startDay;
}
