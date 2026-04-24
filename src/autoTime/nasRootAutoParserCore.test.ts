import { describe, expect, it, vi } from "vitest";
import {
	runNasRootAutoParser,
	type NasRootAutoParserConfig,
	type NasRootAutoParserRepository
} from "../../scripts/asset-log-time-capture/nasRootAutoParserCore";

const createConfig = (overrides: Partial<NasRootAutoParserConfig> = {}): NasRootAutoParserConfig => ({
	orgId: "00000000-0000-0000-0000-000000000001",
	supabaseUrl: "https://example.supabase.co",
	supabaseServiceRoleKey: "service-role-key",
	sourceTable: "public.asset_version_log",
	targetWorkDate: "2026-04-22",
	timezone: "Asia/Shanghai",
	dryRun: false,
	actions: ["create", "write", "rename", "delete"],
	lookbackDays: 7,
	...overrides
});

describe("nas root auto parser core", () => {
	it("auto creates a missing active project, inserts its root, and records audit actions", async () => {
		const repository: NasRootAutoParserRepository = {
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-auto-project-001",
					file_path: "/daga-2025-project/CONCEPT/C20260413_友谊商店二期/02-2D/file-1.psd",
					nas_username: "juzhijianqiang",
					action: "write",
					detected_at: "2026-04-23T07:52:57.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-23T07:53:00.000Z"
				},
				{
					id: "log-auto-project-002",
					file_path: "/daga-2025-project/CONCEPT/C20260413_友谊商店二期/04-PRESENTATION/file-2.indd",
					nas_username: "juzhijianqiang",
					action: "write",
					detected_at: "2026-04-23T10:33:04.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-23T10:33:06.000Z"
				}
			]),
			loadIgnoreAccounts: vi.fn().mockResolvedValue([]),
			loadProjectRoots: vi.fn().mockResolvedValue([]),
			loadProjects: vi.fn().mockResolvedValue([]),
			createProjects: vi.fn().mockResolvedValue([
				{
					id: "project-auto-001",
					name: "友谊商店二期",
					source_project_code: "C20260413",
					status: "active"
				}
			]),
			insertProjectRoots: vi.fn().mockResolvedValue([
				{
					id: "root-auto-001",
					project_id: "project-auto-001",
					root_path: "/daga-2025-project/CONCEPT/C20260413_友谊商店二期"
				}
			]),
			insertProjectActions: vi.fn().mockResolvedValue(undefined),
			upsertProjectRootCandidates: vi.fn().mockResolvedValue(undefined)
		};

		const result = await runNasRootAutoParser({
			config: createConfig(),
			repository
		});

		expect(repository.createProjects).toHaveBeenCalledWith([
			expect.objectContaining({
				org_id: "00000000-0000-0000-0000-000000000001",
				name: "友谊商店二期",
				source_project_code: "C20260413",
				status: "active"
			})
		]);
		expect(repository.insertProjectRoots).toHaveBeenCalledWith([
			expect.objectContaining({
				project_id: "project-auto-001",
				root_path: "/daga-2025-project/CONCEPT/C20260413_友谊商店二期"
			})
		]);
		expect(repository.insertProjectActions).toHaveBeenCalledWith(expect.arrayContaining([
			expect.objectContaining({
				action_type: "auto_create_project",
				action_status: "completed",
				project_id: "project-auto-001",
				candidate_root_path: "/daga-2025-project/CONCEPT/C20260413_友谊商店二期"
			}),
			expect.objectContaining({
				action_type: "auto_insert_root",
				action_status: "completed",
				project_id: "project-auto-001",
				project_root_id: "root-auto-001"
			})
		]));
		expect(repository.upsertProjectRootCandidates).toHaveBeenCalledWith([
			expect.objectContaining({
				candidate_root_path: "/daga-2025-project/CONCEPT/C20260413_友谊商店二期",
				parsed_project_code: "C20260413",
				parsed_project_name: "友谊商店二期",
				candidate_status: "auto_project_created",
				matched_project_id: "project-auto-001",
				promoted_root_id: "root-auto-001",
				sample_log_count: 2
			})
		]);
		expect(result.summary).toEqual(expect.objectContaining({
			stage: "project_roots_updated",
			total_auto_created_projects: 1,
			total_auto_inserted_roots: 1,
			total_missing_project_master_roots: 0
		}));
	});

	it("rejects non-project roots by rule instead of auto creating active projects", async () => {
		const repository: NasRootAutoParserRepository = {
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-reject-001",
					file_path: "/daga-2025-project/server-backup/dump.sql",
					nas_username: "ops",
					action: "write",
					detected_at: "2026-04-22T02:00:00.000Z",
					sa_ai_user_id: "user-ops",
					created_at: "2026-04-22T02:00:05.000Z"
				},
				{
					id: "log-reject-002",
					file_path: "/daga-2025-project/CONCEPT/000000-项目梳理/file.md",
					nas_username: "ops",
					action: "write",
					detected_at: "2026-04-22T03:00:00.000Z",
					sa_ai_user_id: "user-ops",
					created_at: "2026-04-22T03:00:05.000Z"
				}
			]),
			loadIgnoreAccounts: vi.fn().mockResolvedValue([]),
			loadProjectRoots: vi.fn().mockResolvedValue([]),
			loadProjects: vi.fn().mockResolvedValue([]),
			createProjects: vi.fn().mockResolvedValue([]),
			insertProjectRoots: vi.fn().mockResolvedValue([]),
			insertProjectActions: vi.fn().mockResolvedValue(undefined),
			upsertProjectRootCandidates: vi.fn().mockResolvedValue(undefined)
		};

		const result = await runNasRootAutoParser({
			config: createConfig(),
			repository
		});

		expect(repository.createProjects).not.toHaveBeenCalled();
		expect(repository.insertProjectRoots).not.toHaveBeenCalled();
		expect(repository.upsertProjectRootCandidates).toHaveBeenCalledWith(expect.arrayContaining([
			expect.objectContaining({
				candidate_root_path: "/daga-2025-project/server-backup",
				candidate_status: "rejected_by_rule",
				notes: "candidate root rejected by auto-create guard"
			}),
			expect.objectContaining({
				candidate_root_path: "/daga-2025-project/CONCEPT/000000-项目梳理",
				candidate_status: "rejected_by_rule",
				notes: "candidate root rejected by auto-create guard"
			})
		]));
		expect(result.summary).toEqual(expect.objectContaining({
			total_rejected_roots: 2,
			total_auto_created_projects: 0
		}));
	});

	it("marks duplicate source project codes as conflicts without creating projects or roots", async () => {
		const repository: NasRootAutoParserRepository = {
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-conflict-001",
					file_path: "/daga-2025-project/D0489_北京鲲熙汇PARK书店/file.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-22T02:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-22T02:00:05.000Z"
				}
			]),
			loadIgnoreAccounts: vi.fn().mockResolvedValue([]),
			loadProjectRoots: vi.fn().mockResolvedValue([]),
			loadProjects: vi.fn().mockResolvedValue([
				{
					id: "project-001",
					name: "北京鲲熙汇PARK书店 A",
					source_project_code: "D0489",
					status: "active"
				},
				{
					id: "project-002",
					name: "北京鲲熙汇PARK书店 B",
					source_project_code: "D0489",
					status: "active"
				}
			]),
			createProjects: vi.fn().mockResolvedValue([]),
			insertProjectRoots: vi.fn().mockResolvedValue([]),
			insertProjectActions: vi.fn().mockResolvedValue(undefined),
			upsertProjectRootCandidates: vi.fn().mockResolvedValue(undefined)
		};

		const result = await runNasRootAutoParser({
			config: createConfig(),
			repository
		});

		expect(repository.createProjects).not.toHaveBeenCalled();
		expect(repository.insertProjectRoots).not.toHaveBeenCalled();
		expect(repository.upsertProjectRootCandidates).toHaveBeenCalledWith([
			expect.objectContaining({
				candidate_root_path: "/daga-2025-project/D0489_北京鲲熙汇PARK书店",
				candidate_status: "conflict_needs_manual_fix",
				match_method: "code_exact",
				matched_project_id: null,
				notes: "source_project_code D0489 matched multiple active projects"
			})
		]);
		expect(result.summary).toEqual(expect.objectContaining({
			total_conflict_roots: 1,
			total_auto_created_projects: 0,
			total_auto_inserted_roots: 0
		}));
	});

	it("marks duplicate missing-project candidates in the same batch as conflicts", async () => {
		const repository: NasRootAutoParserRepository = {
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-batch-conflict-001",
					file_path: "/daga-2025-project/CONCEPT/C20260415_西单商场/file.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-22T02:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-22T02:00:05.000Z"
				},
				{
					id: "log-batch-conflict-002",
					file_path: "/daga-2025-project/CONCEPT/C20260415_泰达金二地块/file.psd",
					nas_username: "bob",
					action: "write",
					detected_at: "2026-04-22T03:00:00.000Z",
					sa_ai_user_id: "user-002",
					created_at: "2026-04-22T03:00:05.000Z"
				}
			]),
			loadIgnoreAccounts: vi.fn().mockResolvedValue([]),
			loadProjectRoots: vi.fn().mockResolvedValue([]),
			loadProjects: vi.fn().mockResolvedValue([]),
			createProjects: vi.fn().mockResolvedValue([]),
			insertProjectRoots: vi.fn().mockResolvedValue([]),
			insertProjectActions: vi.fn().mockResolvedValue(undefined),
			upsertProjectRootCandidates: vi.fn().mockResolvedValue(undefined)
		};

		const result = await runNasRootAutoParser({
			config: createConfig(),
			repository
		});

		expect(repository.createProjects).not.toHaveBeenCalled();
		expect(repository.insertProjectRoots).not.toHaveBeenCalled();
		expect(repository.upsertProjectRootCandidates).toHaveBeenCalledWith(expect.arrayContaining([
			expect.objectContaining({
				parsed_project_code: "C20260415",
				candidate_status: "conflict_needs_manual_fix",
				notes: "source_project_code C20260415 appears in multiple new NAS candidates"
			})
		]));
		expect(result.summary).toEqual(expect.objectContaining({
			total_conflict_roots: 2,
			total_auto_created_projects: 0
		}));
	});

	it("auto inserts candidate roots when source_project_code matches exactly once", async () => {
		const repository: NasRootAutoParserRepository = {
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-001",
					file_path: "/daga-2025-project/CONCEPT/C20260104-成都王府井/方案/file-1.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-22T01:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-22T01:00:05.000Z"
				},
				{
					id: "log-002",
					file_path: "/daga-2025-project/CONCEPT/C20260104-成都王府井/模型/file-2.psd",
					nas_username: "alice",
					action: "rename",
					detected_at: "2026-04-22T02:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-22T02:00:05.000Z"
				},
				{
					id: "log-003",
					file_path: "/daga-2025-project/D0490_青岛麦岛站/效果图/file-3.psd",
					nas_username: "bob",
					action: "write",
					detected_at: "2026-04-21T08:00:00.000Z",
					sa_ai_user_id: null,
					created_at: "2026-04-21T08:00:05.000Z"
				}
			]),
			loadIgnoreAccounts: vi.fn().mockResolvedValue(["wenshunhe"]),
			loadProjectRoots: vi.fn().mockResolvedValue([
				{
					id: "root-existing",
					project_id: "project-existing",
					root_path: "/daga-2025-project/D0473_办公室"
				}
			]),
			loadProjects: vi.fn().mockResolvedValue([
				{
					id: "project-001",
					name: "成都王府井",
					source_project_code: "C20260104",
					status: "active"
				},
				{
					id: "project-002",
					name: "青岛麦岛站",
					source_project_code: "D0490",
					status: "active"
				}
			]),
			insertProjectRoots: vi.fn().mockImplementation(async (items: any[]) =>
				items.map((item, index) => ({
					id: `root-new-${index + 1}`,
					project_id: item.project_id,
					root_path: item.root_path
				}))
			),
			upsertProjectRootCandidates: vi.fn().mockResolvedValue(undefined)
		};

		const result = await runNasRootAutoParser({
			config: createConfig(),
			repository
		});

		expect(repository.loadAssetLogs).toHaveBeenCalledWith(
			expect.objectContaining({
				sourceTable: "public.asset_version_log",
				rangeStartIso: "2026-04-14T16:00:00.000Z",
				rangeEndIso: "2026-04-22T16:00:00.000Z",
				actions: ["create", "write", "rename", "delete"]
			})
		);
		expect(repository.insertProjectRoots).toHaveBeenCalledWith([
			expect.objectContaining({
				project_id: "project-001",
				root_path: "/daga-2025-project/CONCEPT/C20260104-成都王府井"
			}),
			expect.objectContaining({
				project_id: "project-002",
				root_path: "/daga-2025-project/D0490_青岛麦岛站"
			})
		]);
		expect(repository.upsertProjectRootCandidates).toHaveBeenCalledWith([
			expect.objectContaining({
				candidate_root_path: "/daga-2025-project/CONCEPT/C20260104-成都王府井",
				parsed_project_code: "C20260104",
				candidate_status: "auto_inserted",
				match_method: "code_exact",
				matched_project_id: "project-001",
				promoted_root_id: "root-new-1",
				sample_log_count: 2
			}),
			expect.objectContaining({
				candidate_root_path: "/daga-2025-project/D0490_青岛麦岛站",
				parsed_project_code: "D0490",
				candidate_status: "auto_inserted",
				match_method: "code_exact",
				matched_project_id: "project-002",
				promoted_root_id: "root-new-2",
				sample_log_count: 1
			})
		]);
		expect(result.summary).toEqual(expect.objectContaining({
			stage: "project_roots_updated",
			total_logs_scanned: 3,
			total_logs_accepted: 3,
			total_existing_project_hits: 0,
			total_candidate_roots: 2,
			total_auto_inserted_roots: 2,
			total_pending_review_roots: 0,
			total_missing_project_master_roots: 0
		}));
	});

	it("keeps name-only matches and missing project master rows in candidates without inserting roots", async () => {
		const repository: NasRootAutoParserRepository = {
			loadAssetLogs: vi.fn().mockResolvedValue([
				{
					id: "log-101",
					file_path: "/daga-2025-project/上德中心/方案/file-1.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-22T01:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-22T01:00:05.000Z"
				},
				{
					id: "log-102",
					file_path: "/daga-2025-project/C20260413_友谊商店二期/效果图/file-2.psd",
					nas_username: "alice",
					action: "write",
					detected_at: "2026-04-22T02:00:00.000Z",
					sa_ai_user_id: "user-001",
					created_at: "2026-04-22T02:00:05.000Z"
				}
			]),
			loadIgnoreAccounts: vi.fn().mockResolvedValue([]),
			loadProjectRoots: vi.fn().mockResolvedValue([]),
			loadProjects: vi.fn().mockResolvedValue([
				{
					id: "project-301",
					name: "上德中心",
					source_project_code: null,
					status: "active"
				}
			]),
			insertProjectRoots: vi.fn().mockResolvedValue([]),
			upsertProjectRootCandidates: vi.fn().mockResolvedValue(undefined)
		};

		const result = await runNasRootAutoParser({
			config: createConfig(),
			repository
		});

		expect(repository.insertProjectRoots).not.toHaveBeenCalled();
		expect(repository.upsertProjectRootCandidates).toHaveBeenCalledWith(expect.arrayContaining([
			expect.objectContaining({
				candidate_root_path: "/daga-2025-project/上德中心",
				parsed_project_code: null,
				parsed_project_name: "上德中心",
				candidate_status: "pending_review",
				match_method: "name_exact",
				matched_project_id: "project-301",
				promoted_root_id: null
			}),
			expect.objectContaining({
				candidate_root_path: "/daga-2025-project/C20260413_友谊商店二期",
				parsed_project_code: "C20260413",
				parsed_project_name: "友谊商店二期",
				candidate_status: "missing_project_master",
				match_method: "none",
				matched_project_id: null,
				promoted_root_id: null
			})
		]));
		expect(result.summary).toEqual(expect.objectContaining({
			stage: "candidates_persisted",
			total_candidate_roots: 2,
			total_auto_inserted_roots: 0,
			total_pending_review_roots: 1,
			total_missing_project_master_roots: 1
		}));
	});
});
