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

export function resolveInitiativeDeadline(initiative: Initiative): Date | null {
  if (initiative.deadlineType === "date") {
    return initiative.deadlineDate ? parseLocalDate(initiative.deadlineDate) : null;
  }
  if (initiative.deadlineQuarter == null || initiative.deadlineYear == null) return null;
  return getQuarterEndDate(initiative.deadlineQuarter, initiative.deadlineYear);
}

// Compares at local calendar-day granularity rather than exact instant, so
// choosing "today" as a deadline is never rejected due to the time-of-day
// already elapsed when the initiative was created.
export function isDeadlineBeforeCreation(createdAt: string, deadline: Date): boolean {
  const created = new Date(createdAt);
  const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());
  const deadlineDay = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  return deadlineDay < createdDay;
}
