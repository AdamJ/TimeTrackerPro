import { describe, expect, it } from "vitest";
import {
	buildRecentWorkDates,
	buildSampleReportMarkdown,
	buildSampleReportSummary
} from "../../scripts/asset-log-time-capture/sampleReportCore";

describe("asset-log-time-capture sample report core", () => {
	it("builds recent work dates by skipping weekends", () => {
		const dates = buildRecentWorkDates({
			endDate: "2026-04-21",
			days: 5
		});

		expect(dates).toEqual([
			"2026-04-15",
			"2026-04-16",
			"2026-04-17",
			"2026-04-20",
			"2026-04-21"
		]);
	});

	it("aggregates sample rows into a leader-readable report summary", () => {
		const report = buildSampleReportSummary({
			targetDates: ["2026-04-20", "2026-04-21"],
			results: [
				{
					target_work_date: "2026-04-20",
					allocation_sample_rows: [
						{
							user_id: "user-001",
							nas_username: "alice",
							target_work_date: "2026-04-20",
							distinct_project_count: 1,
							large_gap_hit: false,
							conservative_mode_hit: false
						},
						{
							user_id: "user-002",
							nas_username: "bob",
							target_work_date: "2026-04-20",
							distinct_project_count: 3,
							large_gap_hit: true,
							conservative_mode_hit: true
						}
					]
				},
				{
					target_work_date: "2026-04-21",
					allocation_sample_rows: [
						{
							user_id: "user-003",
							nas_username: "carol",
							target_work_date: "2026-04-21",
							distinct_project_count: 2,
							large_gap_hit: false,
							conservative_mode_hit: false
						}
					]
				}
			]
		});

		expect(report.total_dates).toBe(2);
		expect(report.total_sample_rows).toBe(3);
		expect(report.single_project_days).toBe(1);
		expect(report.two_project_days).toBe(1);
		expect(report.three_plus_project_days).toBe(1);
		expect(report.large_gap_hit_days).toBe(1);
		expect(report.conservative_mode_hit_days).toBe(1);
		expect(report.sample_rows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					user_id: "user-001",
					target_work_date: "2026-04-20"
				}),
				expect.objectContaining({
					user_id: "user-003",
					target_work_date: "2026-04-21"
				})
			])
		);
	});

	it("renders a markdown sample report for leadership review", () => {
		const markdown = buildSampleReportMarkdown({
			report: {
				target_dates: ["2026-04-20", "2026-04-21"],
				total_dates: 2,
				total_sample_rows: 3,
				single_project_days: 1,
				two_project_days: 1,
				three_plus_project_days: 1,
				large_gap_hit_days: 1,
				conservative_mode_hit_days: 1,
				sample_rows: [
					{
						target_work_date: "2026-04-20",
						nas_username: "alice",
						user_id: "user-001",
						raw_last_activity_at: "2026-04-20T10:00:00.000Z",
						raw_total_minutes: 120,
						unattributed_minutes: 30,
						large_gap_hit: false,
						conservative_mode_hit: false,
						projects: [
							{
								project_id: "project-001",
								raw_project_minutes: 90,
								normalized_project_minutes: 360,
								formal_generated_minutes: 240
							}
						]
					}
				]
			}
		});

		expect(markdown).toContain("# SA-TIME Allocation Sample Report");
		expect(markdown).toContain("2026-04-20 -> 2026-04-21");
		expect(markdown).toContain("| Total Dates | 2 |");
		expect(markdown).toContain("| alice | user-001 | 2026-04-20 |");
		expect(markdown).toContain("project-001: raw 90m, normalized 360m, formal 240m");
	});
});
