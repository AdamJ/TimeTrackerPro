import { createClient } from "@supabase/supabase-js";
import type {
	AutoTimeGeneratedTaskLink,
	AutoTimeInsertedTask,
	AutoTimeNasUserAlias,
	AutoTimePersistedRunItem,
	AutoTimeProjectRoot,
	AutoTimeRunItemInsert,
	AutoTimeRunnerRepository,
	AutoTimeTaskInsert,
	AutoTimeRunRow,
	AutoTimeRunStatus
} from "./core.ts";
import type { AutoTimeDailyHealthReport } from "./healthReportCore.ts";
import type {
	NasRootProjectActionInsert,
	NasRootAutoParserRepository,
	NasRootProjectInsert,
	NasRootProjectRecord,
	NasRootProjectRootCandidateUpsert,
	NasRootProjectRootInsert
} from "./nasRootAutoParserCore.ts";
import { createLoadAssetLogs } from "./loadAssetLogs.ts";

export const createRepository = (
	supabaseUrl: string,
	supabaseServiceRoleKey: string
): AutoTimeRunnerRepository & NasRootAutoParserRepository & {
	insertDailyHealthReport: (report: AutoTimeDailyHealthReport) => Promise<void>;
} => {
	const client = createClient(supabaseUrl, supabaseServiceRoleKey);
	const timeTracker = client.schema("time_tracker");
	const loadAssetLogs = createLoadAssetLogs(client);

	return {
		loadAssetLogs,
		loadIgnoreAccounts: async (orgId: string) => {
			const { data, error } = await timeTracker
				.from("auto_time_ignore_accounts")
				.select("nas_username")
				.eq("is_active", true)
				.or(`org_id.eq.${orgId},org_id.is.null`);

			if (error) {
				throw new Error(`Failed to load auto_time_ignore_accounts: ${error.message}`);
			}

			return (data ?? [])
				.map((row) => row.nas_username as string)
				.filter(Boolean);
		},
		loadNasUserAliases: async (orgId: string): Promise<AutoTimeNasUserAlias[]> => {
			const { data, error } = await timeTracker
				.from("nas_user_aliases")
				.select("nas_username,user_id")
				.eq("org_id", orgId)
				.eq("is_active", true);

			if (error) {
				throw new Error(`Failed to load nas_user_aliases: ${error.message}`);
			}

			return (data ?? []) as AutoTimeNasUserAlias[];
		},
		loadProjectRoots: async (orgId: string): Promise<AutoTimeProjectRoot[]> => {
			const { data, error } = await timeTracker
				.from("project_nas_roots")
				.select("id,project_id,root_path")
				.eq("org_id", orgId)
				.eq("is_active", true);

			if (error) {
				throw new Error(`Failed to load project_nas_roots: ${error.message}`);
			}

			return (data ?? []) as AutoTimeProjectRoot[];
		},
		loadProjects: async (orgId: string): Promise<NasRootProjectRecord[]> => {
			const { data, error } = await timeTracker
				.from("projects")
				.select("id,name,source_project_code,status")
				.eq("org_id", orgId)
				.eq("status", "active");

			if (error) {
				throw new Error(`Failed to load projects: ${error.message}`);
			}

			return (data ?? []) as NasRootProjectRecord[];
		},
		createProjects: async (items: NasRootProjectInsert[]): Promise<NasRootProjectRecord[]> => {
			if (items.length === 0) {
				return [];
			}

			const payload = items.map((item) => ({
				org_id: item.org_id,
				name: item.name,
				source_project_code: item.source_project_code,
				status: item.status,
				contract_amount: 0,
				human_cost_budget: 0
			}));
			const { data, error } = await timeTracker
				.from("projects")
				.insert(payload)
				.select("id,name,source_project_code,status");

			if (error) {
				throw new Error(`Failed to auto create projects: ${error.message}`);
			}

			return (data ?? []) as NasRootProjectRecord[];
		},
		insertProjectRoots: async (items: NasRootProjectRootInsert[]): Promise<AutoTimeProjectRoot[]> => {
			if (items.length === 0) {
				return [];
			}

			const payload = items.map((item) => ({
				org_id: item.org_id,
				project_id: item.project_id,
				root_path: item.root_path,
				notes: item.notes,
				is_active: true
			}));
			const { data, error } = await timeTracker
				.from("project_nas_roots")
				.insert(payload)
				.select("id,project_id,root_path");

			if (error) {
				throw new Error(`Failed to insert project_nas_roots: ${error.message}`);
			}

			return (data ?? []) as AutoTimeProjectRoot[];
		},
		upsertProjectRootCandidates: async (items: NasRootProjectRootCandidateUpsert[]) => {
			if (items.length === 0) {
				return;
			}

			const payload = items.map((item) => ({
				org_id: item.org_id,
				candidate_root_path: item.candidate_root_path,
				normalized_root_path: item.normalized_root_path,
				parsed_project_code: item.parsed_project_code,
				parsed_project_name: item.parsed_project_name,
				matched_project_id: item.matched_project_id,
				match_method: item.match_method,
				confidence_score: item.confidence_score,
				candidate_status: item.candidate_status,
				sample_log_count: item.sample_log_count,
				first_seen_at: item.first_seen_at,
				last_seen_at: item.last_seen_at,
				sample_paths: item.sample_paths,
				promoted_root_id: item.promoted_root_id,
				notes: item.notes
			}));
			const { error } = await timeTracker
				.from("auto_time_project_root_candidates")
				.upsert(payload, {
					onConflict: "org_id,normalized_root_path"
				});

			if (error) {
				throw new Error(`Failed to upsert auto_time_project_root_candidates: ${error.message}`);
			}
		},
		insertProjectActions: async (items: NasRootProjectActionInsert[]) => {
			if (items.length === 0) {
				return;
			}

			const payload = items.map((item) => ({
				org_id: item.org_id,
				target_work_date: item.target_work_date,
				candidate_root_path: item.candidate_root_path,
				parsed_project_code: item.parsed_project_code,
				parsed_project_name: item.parsed_project_name,
				action_type: item.action_type,
				action_status: item.action_status,
				project_id: item.project_id,
				project_root_id: item.project_root_id,
				run_id: item.run_id,
				rebuild_target_work_date: item.rebuild_target_work_date,
				reason: item.reason,
				metadata: item.metadata
			}));
			const { error } = await timeTracker
				.from("auto_time_project_actions")
				.insert(payload);

			if (error) {
				throw new Error(`Failed to insert auto_time_project_actions: ${error.message}`);
			}
		},
		loadManualTaskUserIds: async (orgId: string, targetWorkDate: string): Promise<string[]> => {
			const { data, error } = await timeTracker
				.from("tasks")
				.select("user_id")
				.eq("org_id", orgId)
				.eq("work_date", targetWorkDate)
				.eq("entry_source", "manual");

			if (error) {
				throw new Error(`Failed to load manual tasks: ${error.message}`);
			}

			return Array.from(new Set((data ?? []).map((row) => row.user_id as string).filter(Boolean)));
		},
		loadExistingAutoTaskKeys: async (orgId: string, targetWorkDate: string): Promise<string[]> => {
			const { data, error } = await timeTracker
				.from("tasks")
				.select("user_id,project_id,work_date")
				.eq("org_id", orgId)
				.eq("work_date", targetWorkDate)
				.eq("entry_source", "nas_auto");

			if (error) {
				throw new Error(`Failed to load existing auto tasks: ${error.message}`);
			}

			return Array.from(new Set(
				(data ?? [])
					.map((row) => {
						const userId = row.user_id as string | null;
						const projectId = row.project_id as string | null;
						const workDate = row.work_date as string | null;
						return userId && projectId && workDate ? `${userId}|${projectId}|${workDate}` : null;
					})
					.filter(Boolean) as string[]
			));
		},
		deleteExistingAutoTasks: async (orgId: string, targetWorkDate: string): Promise<string[]> => {
			const { data: existingRows, error: selectError } = await timeTracker
				.from("tasks")
				.select("id")
				.eq("org_id", orgId)
				.eq("work_date", targetWorkDate)
				.eq("entry_source", "nas_auto");

			if (selectError) {
				throw new Error(`Failed to load existing nas_auto tasks for rebuild: ${selectError.message}`);
			}

			const taskIds = (existingRows ?? [])
				.map((row) => row.id as string | null)
				.filter(Boolean) as string[];

			if (taskIds.length === 0) {
				return [];
			}

			const { error: deleteError } = await timeTracker
				.from("tasks")
				.delete()
				.in("id", taskIds);

			if (deleteError) {
				throw new Error(`Failed to delete existing nas_auto tasks for rebuild: ${deleteError.message}`);
			}

			return taskIds;
		},
		insertRunItems: async (runId: string, items: AutoTimeRunItemInsert[]): Promise<AutoTimePersistedRunItem[]> => {
			if (items.length === 0) {
				return [];
			}

			const payload = items.map((item) => ({
				run_id: runId,
				...item
			}));
			const { data, error } = await timeTracker
				.from("auto_time_run_items")
				.insert(payload)
				.select("id,org_id,target_work_date,nas_username,user_id,project_id,project_root_id,source_event_count,source_event_ids,source_paths,first_detected_at,last_detected_at,raw_first_activity_at,raw_last_activity_at,raw_total_minutes,unattributed_minutes,raw_project_minutes,normalized_project_minutes,allocation_method,allocation_version,allocation_meta,resolution_status,resolution_reason,generated_duration_minutes,metadata");

			if (error) {
				throw new Error(`Failed to insert auto_time_run_items: ${error.message}`);
			}

			return (data ?? []) as AutoTimePersistedRunItem[];
		},
		insertTasks: async (_runId: string, tasks: AutoTimeTaskInsert[]): Promise<AutoTimeInsertedTask[]> => {
			if (tasks.length === 0) {
				return [];
			}

			const { data, error } = await timeTracker
				.from("tasks")
				.insert(tasks)
				.select("id,source_item_id");

			if (error) {
				throw new Error(`Failed to insert tasks: ${error.message}`);
			}

			return (data ?? []) as AutoTimeInsertedTask[];
		},
		linkGeneratedTasks: async (links: AutoTimeGeneratedTaskLink[]) => {
			for (const link of links) {
				const { error } = await timeTracker
					.from("auto_time_run_items")
					.update({
						generated_task_id: link.generated_task_id
					})
					.eq("id", link.run_item_id);

				if (error) {
					throw new Error(`Failed to link generated task ${link.generated_task_id} to run item ${link.run_item_id}: ${error.message}`);
				}
			}
		},
		createRun: async (payload: AutoTimeRunRow) => {
			const { data, error } = await timeTracker
				.from("auto_time_runs")
				.insert(payload)
				.select("id")
				.single();

			if (error) {
				throw new Error(`Failed to create auto_time_runs record: ${error.message}`);
			}

			return {
				id: data.id as string
			};
		},
		finalizeRun: async (
			runId: string,
			status: AutoTimeRunStatus,
			summary: Record<string, unknown>,
			errorSummary?: string
		) => {
			const { error } = await timeTracker
				.from("auto_time_runs")
				.update({
					status,
					finished_at: new Date().toISOString(),
					summary,
					error_summary: errorSummary ?? null
				})
				.eq("id", runId);

			if (error) {
				throw new Error(`Failed to finalize auto_time_runs record ${runId}: ${error.message}`);
			}
		},
		insertDailyHealthReport: async (report: AutoTimeDailyHealthReport) => {
			const { error } = await timeTracker
				.from("auto_time_daily_health_reports")
				.insert({
					org_id: report.org_id,
					target_work_date: report.target_work_date,
					run_id: report.run_id,
					status: report.status,
					total_logs_scanned: report.total_logs_scanned,
					total_logs_accepted: report.total_logs_accepted,
					total_projects_auto_created: report.total_projects_auto_created,
					total_roots_auto_inserted: report.total_roots_auto_inserted,
					total_rebuild_dates_queued: report.total_rebuild_dates_queued,
					total_rebuild_dates_completed: report.total_rebuild_dates_completed,
					total_tasks_written: report.total_tasks_written,
					total_zero_project_users: report.total_zero_project_users,
					total_high_unattributed_users: report.total_high_unattributed_users,
					total_conflict_candidates: report.total_conflict_candidates,
					total_rejected_candidates: report.total_rejected_candidates,
					summary: report.summary
				});

			if (error) {
				throw new Error(`Failed to insert auto_time_daily_health_reports: ${error.message}`);
			}
		}
	};
};
