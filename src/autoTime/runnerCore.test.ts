import { describe, expect, it, vi } from "vitest";
import {
	buildTargetDayWindow,
	buildRawAllocationDiagnostics,
	normalizeProjectMinutesToFixedTotal,
	runAutoTimeCapture,
	type AutoTimeRunnerRepository,
	type AutoTimeRunnerConfig
} from "../../scripts/asset-log-time-capture/core";

const createConfig = (overrides: Partial<AutoTimeRunnerConfig> = {}): AutoTimeRunnerConfig => ({
	orgId: "00000000-0000-0000-0000-000000000001",
	supabaseUrl: "https://example.supabase.co",
	supabaseServiceRoleKey: "service-role-key",
	targetWorkDate: "2026-04-21",
	timezone: "Asia/Shanghai",
	dryRun: false,
	ignoreWeekends: true,
	actions: ["create", "write", "rename", "delete"],
	sourceTable: "public.asset_version_log",
	allocationMode: "even_split",
	largeGapThresholdMinutes: 120,
	skipFormalWriteOnLargeGap: false,
	rebuildNasAuto: false,
	...overrides
});

describe("asset-log-time-capture core", () => {
	it("compresses consecutive project events and attributes adjacent intervals to the previous project", () => {
		const allocation = buildRawAllocationDiagnostics({
			dayStartIso: "2026-04-21T02:00:00.000Z",
			rawLastActivityAt: "2026-04-21T08:00:00.000Z",
			projectEvents: [
				{
					project_id: "project-001",
					project_root_id: "root-001",
					detected_at: "2026-04-21T03:00:00.000Z"
				},
				{
					project_id: "project-001",
					project_root_id: "root-001",
					detected_at: "2026-04-21T04:00:00.000Z"
				},
				{
					project_id: "project-002",
					project_root_id: "root-002",
					detected_at: "2026-04-21T05:00:00.000Z"
				},
				{
					project_id: "project-001",
					project_root_id: "root-001",
					detected_at: "2026-04-21T06:00:00.000Z"
				}
			]
		});

		expect(allocation.raw_total_minutes).toBe(360);
		expect(allocation.unattributed_minutes).toBe(60);
		expect(allocation.attributed_total_minutes).toBe(300);
		expect(allocation.distinct_project_count).toBe(2);
		expect(allocation.compressed_project_events).toEqual([
			expect.objectContaining({
				project_id: "project-001",
				detected_at: "2026-04-21T03:00:00.000Z"
			}),
			expect.objectContaining({
				project_id: "project-002",
				detected_at: "2026-04-21T05:00:00.000Z"
			}),
			expect.objectContaining({
				project_id: "project-001",
				detected_at: "2026-04-21T06:00:00.000Z"
			})
		]);
		expect(allocation.project_minutes).toEqual([
			expect.objectContaining({
				project_id: "project-001",
				raw_project_minutes: 240
			}),
			expect.objectContaining({
				project_id: "project-002",
				raw_project_minutes: 60
			})
		]);
		expect(normalizeProjectMinutesToFixedTotal(allocation.project_minutes, 480)).toEqual([
			expect.objectContaining({
				project_id: "project-001",
				normalized_project_minutes: 384
			}),
			expect.objectContaining({
				project_id: "project-002",
				normalized_project_minutes: 96
			})
		]);
	});

	it("keeps the last project's first event so its interval extends to rawLastActivityAt", () => {
		const allocation = buildRawAllocationDiagnostics({
			dayStartIso: "2026-04-21T02:00:00.000Z",
			rawLastActivityAt: "2026-04-21T08:00:00.000Z",
			projectEvents: [
				{
					project_id: "project-001",
					project_root_id: "root-001",
					detected_at: "2026-04-21T03:00:00.000Z"
				},
				{
					project_id: "project-002",
					project_root_id: "root-002",
					detected_at: "2026-04-21T05:00:00.000Z"
				},
				{
					project_id: "project-002",
					project_root_id: "root-002",
					detected_at: "2026-04-21T08:00:00.000Z"
				}
			]
		});

		expect(allocation.compressed_project_events).toEqual([
			expect.objectContaining({
				project_id: "project-001",
				detected_at: "2026-04-21T03:00:00.000Z"
			}),
			expect.objectContaining({
				project_id: "project-002",
				detected_at: "2026-04-21T05:00:00.000Z"
			})
		]);
		expect(allocation.project_intervals).toEqual([
			expect.objectContaining({
				project_id: "project-001",
				interval_minutes: 120
			}),
			expect.objectContaining({
				project_id: "project-002",
				interval_minutes: 180
			})
		]);
		expect(allocation.project_minutes).toEqual([
			expect.objectContaining({
				project_id: "project-001",
				raw_project_minutes: 120
			}),
			expect.objectContaining({
				project_id: "project-002",
				raw_project_minutes: 180
			})
		]);
	});

	it("builds the previous Shanghai business day window", () => {
		const window = buildTargetDayWindow({
			now: new Date("2026-04-21T20:30:00.000Z"),
			timezone: "Asia/Shanghai"
		});

		expect(window.targetWorkDate).toBe("2026-04-21");
		expect(window.rangeStartIso).toBe("2026-04-20T16:00:00.000Z");
		expect(window.rangeEndIso).toBe("2026-04-21T16:00:00.000Z");
		expect(window.dayOfWeek).toBe(2);
	});

	it("skips weekend targets before creating a run record", async () => {
		const repository: AutoTimeRunnerRepository = {
			createRun: vi.fn(),
			finalizeRun: vi.fn()
		};

		const result = await runAutoTimeCapture({
			config: createConfig({
				targetWorkDate: "2026-04-19"
			}),
			repository
		});

		expect(result.status).toBe("skipped");
		expect(result.summary.skipReason).toBe("weekend");
		expect(repository.createRun).not.toHaveBeenCalled();
		expect(repository.finalizeRun).not.toHaveBeenCalled();
	});

	it("skips configured holidays before creating a run record", async () => {
		const repository: AutoTimeRunnerRepository = {
			createRun: vi.fn(),
			finalizeRun: vi.fn()
		};

		const result = await runAutoTimeCapture({
			config: createConfig({
				targetWorkDate: "2026-05-01"
			}),
			repository
		});

		expect(result.status).toBe("skipped");
		expect(result.summary.skipReason).toBe("holiday");
		expect(repository.createRun).not.toHaveBeenCalled();
		expect(repository.finalizeRun).not.toHaveBeenCalled();
	});

	it("creates and finalizes a skeleton run on workdays", async () => {
		const repository: AutoTimeRunnerRepository = {
			createRun: vi.fn().mockResolvedValue({
				id: "run-001"
			}),
			finalizeRun: vi.fn().mockResolvedValue(undefined)
		};

		const result = await runAutoTimeCapture({
			config: createConfig(),
			repository
		});

		expect(repository.createRun).toHaveBeenCalledWith(
			expect.objectContaining({
				org_id: "00000000-0000-0000-0000-000000000001",
				target_work_date: "2026-04-21",
				status: "running"
			})
		);
		expect(repository.finalizeRun).toHaveBeenCalledWith(
			"run-001",
			"skipped",
			expect.objectContaining({
				stage: "skeleton_pending_implementation",
				total_logs_scanned: 0
			})
		);
		expect(result.status).toBe("skipped");
		expect(result.runId).toBe("run-001");
	});

	it("loads asset logs and filters ignored or incomplete records during dry-run", async () => {
		const repository: AutoTimeRunnerRepository = {
			createRun: vi.fn(),
			finalizeRun: vi.fn(),
			loadIgnoreAccounts: vi.fn().mockResolvedValue(["wenshunhe"]),
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-001",
					file_path: "/Projects/A/file-1.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-20T18:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-20T18:00:05.000Z"
				},
				{
					id: "log-002",
					file_path: "/Projects/A/file-2.psd",
					nas_username: "wenshunhe",
					action: "write",
					detected_at: "2026-04-20T19:00:00.000Z",
					sa_ai_user_id: null,
					created_at: "2026-04-20T19:00:05.000Z"
				},
				{
					id: "log-003",
					file_path: "",
					nas_username: "bob",
					action: "rename",
					detected_at: "2026-04-20T20:00:00.000Z",
					sa_ai_user_id: null,
					created_at: "2026-04-20T20:00:05.000Z"
				},
				{
					id: "log-004",
					file_path: "/Projects/B/file-4.psd",
					nas_username: "",
					action: "create",
					detected_at: "2026-04-20T21:00:00.000Z",
					sa_ai_user_id: null,
					created_at: "2026-04-20T21:00:05.000Z"
				}
			])
		};

		const result = await runAutoTimeCapture({
			config: createConfig({
				dryRun: true
			}),
			repository
		});

		expect(repository.loadAssetLogs).toHaveBeenCalledWith(
			expect.objectContaining({
				sourceTable: "public.asset_version_log",
				rangeStartIso: "2026-04-20T16:00:00.000Z",
				rangeEndIso: "2026-04-21T16:00:00.000Z",
				actions: ["create", "write", "rename", "delete"]
			})
		);
		expect(repository.loadIgnoreAccounts).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001");
		expect(result.status).toBe("dry-run");
		expect(result.summary.stage).toBe("logs_loaded");
		expect(result.summary.total_logs_scanned).toBe(4);
		expect(result.summary.total_logs_accepted).toBe(1);
		expect(result.summary.total_logs_ignored_accounts).toBe(1);
		expect(result.summary.total_logs_rejected_incomplete).toBe(2);
	});

	it("maps users and projects, then deduplicates by user-date-project during dry-run", async () => {
		const repository: AutoTimeRunnerRepository = {
			createRun: vi.fn(),
			finalizeRun: vi.fn(),
			loadIgnoreAccounts: vi.fn().mockResolvedValue(["wenshunhe"]),
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-101",
					file_path: "/Projects/A/concept/file-1.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-20T18:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-20T18:00:05.000Z"
				},
				{
					id: "log-102",
					file_path: "/Projects/A/render/file-2.psd",
					nas_username: "alice",
					action: "rename",
					detected_at: "2026-04-20T19:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-20T19:00:05.000Z"
				},
				{
					id: "log-103",
					file_path: "/Projects/B/model/file-3.psd",
					nas_username: "longxiao",
					action: "write",
					detected_at: "2026-04-20T20:00:00.000Z",
					sa_ai_user_id: null,
					created_at: "2026-04-20T20:00:05.000Z"
				},
				{
					id: "log-104",
					file_path: "/Projects/C/misc/file-4.psd",
					nas_username: "ghost-user",
					action: "write",
					detected_at: "2026-04-20T21:00:00.000Z",
					sa_ai_user_id: null,
					created_at: "2026-04-20T21:00:05.000Z"
				},
				{
					id: "log-105",
					file_path: "/Unknown/file-5.psd",
					nas_username: "alice",
					action: "create",
					detected_at: "2026-04-20T22:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-20T22:00:05.000Z"
				}
			]),
			loadNasUserAliases: vi.fn().mockResolvedValue([
				{
					nas_username: "longxiao",
					user_id: "user-002"
				}
			]),
			loadProjectRoots: vi.fn().mockResolvedValue([
				{
					id: "root-001",
					project_id: "project-001",
					root_path: "/Projects/A"
				},
				{
					id: "root-002",
					project_id: "project-002",
					root_path: "/Projects/B"
				}
			])
		};

		const result = await runAutoTimeCapture({
			config: createConfig({
				dryRun: true
			}),
			repository
		});

		expect(repository.loadNasUserAliases).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001");
		expect(repository.loadProjectRoots).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001");
		expect(result.summary.stage).toBe("candidates_aggregated");
		expect(result.summary.total_logs_scanned).toBe(5);
		expect(result.summary.total_logs_accepted).toBe(5);
		expect(result.summary.total_logs_unmapped_users).toBe(1);
		expect(result.summary.total_logs_unmapped_projects).toBe(1);
		expect(result.summary.total_candidate_items).toBe(2);
	});

	it("writes run items with manual override skip and 480/N duration allocation", async () => {
		const repository: AutoTimeRunnerRepository = {
			createRun: vi.fn().mockResolvedValue({
				id: "run-101"
			}),
			finalizeRun: vi.fn().mockResolvedValue(undefined),
			loadIgnoreAccounts: vi.fn().mockResolvedValue([]),
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-201",
					file_path: "/Projects/A/concept/file-1.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-21T03:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-21T03:00:05.000Z"
				},
				{
					id: "log-202",
					file_path: "/Projects/B/model/file-2.psd",
					nas_username: "alice",
					action: "rename",
					detected_at: "2026-04-21T04:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-21T04:00:05.000Z"
				},
				{
					id: "log-202b",
					file_path: "/Unmapped/misc/file-2.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-21T05:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-21T05:00:05.000Z"
				},
				{
					id: "log-203",
					file_path: "/Projects/C/model/file-3.psd",
					nas_username: "longxiao",
					action: "write",
					detected_at: "2026-04-21T05:00:00.000Z",
					sa_ai_user_id: null,
					created_at: "2026-04-21T05:00:05.000Z"
				}
			]),
			loadNasUserAliases: vi.fn().mockResolvedValue([
				{
					nas_username: "longxiao",
					user_id: "user-002"
				}
			]),
			loadProjectRoots: vi.fn().mockResolvedValue([
				{
					id: "root-001",
					project_id: "project-001",
					root_path: "/Projects/A"
				},
				{
					id: "root-002",
					project_id: "project-002",
					root_path: "/Projects/B"
				},
				{
					id: "root-003",
					project_id: "project-003",
					root_path: "/Projects/C"
				}
			]),
			loadManualTaskUserIds: vi.fn().mockResolvedValue(["user-002"]),
			insertRunItems: vi.fn().mockImplementation(async (_runId, items) =>
				items.map((item: any, index: number) => ({
					id: `item-${index + 1}`,
					...item
				}))
			)
		};

		const result = await runAutoTimeCapture({
			config: createConfig(),
			repository
		});

		expect(repository.loadManualTaskUserIds).toHaveBeenCalledWith(
			"00000000-0000-0000-0000-000000000001",
			"2026-04-21"
		);
		expect(repository.insertRunItems).toHaveBeenCalledWith(
			"run-101",
			expect.arrayContaining([
				expect.objectContaining({
					user_id: "user-001",
					project_id: "project-001",
					resolution_status: "accepted",
					generated_duration_minutes: 240,
					source_event_count: 1,
					raw_last_activity_at: "2026-04-21T05:00:00.000Z",
					raw_total_minutes: 180,
					unattributed_minutes: 60,
					raw_project_minutes: 60,
					normalized_project_minutes: 240,
					allocation_method: "interval_to_previous_project",
					allocation_version: "stage_a_v1",
					allocation_meta: expect.objectContaining({
						diagnostic_normalized_project_minutes: 240,
						formal_generated_minutes: 240,
						formal_allocation_mode: "even_split",
						conservative_mode_hit: false,
						large_gap_hit: false
					})
				}),
				expect.objectContaining({
					user_id: "user-001",
					project_id: "project-002",
					resolution_status: "accepted",
					generated_duration_minutes: 240,
					source_event_count: 1,
					raw_last_activity_at: "2026-04-21T05:00:00.000Z",
					raw_total_minutes: 180,
					unattributed_minutes: 60,
					raw_project_minutes: 60,
					normalized_project_minutes: 240,
					allocation_method: "interval_to_previous_project",
					allocation_version: "stage_a_v1",
					allocation_meta: expect.objectContaining({
						diagnostic_normalized_project_minutes: 240,
						formal_generated_minutes: 240,
						formal_allocation_mode: "even_split",
						conservative_mode_hit: false,
						large_gap_hit: false
					})
				}),
				expect.objectContaining({
					user_id: "user-002",
					project_id: "project-003",
					resolution_status: "manual_override_skipped",
					generated_duration_minutes: null,
					source_event_count: 1,
					raw_last_activity_at: "2026-04-21T05:00:00.000Z",
					raw_total_minutes: 180,
					unattributed_minutes: 180,
					raw_project_minutes: 0,
					normalized_project_minutes: 0,
					allocation_method: "interval_to_previous_project",
					allocation_version: "stage_a_v1",
					allocation_meta: expect.objectContaining({
						diagnostic_normalized_project_minutes: 0,
						formal_generated_minutes: null,
						formal_allocation_mode: "even_split",
						conservative_mode_hit: false,
						large_gap_hit: false
					})
				})
			])
		);
		expect(repository.finalizeRun).toHaveBeenCalledWith(
			"run-101",
			"completed",
			expect.objectContaining({
				stage: "run_items_written",
				total_candidate_items: 3,
				total_run_items_written: 3,
				total_manual_override_items: 1,
				total_tasks_written: 0,
				formal_allocation_mode: "even_split",
				allocation_sample_rows: expect.arrayContaining([
					expect.objectContaining({
						user_id: "user-001",
						target_work_date: "2026-04-21",
						raw_last_activity_at: "2026-04-21T05:00:00.000Z",
						raw_total_minutes: 180,
						unattributed_minutes: 60,
						distinct_project_count: 2,
						large_gap_hit: false,
						conservative_mode_hit: false,
						projects: expect.arrayContaining([
							expect.objectContaining({
								project_id: "project-001",
								raw_project_minutes: 60,
								normalized_project_minutes: 240,
								formal_generated_minutes: 240
							})
						])
					})
				]),
				allocation_diagnostics: expect.arrayContaining([
					expect.objectContaining({
						user_id: "user-001",
						raw_last_activity_at: "2026-04-21T05:00:00.000Z",
						raw_total_minutes: 180,
						unattributed_minutes: 60,
						distinct_project_count: 2,
						attributed_total_minutes: 120,
						conservative_mode_hit: false,
						large_gap_hit: false,
						project_minutes: expect.arrayContaining([
							expect.objectContaining({
								project_id: "project-001",
								raw_project_minutes: 60,
								normalized_project_minutes: 240,
								formal_generated_minutes: 240
							})
						])
					})
				])
			})
		);
		expect(result.status).toBe("completed");
		expect(result.runId).toBe("run-101");
	});

	it("flags 3+ project days as conservative-mode diagnostics without changing current formal allocation", async () => {
		const repository: AutoTimeRunnerRepository = {
			createRun: vi.fn().mockResolvedValue({
				id: "run-301"
			}),
			finalizeRun: vi.fn().mockResolvedValue(undefined),
			loadIgnoreAccounts: vi.fn().mockResolvedValue([]),
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-401",
					file_path: "/Projects/A/file-1.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-21T03:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-21T03:00:05.000Z"
				},
				{
					id: "log-402",
					file_path: "/Projects/B/file-2.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-21T04:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-21T04:00:05.000Z"
				},
				{
					id: "log-403",
					file_path: "/Projects/C/file-3.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-21T05:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-21T05:00:05.000Z"
				}
			]),
			loadNasUserAliases: vi.fn().mockResolvedValue([]),
			loadProjectRoots: vi.fn().mockResolvedValue([
				{
					id: "root-001",
					project_id: "project-001",
					root_path: "/Projects/A"
				},
				{
					id: "root-002",
					project_id: "project-002",
					root_path: "/Projects/B"
				},
				{
					id: "root-003",
					project_id: "project-003",
					root_path: "/Projects/C"
				}
			]),
			loadManualTaskUserIds: vi.fn().mockResolvedValue([]),
			insertRunItems: vi.fn().mockImplementation(async (_runId, items) =>
				items.map((item: any, index: number) => ({
					id: `item-${index + 1}`,
					...item
				}))
			)
		};

		const result = await runAutoTimeCapture({
			config: createConfig(),
			repository
		});

		expect(repository.insertRunItems).toHaveBeenCalledWith(
			"run-301",
			expect.arrayContaining([
				expect.objectContaining({
					project_id: "project-001",
					generated_duration_minutes: 160,
					allocation_meta: expect.objectContaining({
						conservative_mode_hit: true,
						conservative_mode_reason: "distinct_project_count_gte_3",
						formal_allocation_mode: "even_split"
					})
				}),
				expect.objectContaining({
					project_id: "project-002",
					generated_duration_minutes: 160,
					allocation_meta: expect.objectContaining({
						conservative_mode_hit: true,
						conservative_mode_reason: "distinct_project_count_gte_3"
					})
				}),
				expect.objectContaining({
					project_id: "project-003",
					generated_duration_minutes: 160,
					allocation_meta: expect.objectContaining({
						conservative_mode_hit: true,
						conservative_mode_reason: "distinct_project_count_gte_3"
					})
				})
			])
		);
		expect(result.summary.allocation_diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					user_id: "user-001",
					distinct_project_count: 3,
					conservative_mode_hit: true,
					conservative_mode_reason: "distinct_project_count_gte_3",
					formal_write_skipped: false,
					formal_write_skip_reason: null
				})
			])
		);
	});

	it("writes formal split for 3+ project days when interval_to_previous_project mode is enabled", async () => {
		const repository: AutoTimeRunnerRepository = {
			createRun: vi.fn().mockResolvedValue({
				id: "run-302"
			}),
			finalizeRun: vi.fn().mockResolvedValue(undefined),
			loadIgnoreAccounts: vi.fn().mockResolvedValue([]),
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-501",
					file_path: "/Projects/A/file-1.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-21T03:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-21T03:00:05.000Z"
				},
				{
					id: "log-502",
					file_path: "/Projects/B/file-2.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-21T04:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-21T04:00:05.000Z"
				},
				{
					id: "log-503",
					file_path: "/Projects/C/file-3.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-21T05:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-21T05:00:05.000Z"
				},
				{
					id: "log-504",
					file_path: "/Unmapped/final-signal.txt",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-21T06:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-21T06:00:05.000Z"
				}
			]),
			loadNasUserAliases: vi.fn().mockResolvedValue([]),
			loadProjectRoots: vi.fn().mockResolvedValue([
				{
					id: "root-001",
					project_id: "project-001",
					root_path: "/Projects/A"
				},
				{
					id: "root-002",
					project_id: "project-002",
					root_path: "/Projects/B"
				},
				{
					id: "root-003",
					project_id: "project-003",
					root_path: "/Projects/C"
				}
			]),
			loadManualTaskUserIds: vi.fn().mockResolvedValue([]),
			loadExistingAutoTaskKeys: vi.fn().mockResolvedValue([]),
			insertRunItems: vi.fn().mockResolvedValue([
				{
					id: "item-501",
					org_id: "00000000-0000-0000-0000-000000000001",
					user_id: "user-001",
					project_id: "project-001",
					target_work_date: "2026-04-21",
					resolution_status: "accepted",
					generated_duration_minutes: 160
				},
				{
					id: "item-502",
					org_id: "00000000-0000-0000-0000-000000000001",
					user_id: "user-001",
					project_id: "project-002",
					target_work_date: "2026-04-21",
					resolution_status: "accepted",
					generated_duration_minutes: 160
				},
				{
					id: "item-503",
					org_id: "00000000-0000-0000-0000-000000000001",
					user_id: "user-001",
					project_id: "project-003",
					target_work_date: "2026-04-21",
					resolution_status: "accepted",
					generated_duration_minutes: 160
				}
			]),
			insertTasks: vi.fn().mockResolvedValue([
				{
					id: "task-501",
					source_item_id: "item-501"
				},
				{
					id: "task-502",
					source_item_id: "item-502"
				},
				{
					id: "task-503",
					source_item_id: "item-503"
				}
			]),
			linkGeneratedTasks: vi.fn().mockResolvedValue(undefined)
		};

		const result = await runAutoTimeCapture({
			config: createConfig({
				allocationMode: "interval_to_previous_project"
			}),
			repository
		});

		expect(repository.insertRunItems).toHaveBeenCalledWith(
			"run-302",
			expect.arrayContaining([
				expect.objectContaining({
					project_id: "project-001",
					resolution_status: "accepted",
					resolution_reason: null,
					generated_duration_minutes: 160,
					allocation_meta: expect.objectContaining({
						conservative_mode_hit: true,
						formal_write_skipped: false,
						formal_write_skip_reason: null,
						formal_allocation_mode: "interval_to_previous_project"
					})
				}),
				expect.objectContaining({
					project_id: "project-002",
					resolution_status: "accepted",
					generated_duration_minutes: 160
				}),
				expect.objectContaining({
					project_id: "project-003",
					resolution_status: "accepted",
					generated_duration_minutes: 160
				})
			])
		);
		expect(repository.insertTasks).toHaveBeenCalledWith(
			"run-302",
			expect.arrayContaining([
				expect.objectContaining({
					project_id: "project-001",
					duration_minutes: 160,
					work_date: "2026-04-21"
				}),
				expect.objectContaining({
					project_id: "project-002",
					duration_minutes: 160
				}),
				expect.objectContaining({
					project_id: "project-003",
					duration_minutes: 160
				})
			])
		);
		expect(result.summary.total_policy_guard_items).toBe(0);
		expect(result.summary.allocation_diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					user_id: "user-001",
					conservative_mode_hit: true,
					formal_write_skipped: false,
					formal_write_skip_reason: null,
					formal_allocation_mode: "interval_to_previous_project"
				})
			])
		);
	});

	it("writes tasks for accepted run items and links generated task ids back to run items", async () => {
		const repository: AutoTimeRunnerRepository = {
			createRun: vi.fn().mockResolvedValue({
				id: "run-201"
			}),
			finalizeRun: vi.fn().mockResolvedValue(undefined),
			loadIgnoreAccounts: vi.fn().mockResolvedValue([]),
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-301",
					file_path: "/Projects/A/concept/file-1.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-20T18:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-20T18:00:05.000Z"
				},
				{
					id: "log-302",
					file_path: "/Projects/B/model/file-2.psd",
					nas_username: "alice",
					action: "rename",
					detected_at: "2026-04-20T19:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-20T19:00:05.000Z"
				},
				{
					id: "log-303",
					file_path: "/Projects/C/model/file-3.psd",
					nas_username: "longxiao",
					action: "write",
					detected_at: "2026-04-20T20:00:00.000Z",
					sa_ai_user_id: null,
					created_at: "2026-04-20T20:00:05.000Z"
				}
			]),
			loadNasUserAliases: vi.fn().mockResolvedValue([
				{
					nas_username: "longxiao",
					user_id: "user-002"
				}
			]),
			loadProjectRoots: vi.fn().mockResolvedValue([
				{
					id: "root-001",
					project_id: "project-001",
					root_path: "/Projects/A"
				},
				{
					id: "root-002",
					project_id: "project-002",
					root_path: "/Projects/B"
				},
				{
					id: "root-003",
					project_id: "project-003",
					root_path: "/Projects/C"
				}
			]),
			loadManualTaskUserIds: vi.fn().mockResolvedValue(["user-002"]),
			loadExistingAutoTaskKeys: vi.fn().mockResolvedValue([]),
			insertRunItems: vi.fn().mockResolvedValue([
				{
					id: "item-001",
					org_id: "00000000-0000-0000-0000-000000000001",
					user_id: "user-001",
					project_id: "project-001",
					target_work_date: "2026-04-21",
					resolution_status: "accepted",
					generated_duration_minutes: 240
				},
				{
					id: "item-002",
					org_id: "00000000-0000-0000-0000-000000000001",
					user_id: "user-001",
					project_id: "project-002",
					target_work_date: "2026-04-21",
					resolution_status: "accepted",
					generated_duration_minutes: 240
				},
				{
					id: "item-003",
					org_id: "00000000-0000-0000-0000-000000000001",
					user_id: "user-002",
					project_id: "project-003",
					target_work_date: "2026-04-21",
					resolution_status: "manual_override_skipped",
					generated_duration_minutes: null
				}
			]),
			insertTasks: vi.fn().mockResolvedValue([
				{
					id: "task-001",
					source_item_id: "item-001"
				},
				{
					id: "task-002",
					source_item_id: "item-002"
				}
			]),
			linkGeneratedTasks: vi.fn().mockResolvedValue(undefined)
		};

		const result = await runAutoTimeCapture({
			config: createConfig(),
			repository
		});

		expect(repository.insertTasks).toHaveBeenCalledWith(
			"run-201",
			expect.arrayContaining([
				expect.objectContaining({
					org_id: "00000000-0000-0000-0000-000000000001",
					user_id: "user-001",
					project_id: "project-001",
					task_name: "NAS自动工时",
					work_date: "2026-04-21",
					duration_minutes: 240,
					entry_source: "nas_auto",
					source_run_id: "run-201",
					source_item_id: "item-001"
				}),
				expect.objectContaining({
					project_id: "project-002",
					duration_minutes: 240,
					source_item_id: "item-002"
				})
			])
		);
		expect(repository.linkGeneratedTasks).toHaveBeenCalledWith(
			expect.arrayContaining([
				{
					run_item_id: "item-001",
					generated_task_id: "task-001"
				},
				{
					run_item_id: "item-002",
					generated_task_id: "task-002"
				}
			])
		);
		expect(repository.finalizeRun).toHaveBeenCalledWith(
			"run-201",
			"completed",
			expect.objectContaining({
				stage: "tasks_written",
				total_run_items_written: 3,
				total_manual_override_items: 1,
				total_tasks_written: 2
			})
		);
	expect(result.status).toBe("completed");
	expect(result.runId).toBe("run-201");
	});

	it("does not write duplicate nas_auto tasks when the target work date already has auto-generated entries", async () => {
		const repository: AutoTimeRunnerRepository = {
			createRun: vi.fn().mockResolvedValue({
				id: "run-301"
			}),
			finalizeRun: vi.fn().mockResolvedValue(undefined),
			loadIgnoreAccounts: vi.fn().mockResolvedValue([]),
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-401",
					file_path: "/Projects/A/concept/file-1.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-20T18:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-20T18:00:05.000Z"
				}
			]),
			loadNasUserAliases: vi.fn().mockResolvedValue([]),
			loadProjectRoots: vi.fn().mockResolvedValue([
				{
					id: "root-001",
					project_id: "project-001",
					root_path: "/Projects/A"
				}
			]),
			loadManualTaskUserIds: vi.fn().mockResolvedValue([]),
			loadExistingAutoTaskKeys: vi.fn().mockResolvedValue([
				"user-001|project-001|2026-04-21"
			]),
			insertRunItems: vi.fn().mockResolvedValue([
				{
					id: "item-101",
					user_id: "user-001",
					project_id: "project-001",
					target_work_date: "2026-04-21",
					resolution_status: "accepted",
					generated_duration_minutes: 480
				}
			]),
			insertTasks: vi.fn().mockResolvedValue([]),
			linkGeneratedTasks: vi.fn().mockResolvedValue(undefined)
		};

		const result = await runAutoTimeCapture({
			config: createConfig(),
			repository
		});

		expect(repository.loadExistingAutoTaskKeys).toHaveBeenCalledWith(
			"00000000-0000-0000-0000-000000000001",
			"2026-04-21"
		);
		expect(repository.insertTasks).not.toHaveBeenCalled();
		expect(repository.linkGeneratedTasks).not.toHaveBeenCalled();
		expect(repository.finalizeRun).toHaveBeenCalledWith(
			"run-301",
			"completed",
			expect.objectContaining({
				stage: "run_items_written",
				total_existing_auto_tasks_skipped: 1,
				total_tasks_written: 0
			})
		);
		expect(result.status).toBe("completed");
		expect(result.runId).toBe("run-301");
	});

	it("clears existing nas_auto tasks before writing fresh tasks in rebuild mode", async () => {
		const repository: AutoTimeRunnerRepository = {
			createRun: vi.fn().mockResolvedValue({
				id: "run-rebuild-001"
			}),
			finalizeRun: vi.fn().mockResolvedValue(undefined),
			loadIgnoreAccounts: vi.fn().mockResolvedValue([]),
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-rebuild-001",
					file_path: "/Projects/A/concept/file-1.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-20T18:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-20T18:00:05.000Z"
				}
			]),
			loadNasUserAliases: vi.fn().mockResolvedValue([]),
			loadProjectRoots: vi.fn().mockResolvedValue([
				{
					id: "root-001",
					project_id: "project-001",
					root_path: "/Projects/A"
				}
			]),
			loadManualTaskUserIds: vi.fn().mockResolvedValue([]),
			loadExistingAutoTaskKeys: vi.fn().mockResolvedValue([
				"user-001|project-001|2026-04-21"
			]),
			deleteExistingAutoTasks: vi.fn().mockResolvedValue(["old-task-001"]),
			insertRunItems: vi.fn().mockResolvedValue([
				{
					id: "item-rebuild-001",
					org_id: "00000000-0000-0000-0000-000000000001",
					user_id: "user-001",
					project_id: "project-001",
					target_work_date: "2026-04-21",
					resolution_status: "accepted",
					generated_duration_minutes: 480
				}
			]),
			insertTasks: vi.fn().mockResolvedValue([
				{
					id: "task-rebuild-001",
					source_item_id: "item-rebuild-001"
				}
			]),
			linkGeneratedTasks: vi.fn().mockResolvedValue(undefined)
		};

		const result = await runAutoTimeCapture({
			config: createConfig({
				rebuildNasAuto: true
			}),
			repository
		});

		expect(repository.deleteExistingAutoTasks).toHaveBeenCalledWith(
			"00000000-0000-0000-0000-000000000001",
			"2026-04-21"
		);
		expect(repository.loadExistingAutoTaskKeys).not.toHaveBeenCalled();
		expect(repository.insertTasks).toHaveBeenCalledWith(
			"run-rebuild-001",
			[
				expect.objectContaining({
					source_item_id: "item-rebuild-001",
					duration_minutes: 480
				})
			]
		);
		expect(repository.finalizeRun).toHaveBeenCalledWith(
			"run-rebuild-001",
			"completed",
			expect.objectContaining({
				rebuild_nas_auto: true,
				total_existing_auto_tasks_deleted: 1,
				total_existing_auto_tasks_skipped: 0,
				total_tasks_written: 1
			})
		);
		expect(result.status).toBe("completed");
	});

	it("does not write zero-minute nas_auto tasks", async () => {
		const repository: AutoTimeRunnerRepository = {
			createRun: vi.fn().mockResolvedValue({
				id: "run-302"
			}),
			finalizeRun: vi.fn().mockResolvedValue(undefined),
			loadIgnoreAccounts: vi.fn().mockResolvedValue([]),
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-402",
					file_path: "/Projects/A/concept/file-1.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-20T18:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-20T18:00:05.000Z"
				}
			]),
			loadNasUserAliases: vi.fn().mockResolvedValue([]),
			loadProjectRoots: vi.fn().mockResolvedValue([
				{
					id: "root-001",
					project_id: "project-001",
					root_path: "/Projects/A"
				},
				{
					id: "root-002",
					project_id: "project-002",
					root_path: "/Projects/B"
				}
			]),
			loadManualTaskUserIds: vi.fn().mockResolvedValue([]),
			loadExistingAutoTaskKeys: vi.fn().mockResolvedValue([]),
			insertRunItems: vi.fn().mockResolvedValue([
				{
					id: "item-201",
					org_id: "00000000-0000-0000-0000-000000000001",
					user_id: "user-001",
					project_id: "project-001",
					target_work_date: "2026-04-21",
					resolution_status: "accepted",
					generated_duration_minutes: 480
				},
				{
					id: "item-202",
					org_id: "00000000-0000-0000-0000-000000000001",
					user_id: "user-001",
					project_id: "project-002",
					target_work_date: "2026-04-21",
					resolution_status: "accepted",
					generated_duration_minutes: 0
				}
			]),
			insertTasks: vi.fn().mockResolvedValue([
				{
					id: "task-201",
					source_item_id: "item-201"
				}
			]),
			linkGeneratedTasks: vi.fn().mockResolvedValue(undefined)
		};

		const result = await runAutoTimeCapture({
			config: createConfig(),
			repository
		});

		expect(repository.insertTasks).toHaveBeenCalledWith(
			"run-302",
			[
				expect.objectContaining({
					project_id: "project-001",
					duration_minutes: 480,
					source_item_id: "item-201"
				})
			]
		);
		expect(repository.linkGeneratedTasks).toHaveBeenCalledWith([
			{
				run_item_id: "item-201",
				generated_task_id: "task-201"
			}
		]);
		expect(repository.finalizeRun).toHaveBeenCalledWith(
			"run-302",
			"completed",
			expect.objectContaining({
				stage: "tasks_written",
				total_run_items_written: 2,
				total_tasks_written: 1
			})
		);
		expect(result.status).toBe("completed");
		expect(result.runId).toBe("run-302");
	});

	it("finalizes the run as failed when run item insertion throws", async () => {
		const repository: AutoTimeRunnerRepository = {
			createRun: vi.fn().mockResolvedValue({
				id: "run-401"
			}),
			finalizeRun: vi.fn().mockResolvedValue(undefined),
			loadIgnoreAccounts: vi.fn().mockResolvedValue([]),
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-501",
					file_path: "/Projects/A/concept/file-1.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-20T18:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-20T18:00:05.000Z"
				}
			]),
			loadNasUserAliases: vi.fn().mockResolvedValue([]),
			loadProjectRoots: vi.fn().mockResolvedValue([
				{
					id: "root-001",
					project_id: "project-001",
					root_path: "/Projects/A"
				}
			]),
			loadManualTaskUserIds: vi.fn().mockResolvedValue([]),
			insertRunItems: vi.fn().mockRejectedValue(new Error("boom"))
		};

		await expect(
			runAutoTimeCapture({
				config: createConfig(),
				repository
			})
		).rejects.toThrow("boom");

		expect(repository.createRun).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "running",
				target_work_date: "2026-04-21"
			})
		);
		expect(repository.finalizeRun).toHaveBeenCalledWith(
			"run-401",
			"failed",
			expect.objectContaining({
				stage: "candidates_aggregated",
				total_candidate_items: 1
			}),
			"boom"
		);
	});
});
