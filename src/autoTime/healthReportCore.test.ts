import { describe, expect, it } from "vitest";
import {
	buildAutoTimeDailyHealthReport,
	buildAutoTimeHealthMarkdown
} from "../../scripts/asset-log-time-capture/healthReportCore";

describe("auto time health report core", () => {
	it("detects zero-project and high-unattributed users from allocation diagnostics", () => {
		const report = buildAutoTimeDailyHealthReport({
			orgId: "org-001",
			targetWorkDate: "2026-04-23",
			runId: "run-001",
			parserSummary: {
				total_auto_created_projects: 1,
				total_auto_inserted_roots: 1,
				total_conflict_roots: 1,
				total_rejected_roots: 2
			},
			runnerSummary: {
				total_logs_scanned: 100,
				total_logs_accepted: 20,
				total_tasks_written: 5,
				total_existing_auto_tasks_deleted: 3,
				allocation_diagnostics: [
					{
						nas_username: "具志坚强",
						user_id: "user-001",
						raw_total_minutes: 513,
						unattributed_minutes: 513,
						distinct_project_count: 0
					},
					{
						nas_username: "张龙潇",
						user_id: "user-002",
						raw_total_minutes: 512,
						unattributed_minutes: 479,
						distinct_project_count: 2
					},
					{
						nas_username: "蒋仕豪",
						user_id: "user-003",
						raw_total_minutes: 782,
						unattributed_minutes: 19,
						distinct_project_count: 2
					}
				]
			}
		});

		expect(report).toEqual(expect.objectContaining({
			org_id: "org-001",
			target_work_date: "2026-04-23",
			run_id: "run-001",
			status: "completed_with_anomalies",
			total_logs_scanned: 100,
			total_logs_accepted: 20,
			total_projects_auto_created: 1,
			total_roots_auto_inserted: 1,
			total_rebuild_dates_completed: 1,
			total_tasks_written: 5,
			total_zero_project_users: 1,
			total_high_unattributed_users: 1,
			total_conflict_candidates: 1,
			total_rejected_candidates: 2
		}));
		expect(report.summary.zero_project_users).toEqual([
			expect.objectContaining({
				nas_username: "具志坚强",
				user_id: "user-001"
			})
		]);
		expect(report.summary.high_unattributed_users).toEqual([
			expect.objectContaining({
				nas_username: "张龙潇",
				unattributed_ratio: expect.closeTo(0.9355, 4)
			})
		]);
	});

	it("renders markdown with project automation and anomaly totals", () => {
		const markdown = buildAutoTimeHealthMarkdown({
			org_id: "org-001",
			target_work_date: "2026-04-23",
			run_id: "run-001",
			status: "completed_with_anomalies",
			total_logs_scanned: 100,
			total_logs_accepted: 20,
			total_projects_auto_created: 1,
			total_roots_auto_inserted: 1,
			total_rebuild_dates_queued: 1,
			total_rebuild_dates_completed: 1,
			total_tasks_written: 5,
			total_zero_project_users: 1,
			total_high_unattributed_users: 1,
			total_conflict_candidates: 1,
			total_rejected_candidates: 2,
			summary: {
				zero_project_users: [
					{
						nas_username: "具志坚强",
						user_id: "user-001",
						raw_total_minutes: 513,
						unattributed_minutes: 513,
						distinct_project_count: 0,
						unattributed_ratio: 1
					}
				],
				high_unattributed_users: []
			}
		});

		expect(markdown).toContain("# SA-TIME Auto Time Health Report");
		expect(markdown).toContain("| Target Work Date | 2026-04-23 |");
		expect(markdown).toContain("| Auto Created Projects | 1 |");
		expect(markdown).toContain("| Zero Project Users | 1 |");
		expect(markdown).toContain("| 具志坚强 | user-001 | 513 | 513 |");
	});
});
