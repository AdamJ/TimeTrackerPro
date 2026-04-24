import { describe, expect, it, vi } from "vitest";
import {
	runAutoTimeFullLoop,
	type AutoTimeFullLoopRepository
} from "../../scripts/asset-log-time-capture/fullLoopRunner";
import type { AutoTimeRunnerConfig } from "../../scripts/asset-log-time-capture/core";
import type { NasRootAutoParserConfig } from "../../scripts/asset-log-time-capture/nasRootAutoParserCore";

const parserConfig: NasRootAutoParserConfig = {
	orgId: "org-001",
	supabaseUrl: "https://example.supabase.co",
	supabaseServiceRoleKey: "service-role-key",
	sourceTable: "public.asset_version_log",
	targetWorkDate: "2026-04-23",
	timezone: "Asia/Shanghai",
	dryRun: false,
	actions: ["create", "write", "rename", "delete"],
	lookbackDays: 7
};

const runnerConfig: AutoTimeRunnerConfig = {
	orgId: "org-001",
	supabaseUrl: "https://example.supabase.co",
	supabaseServiceRoleKey: "service-role-key",
	targetWorkDate: "2026-04-23",
	timezone: "Asia/Shanghai",
	dryRun: false,
	ignoreWeekends: true,
	actions: ["create", "write", "rename", "delete"],
	sourceTable: "public.asset_version_log",
	allocationMode: "interval_to_previous_project",
	largeGapThresholdMinutes: 120,
	skipFormalWriteOnLargeGap: false,
	rebuildNasAuto: false
};

describe("auto time full loop runner", () => {
	it("runs parser, rebuilds affected work dates, runs normal capture, and writes health report", async () => {
		const repository = {
			insertDailyHealthReport: vi.fn().mockResolvedValue(undefined)
		} as unknown as AutoTimeFullLoopRepository;
		const runParser = vi.fn().mockResolvedValue({
			status: "completed",
			summary: {
				total_auto_created_projects: 1,
				total_auto_inserted_roots: 1,
				total_conflict_roots: 0,
				total_rejected_roots: 0,
				candidate_samples: [
					{
						candidate_root_path: "/daga-2025-project/CONCEPT/C20260413_友谊商店二期",
						candidate_status: "auto_project_created",
						first_seen_at: "2026-04-20T02:00:00.000Z",
						last_seen_at: "2026-04-23T07:00:00.000Z"
					}
				]
			}
		});
		const runCapture = vi.fn()
			.mockResolvedValueOnce({
				status: "completed",
				runId: "rebuild-2026-04-20",
				summary: {
					total_logs_scanned: 10,
					total_logs_accepted: 8,
					total_existing_auto_tasks_deleted: 1,
					total_tasks_written: 3,
					allocation_diagnostics: []
				}
			})
			.mockResolvedValueOnce({
				status: "completed",
				runId: "rebuild-2026-04-21",
				summary: {
					total_logs_scanned: 11,
					total_logs_accepted: 9,
					total_existing_auto_tasks_deleted: 1,
					total_tasks_written: 4,
					allocation_diagnostics: []
				}
			})
			.mockResolvedValueOnce({
				status: "completed",
				runId: "rebuild-2026-04-22",
				summary: {
					total_logs_scanned: 12,
					total_logs_accepted: 10,
					total_existing_auto_tasks_deleted: 1,
					total_tasks_written: 5,
					allocation_diagnostics: []
				}
			})
			.mockResolvedValueOnce({
				status: "completed",
				runId: "rebuild-2026-04-23",
				summary: {
					total_logs_scanned: 13,
					total_logs_accepted: 11,
					total_existing_auto_tasks_deleted: 1,
					total_tasks_written: 6,
					allocation_diagnostics: []
				}
			})
			.mockResolvedValueOnce({
				status: "completed",
				runId: "normal-2026-04-23",
				summary: {
					total_logs_scanned: 13,
					total_logs_accepted: 11,
					total_tasks_written: 0,
					allocation_diagnostics: [
						{
							nas_username: "具志坚强",
							user_id: "user-001",
							raw_total_minutes: 513,
							unattributed_minutes: 0,
							distinct_project_count: 1
						}
					]
				}
			});

		const result = await runAutoTimeFullLoop({
			parserConfig,
			runnerConfig,
			repository,
			runParser,
			runCapture
		});

		expect(runParser).toHaveBeenCalledWith(parserConfig, repository);
		expect(runCapture).toHaveBeenNthCalledWith(1, expect.objectContaining({
			targetWorkDate: "2026-04-20",
			rebuildNasAuto: true
		}), repository);
		expect(runCapture).toHaveBeenNthCalledWith(4, expect.objectContaining({
			targetWorkDate: "2026-04-23",
			rebuildNasAuto: true
		}), repository);
		expect(runCapture).toHaveBeenNthCalledWith(5, expect.objectContaining({
			targetWorkDate: "2026-04-23",
			rebuildNasAuto: false
		}), repository);
		expect(repository.insertDailyHealthReport).toHaveBeenCalledWith(expect.objectContaining({
			target_work_date: "2026-04-23",
			run_id: "normal-2026-04-23",
			total_projects_auto_created: 1,
			total_roots_auto_inserted: 1,
			total_rebuild_dates_queued: 4,
			total_rebuild_dates_completed: 4,
			total_tasks_written: 18
		}));
		expect(result.rebuildDates).toEqual([
			"2026-04-20",
			"2026-04-21",
			"2026-04-22",
			"2026-04-23"
		]);
	});
});
