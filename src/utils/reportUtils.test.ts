// src/utils/reportUtils.test.ts
import { describe, it, expect } from "vitest";
import {
	filterWeekByProject,
	formatDuration,
	groupByCalendarWeek,
	getMostRecentCompleteWeek,
	getWeekStart,
	ArchivedDay,
	WeekGroup,
} from "@/utils/reportUtils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDay(
	date: string,
	tasks: { project?: string; duration: number }[]
): ArchivedDay {
	return {
		id: date,
		date,
		startTime: `${date}T09:00:00.000Z`,
		endTime: `${date}T17:00:00.000Z`,
		totalDuration: tasks.reduce((s, t) => s + t.duration, 0),
		tasks: tasks.map((t, i) => ({
			id: `${date}-task-${i}`,
			title: `Task ${i}`,
			startTime: `${date}T09:00:00.000Z`,
			endTime: `${date}T10:00:00.000Z`,
			duration: t.duration,
			project: t.project,
		})),
	};
}

function makeWeek(days: ArchivedDay[]): WeekGroup {
	const projects = [
		...new Set(
			days
				.flatMap(d => d.tasks.map(t => t.project))
				.filter((p): p is string => Boolean(p))
		),
	];
	const totalDuration = days.reduce((s, d) => s + d.totalDuration, 0);
	const weekStart = getWeekStart(new Date(days[0].date));
	return {
		weekStart,
		weekEnd: new Date(weekStart.getTime() + 6 * 86400000),
		label: "Test week",
		days,
		totalDuration,
		projects,
	};
}

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

describe("formatDuration", () => {
	it("formats hours and minutes", () => {
		expect(formatDuration(3 * 3600000 + 45 * 60000)).toBe("3h 45m");
	});

	it("formats whole hours with no minutes", () => {
		expect(formatDuration(2 * 3600000)).toBe("2h");
	});

	it("formats minutes only when under an hour", () => {
		expect(formatDuration(30 * 60000)).toBe("30m");
	});

	it("returns 0m for zero", () => {
		expect(formatDuration(0)).toBe("0m");
	});
});

// ---------------------------------------------------------------------------
// filterWeekByProject
// ---------------------------------------------------------------------------

describe("filterWeekByProject", () => {
	const days = [
		makeDay("2026-05-25", [
			{ project: "Alpha", duration: 3600000 },
			{ project: "Beta", duration: 1800000 },
		]),
		makeDay("2026-05-26", [{ project: "Alpha", duration: 7200000 }]),
		makeDay("2026-05-27", [{ project: "Beta", duration: 3600000 }]),
	];
	const week = makeWeek(days);

	it("returns the original week reference when project is empty string", () => {
		expect(filterWeekByProject(week, "")).toBe(week);
	});

	it("filters tasks to only those matching the selected project", () => {
		const result = filterWeekByProject(week, "Alpha");
		for (const day of result.days) {
			for (const task of day.tasks) {
				expect(task.project).toBe("Alpha");
			}
		}
	});

	it("excludes days that have no tasks for the selected project", () => {
		const result = filterWeekByProject(week, "Alpha");
		// 2026-05-27 has only Beta tasks — should be absent
		expect(result.days.find(d => d.date === "2026-05-27")).toBeUndefined();
		expect(result.days).toHaveLength(2);
	});

	it("recomputes totalDuration from matching tasks only", () => {
		const result = filterWeekByProject(week, "Alpha");
		// Alpha: 3 600 000 (day 1) + 7 200 000 (day 2) = 10 800 000
		expect(result.totalDuration).toBe(10800000);
	});

	it("sets projects to an array containing only the selected project", () => {
		const result = filterWeekByProject(week, "Beta");
		expect(result.projects).toEqual(["Beta"]);
	});

	it("preserves week metadata (label, weekStart, weekEnd)", () => {
		const result = filterWeekByProject(week, "Alpha");
		expect(result.label).toBe(week.label);
		expect(result.weekStart).toBe(week.weekStart);
		expect(result.weekEnd).toBe(week.weekEnd);
	});

	it("returns empty days and zero duration when the project is not in the week", () => {
		const result = filterWeekByProject(week, "Gamma");
		expect(result.days).toHaveLength(0);
		expect(result.totalDuration).toBe(0);
	});

	it("handles a week where a day has multiple tasks from the same project", () => {
		const multiTaskDays = [
			makeDay("2026-05-25", [
				{ project: "Alpha", duration: 1800000 },
				{ project: "Alpha", duration: 900000 },
				{ project: "Beta", duration: 3600000 },
			]),
		];
		const multiWeek = makeWeek(multiTaskDays);
		const result = filterWeekByProject(multiWeek, "Alpha");
		expect(result.days).toHaveLength(1);
		expect(result.days[0].tasks).toHaveLength(2);
		expect(result.totalDuration).toBe(2700000);
	});
});

// ---------------------------------------------------------------------------
// groupByCalendarWeek
// ---------------------------------------------------------------------------

describe("groupByCalendarWeek", () => {
	it("returns an empty array for no days", () => {
		expect(groupByCalendarWeek([])).toHaveLength(0);
	});

	it("groups adjacent days into the same calendar week", () => {
		const days = [
			makeDay("2026-05-25", [{ project: "A", duration: 3600000 }]),
			makeDay("2026-05-26", [{ project: "A", duration: 3600000 }]),
		];
		const weeks = groupByCalendarWeek(days);
		expect(weeks).toHaveLength(1);
		expect(weeks[0].days).toHaveLength(2);
	});

	it("separates days from different calendar weeks", () => {
		const days = [
			makeDay("2026-05-25", [{ project: "A", duration: 3600000 }]),
			makeDay("2026-06-01", [{ project: "A", duration: 3600000 }]),
		];
		const weeks = groupByCalendarWeek(days);
		expect(weeks).toHaveLength(2);
	});

	it("returns weeks sorted most-recent-first", () => {
		const days = [
			makeDay("2026-05-18", [{ project: "A", duration: 3600000 }]),
			makeDay("2026-05-25", [{ project: "A", duration: 3600000 }]),
		];
		const weeks = groupByCalendarWeek(days);
		expect(weeks[0].weekStart.getTime()).toBeGreaterThan(
			weeks[1].weekStart.getTime()
		);
	});

	it("collects unique projects per week without duplicates", () => {
		const days = [
			makeDay("2026-05-25", [
				{ project: "Alpha", duration: 3600000 },
				{ project: "Beta", duration: 1800000 },
				{ project: "Alpha", duration: 900000 },
			]),
		];
		const weeks = groupByCalendarWeek(days);
		expect(weeks[0].projects.sort()).toEqual(["Alpha", "Beta"]);
	});

	it("sums totalDuration across all days in the week", () => {
		const days = [
			makeDay("2026-05-25", [{ duration: 3600000 }]),
			makeDay("2026-05-26", [{ duration: 7200000 }]),
		];
		const weeks = groupByCalendarWeek(days);
		expect(weeks[0].totalDuration).toBe(10800000);
	});
});

// ---------------------------------------------------------------------------
// getMostRecentCompleteWeek
// ---------------------------------------------------------------------------

describe("getMostRecentCompleteWeek", () => {
	it("returns null for an empty list", () => {
		expect(getMostRecentCompleteWeek([])).toBeNull();
	});

	it("returns a past week as the most recent complete week", () => {
		const days = [
			makeDay("2026-01-15", [{ project: "A", duration: 3600000 }]),
		];
		const weeks = groupByCalendarWeek(days);
		const result = getMostRecentCompleteWeek(weeks);
		expect(result).not.toBeNull();
		expect(result!.weekEnd.getTime()).toBeLessThan(Date.now());
	});

	it("falls back to the first (most recent) week when none are complete", () => {
		// Use a future date so no week is "complete"
		const futureDate = new Date(Date.now() + 30 * 86400000)
			.toISOString()
			.slice(0, 10);
		const days = [makeDay(futureDate, [{ project: "A", duration: 3600000 }])];
		const weeks = groupByCalendarWeek(days);
		const result = getMostRecentCompleteWeek(weeks);
		expect(result).toBe(weeks[0]);
	});
});
