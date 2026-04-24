type ParserSummaryInput = {
	total_auto_created_projects?: number;
	total_auto_inserted_roots?: number;
	total_conflict_roots?: number;
	total_rejected_roots?: number;
};

type RunnerSummaryInput = {
	total_logs_scanned?: number;
	total_logs_accepted?: number;
	total_tasks_written?: number;
	total_existing_auto_tasks_deleted?: number;
	allocation_diagnostics?: Array<Record<string, unknown>>;
};

type HealthUser = {
	nas_username: string | null;
	user_id: string | null;
	raw_total_minutes: number;
	unattributed_minutes: number;
	distinct_project_count: number;
	unattributed_ratio: number;
};

export type AutoTimeDailyHealthReport = {
	org_id: string;
	target_work_date: string;
	run_id: string | null;
	status: "completed" | "completed_with_anomalies";
	total_logs_scanned: number;
	total_logs_accepted: number;
	total_projects_auto_created: number;
	total_roots_auto_inserted: number;
	total_rebuild_dates_queued: number;
	total_rebuild_dates_completed: number;
	total_tasks_written: number;
	total_zero_project_users: number;
	total_high_unattributed_users: number;
	total_conflict_candidates: number;
	total_rejected_candidates: number;
	summary: {
		zero_project_users: HealthUser[];
		high_unattributed_users: HealthUser[];
		[key: string]: unknown;
	};
};

const toNumber = (value: unknown): number =>
	typeof value === "number" && Number.isFinite(value) ? value : 0;

const toStringOrNull = (value: unknown): string | null =>
	typeof value === "string" && value ? value : null;

const buildHealthUser = (entry: Record<string, unknown>): HealthUser => {
	const rawTotalMinutes = toNumber(entry.raw_total_minutes);
	const unattributedMinutes = toNumber(entry.unattributed_minutes);

	return {
		nas_username: toStringOrNull(entry.nas_username),
		user_id: toStringOrNull(entry.user_id),
		raw_total_minutes: rawTotalMinutes,
		unattributed_minutes: unattributedMinutes,
		distinct_project_count: toNumber(entry.distinct_project_count),
		unattributed_ratio: rawTotalMinutes > 0 ? unattributedMinutes / rawTotalMinutes : 0
	};
};

export const buildAutoTimeDailyHealthReport = ({
	orgId,
	targetWorkDate,
	runId = null,
	parserSummary = {},
	runnerSummary = {}
}: {
	orgId: string;
	targetWorkDate: string;
	runId?: string | null;
	parserSummary?: ParserSummaryInput;
	runnerSummary?: RunnerSummaryInput;
}): AutoTimeDailyHealthReport => {
	const diagnostics = runnerSummary.allocation_diagnostics ?? [];
	const healthUsers = diagnostics.map(buildHealthUser);
	const zeroProjectUsers = healthUsers.filter((entry) =>
		entry.raw_total_minutes > 0
		&& entry.distinct_project_count === 0
	);
	const highUnattributedUsers = healthUsers.filter((entry) =>
		entry.raw_total_minutes > 0
		&& entry.distinct_project_count > 0
		&& entry.unattributed_ratio >= 0.5
	);
	const hasAnomalies = zeroProjectUsers.length > 0
		|| highUnattributedUsers.length > 0
		|| toNumber(parserSummary.total_conflict_roots) > 0;

	return {
		org_id: orgId,
		target_work_date: targetWorkDate,
		run_id: runId,
		status: hasAnomalies ? "completed_with_anomalies" : "completed",
		total_logs_scanned: toNumber(runnerSummary.total_logs_scanned),
		total_logs_accepted: toNumber(runnerSummary.total_logs_accepted),
		total_projects_auto_created: toNumber(parserSummary.total_auto_created_projects),
		total_roots_auto_inserted: toNumber(parserSummary.total_auto_inserted_roots),
		total_rebuild_dates_queued: toNumber(runnerSummary.total_existing_auto_tasks_deleted) > 0 ? 1 : 0,
		total_rebuild_dates_completed: toNumber(runnerSummary.total_existing_auto_tasks_deleted) > 0 ? 1 : 0,
		total_tasks_written: toNumber(runnerSummary.total_tasks_written),
		total_zero_project_users: zeroProjectUsers.length,
		total_high_unattributed_users: highUnattributedUsers.length,
		total_conflict_candidates: toNumber(parserSummary.total_conflict_roots),
		total_rejected_candidates: toNumber(parserSummary.total_rejected_roots),
		summary: {
			zero_project_users: zeroProjectUsers,
			high_unattributed_users: highUnattributedUsers
		}
	};
};

const renderUserRows = (users: HealthUser[]): string => {
	if (users.length === 0) {
		return "_None_";
	}

	return [
		"| NAS Username | User ID | Raw Total Minutes | Unattributed Minutes |",
		"| --- | --- | ---: | ---: |",
		...users.map((user) =>
			`| ${user.nas_username ?? ""} | ${user.user_id ?? ""} | ${user.raw_total_minutes} | ${user.unattributed_minutes} |`
		)
	].join("\n");
};

export const buildAutoTimeHealthMarkdown = (report: AutoTimeDailyHealthReport): string => [
	"# SA-TIME Auto Time Health Report",
	"",
	"| Field | Value |",
	"| --- | ---: |",
	`| Target Work Date | ${report.target_work_date} |`,
	`| Status | ${report.status} |`,
	`| Run ID | ${report.run_id ?? ""} |`,
	`| Logs Scanned | ${report.total_logs_scanned} |`,
	`| Logs Accepted | ${report.total_logs_accepted} |`,
	`| Auto Created Projects | ${report.total_projects_auto_created} |`,
	`| Auto Inserted Roots | ${report.total_roots_auto_inserted} |`,
	`| Rebuild Dates Queued | ${report.total_rebuild_dates_queued} |`,
	`| Rebuild Dates Completed | ${report.total_rebuild_dates_completed} |`,
	`| Tasks Written | ${report.total_tasks_written} |`,
	`| Zero Project Users | ${report.total_zero_project_users} |`,
	`| High Unattributed Users | ${report.total_high_unattributed_users} |`,
	`| Conflict Candidates | ${report.total_conflict_candidates} |`,
	`| Rejected Candidates | ${report.total_rejected_candidates} |`,
	"",
	"## Zero Project Users",
	"",
	renderUserRows(report.summary.zero_project_users),
	"",
	"## High Unattributed Users",
	"",
	renderUserRows(report.summary.high_unattributed_users)
].join("\n");
