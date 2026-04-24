import { getHolidayEntry } from "../../src/config/holidays.ts";

export type AutoTimeAction = "create" | "write" | "rename" | "delete";
export type AutoTimeRunStatus = "completed" | "failed" | "skipped";
export type AutoTimeAllocationMode = "even_split" | "interval_to_previous_project";

export type AutoTimeRunnerConfig = {
	orgId: string;
	supabaseUrl: string;
	supabaseServiceRoleKey: string;
	targetWorkDate: string;
	timezone: string;
	dryRun: boolean;
	ignoreWeekends: boolean;
	actions: AutoTimeAction[];
	sourceTable: string;
	allocationMode: AutoTimeAllocationMode;
	largeGapThresholdMinutes: number;
	skipFormalWriteOnLargeGap: boolean;
	rebuildNasAuto: boolean;
};

export type AutoTimeRunnerSummary = {
	stage: string;
	target_work_date: string;
	timezone: string;
	range_start: string;
	range_end: string;
	day_of_week: number;
	actions: AutoTimeAction[];
	total_logs_scanned: number;
	total_logs_accepted: number;
	total_tasks_written: number;
	total_logs_ignored_accounts?: number;
	total_logs_rejected_incomplete?: number;
	total_logs_unmapped_users?: number;
	total_logs_unmapped_projects?: number;
	total_candidate_items?: number;
	total_run_items_written?: number;
	total_manual_override_items?: number;
	total_existing_auto_tasks_skipped?: number;
	total_existing_auto_tasks_deleted?: number;
	total_users_with_allocation_diagnostics?: number;
	total_policy_guard_items?: number;
	formal_allocation_mode?: AutoTimeAllocationMode;
	rebuild_nas_auto?: boolean;
	allocation_diagnostics?: Array<Record<string, unknown>>;
	allocation_sample_rows?: Array<Record<string, unknown>>;
	skipReason?: string;
};

export type AutoTimeAssetLog = {
	id: string;
	file_path: string | null;
	nas_username: string | null;
	action: AutoTimeAction;
	detected_at: string;
	sa_ai_user_id: string | null;
	created_at: string | null;
};

export type LoadAssetLogsParams = {
	sourceTable: string;
	rangeStartIso: string;
	rangeEndIso: string;
	actions: AutoTimeAction[];
};

export type AutoTimeNasUserAlias = {
	nas_username: string;
	user_id: string;
};

export type AutoTimeProjectRoot = {
	id: string;
	project_id: string;
	root_path: string;
};

export type AutoTimeRunRow = {
	org_id: string;
	target_work_date: string;
	source_kind: "asset_version_log";
	status: "running";
	started_at: string;
	summary: Record<string, unknown>;
};

export type AutoTimeRunItemInsert = {
	org_id: string;
	target_work_date: string;
	nas_username: string;
	user_id: string | null;
	project_id: string | null;
	project_root_id: string | null;
	source_event_count: number;
	source_event_ids: string[];
	source_paths: string[];
	first_detected_at: string | null;
	last_detected_at: string | null;
	raw_first_activity_at: string | null;
	raw_last_activity_at: string | null;
	raw_total_minutes: number;
	unattributed_minutes: number;
	raw_project_minutes: number;
	normalized_project_minutes: number;
	allocation_method: string;
	allocation_version: string;
	allocation_meta: Record<string, unknown>;
	resolution_status: "accepted" | "manual_override_skipped" | "policy_guard_skipped";
	resolution_reason: string | null;
	generated_duration_minutes: number | null;
	metadata: Record<string, unknown>;
};

export type AutoTimePersistedRunItem = AutoTimeRunItemInsert & {
	id: string;
};

export type AutoTimeTaskInsert = {
	org_id: string;
	user_id: string;
	project_id: string;
	task_name: string;
	work_date: string;
	duration_minutes: number;
	notes: string | null;
	entry_source: "nas_auto";
	source_run_id: string;
	source_item_id: string;
};

export type AutoTimeInsertedTask = {
	id: string;
	source_item_id: string;
};

export type AutoTimeGeneratedTaskLink = {
	run_item_id: string;
	generated_task_id: string;
};

export type AutoTimeRunnerRepository = {
	createRun: (payload: AutoTimeRunRow) => Promise<{ id: string }>;
	finalizeRun: (runId: string, status: AutoTimeRunStatus, summary: Record<string, unknown>, errorSummary?: string) => Promise<void>;
	loadAssetLogs?: (params: LoadAssetLogsParams) => Promise<AutoTimeAssetLog[]>;
	loadIgnoreAccounts?: (orgId: string) => Promise<string[]>;
	loadNasUserAliases?: (orgId: string) => Promise<AutoTimeNasUserAlias[]>;
	loadProjectRoots?: (orgId: string) => Promise<AutoTimeProjectRoot[]>;
	loadManualTaskUserIds?: (orgId: string, targetWorkDate: string) => Promise<string[]>;
	loadExistingAutoTaskKeys?: (orgId: string, targetWorkDate: string) => Promise<string[]>;
	deleteExistingAutoTasks?: (orgId: string, targetWorkDate: string) => Promise<string[]>;
	insertRunItems?: (runId: string, items: AutoTimeRunItemInsert[]) => Promise<AutoTimePersistedRunItem[]>;
	insertTasks?: (runId: string, tasks: AutoTimeTaskInsert[]) => Promise<AutoTimeInsertedTask[]>;
	linkGeneratedTasks?: (links: AutoTimeGeneratedTaskLink[]) => Promise<void>;
};

export type TargetDayWindow = {
	targetWorkDate: string;
	rangeStartIso: string;
	rangeEndIso: string;
	dayOfWeek: number;
};

const DATE_PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit"
});

const makeDateKey = (year: number, month: number, day: number): string =>
	`${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

const parseDateKey = (value: string) => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) {
		throw new Error(`Invalid work date: ${value}`);
	}

	return {
		year: Number(match[1]),
		month: Number(match[2]),
		day: Number(match[3])
	};
};

const shiftDateKey = (value: string, offsetDays: number): string => {
	const { year, month, day } = parseDateKey(value);
	const shifted = new Date(Date.UTC(year, month - 1, day));
	shifted.setUTCDate(shifted.getUTCDate() + offsetDays);

	return makeDateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
};

const getLocalDateKey = (date: Date, timezone: string): string => {
	const zoned = new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
		if (part.type !== "literal") {
			acc[part.type] = part.value;
		}
		return acc;
	}, {});

	return makeDateKey(Number(zoned.year), Number(zoned.month), Number(zoned.day));
};

const getTimeZoneOffsetMs = (date: Date, timezone: string): number => {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		hour12: false,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	}).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
		if (part.type !== "literal") {
			acc[part.type] = part.value;
		}
		return acc;
	}, {});

	const utcFromZone = Date.UTC(
		Number(parts.year),
		Number(parts.month) - 1,
		Number(parts.day),
		Number(parts.hour),
		Number(parts.minute),
		Number(parts.second)
	);

	return utcFromZone - date.getTime();
};

const zonedDateKeyToUtcIso = (dateKey: string, timezone: string): string => {
	const { year, month, day } = parseDateKey(dateKey);
	const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
	const offsetMs = getTimeZoneOffsetMs(utcGuess, timezone);

	return new Date(utcGuess.getTime() - offsetMs).toISOString();
};

const buildWindowForDate = (targetWorkDate: string, timezone: string): TargetDayWindow => ({
	targetWorkDate,
	rangeStartIso: zonedDateKeyToUtcIso(targetWorkDate, timezone),
	rangeEndIso: zonedDateKeyToUtcIso(shiftDateKey(targetWorkDate, 1), timezone),
	dayOfWeek: new Date(`${targetWorkDate}T00:00:00.000Z`).getUTCDay()
});

const zonedDateTimeToUtcIso = (
	dateKey: string,
	timezone: string,
	hour: number,
	minute = 0,
	second = 0
): string => {
	const { year, month, day } = parseDateKey(dateKey);
	const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
	const offsetMs = getTimeZoneOffsetMs(utcGuess, timezone);

	return new Date(utcGuess.getTime() - offsetMs).toISOString();
};

export const buildTargetDayWindow = ({
	now,
	timezone
}: {
	now: Date;
	timezone: string;
}): TargetDayWindow => {
	const currentLocalDate = getLocalDateKey(now, timezone);
	return buildWindowForDate(shiftDateKey(currentLocalDate, -1), timezone);
};

const isWeekend = (dayOfWeek: number): boolean => dayOfWeek === 0 || dayOfWeek === 6;

const normalizeNasUsername = (value: string | null): string => value?.trim().toLowerCase() ?? "";
const normalizePath = (value: string | null): string =>
	value?.trim().replace(/[\\/]+$/, "").toLowerCase() ?? "";
const diffMinutes = (startIso: string, endIso: string): number =>
	Math.max(0, Math.floor((Date.parse(endIso) - Date.parse(startIso)) / 60000));

const filterAcceptedLogs = ({
	logs,
	ignoreAccounts
}: {
	logs: AutoTimeAssetLog[];
	ignoreAccounts: string[];
}) => {
	const ignoredAccountSet = new Set(ignoreAccounts.map((entry) => entry.trim().toLowerCase()).filter(Boolean));
	let ignoredAccountCount = 0;
	let incompleteCount = 0;

	const acceptedLogs = logs.filter((log) => {
		const normalizedUsername = normalizeNasUsername(log.nas_username);
		const normalizedPath = log.file_path?.trim() ?? "";

		if (!normalizedUsername || !normalizedPath) {
			incompleteCount += 1;
			return false;
		}

		if (ignoredAccountSet.has(normalizedUsername)) {
			ignoredAccountCount += 1;
			return false;
		}

		return true;
	});

	return {
		acceptedLogs,
		ignoredAccountCount,
		incompleteCount
	};
};

const buildAliasMap = (aliases: AutoTimeNasUserAlias[]): Map<string, string> =>
	new Map(
		aliases
			.map((alias) => [normalizeNasUsername(alias.nas_username), alias.user_id] as const)
			.filter(([nasUsername, userId]) => Boolean(nasUsername) && Boolean(userId))
	);

const buildSortedProjectRoots = (roots: AutoTimeProjectRoot[]): Array<AutoTimeProjectRoot & { normalized_root_path: string }> =>
	roots
		.map((root) => ({
			...root,
			normalized_root_path: normalizePath(root.root_path)
		}))
		.filter((root) => Boolean(root.normalized_root_path))
		.sort((left, right) => right.normalized_root_path.length - left.normalized_root_path.length);

const resolveUserId = (log: AutoTimeAssetLog, aliasMap: Map<string, string>): string | null => {
	if (log.sa_ai_user_id) {
		return log.sa_ai_user_id;
	}

	return aliasMap.get(normalizeNasUsername(log.nas_username)) ?? null;
};

const resolveProjectRoot = (
	log: AutoTimeAssetLog,
	projectRoots: Array<AutoTimeProjectRoot & { normalized_root_path: string }>
) => {
	const normalizedFilePath = normalizePath(log.file_path);

	return projectRoots.find((root) =>
		normalizedFilePath === root.normalized_root_path
		|| normalizedFilePath.startsWith(`${root.normalized_root_path}/`)
		|| normalizedFilePath.startsWith(`${root.normalized_root_path}\\`)
	) ?? null;
};

const compressConsecutiveProjectEvents = (
	projectEvents: AutoTimeProjectEvent[]
): AutoTimeCompressedProjectEvent[] => {
	const sortedEvents = [...projectEvents]
		.sort((left, right) => Date.parse(left.detected_at) - Date.parse(right.detected_at));
	const compressedEvents: AutoTimeCompressedProjectEvent[] = [];

	for (const event of sortedEvents) {
		const previousEvent = compressedEvents[compressedEvents.length - 1];
		if (
			previousEvent
			&& previousEvent.project_id === event.project_id
			&& previousEvent.project_root_id === event.project_root_id
		) {
			continue;
		}

		compressedEvents.push(event);
	}

	return compressedEvents;
};

type AutoTimeCandidateAggregation = {
	org_id: string;
	target_work_date: string;
	nas_username: string;
	user_id: string;
	project_id: string;
	project_root_id: string;
	source_event_count: number;
	source_event_ids: string[];
	source_paths: string[];
	first_detected_at: string | null;
	last_detected_at: string | null;
	raw_first_activity_at: string | null;
	raw_last_activity_at: string | null;
	raw_total_minutes: number;
	unattributed_minutes: number;
	raw_project_minutes: number;
	normalized_project_minutes: number;
	allocation_method: string;
	allocation_version: string;
	allocation_meta: Record<string, unknown>;
	metadata: Record<string, unknown>;
};

export type AutoTimeProjectEvent = {
	project_id: string;
	project_root_id: string;
	detected_at: string;
};

export type AutoTimeCompressedProjectEvent = AutoTimeProjectEvent;

export type AutoTimeProjectInterval = {
	project_id: string;
	project_root_id: string;
	start_at: string;
	end_at: string;
	interval_minutes: number;
};

export type AutoTimeProjectMinutes = {
	project_id: string;
	project_root_id: string;
	raw_project_minutes: number;
	normalized_project_minutes: number;
	formal_generated_minutes?: number | null;
};

export type AutoTimeRawAllocationDiagnostics = {
	raw_total_minutes: number;
	unattributed_minutes: number;
	attributed_total_minutes: number;
	distinct_project_count: number;
	compressed_project_events: AutoTimeCompressedProjectEvent[];
	project_intervals: AutoTimeProjectInterval[];
	largest_interval_minutes: number;
	project_minutes: AutoTimeProjectMinutes[];
};

type AutoTimeUserAllocationDiagnostic = {
	nas_username: string;
	user_id: string;
	raw_first_activity_at: string | null;
	raw_last_activity_at: string | null;
	raw_total_minutes: number;
	unattributed_minutes: number;
	attributed_total_minutes: number;
	distinct_project_count: number;
	allocation_method: string;
	allocation_version: string;
	large_gap_threshold_minutes: number;
	large_gap_hit: boolean;
	largest_interval_minutes: number;
	conservative_mode_hit: boolean;
	conservative_mode_reason: string | null;
	formal_write_skipped: boolean;
	formal_write_skip_reason: string | null;
	formal_allocation_mode: AutoTimeAllocationMode;
	project_minutes: AutoTimeProjectMinutes[];
};

const RAW_ALLOCATION_METHOD = "interval_to_previous_project";
const RAW_ALLOCATION_VERSION = "stage_a_v1";
const CONSERVATIVE_MODE_PROJECT_THRESHOLD = 3;

export const normalizeProjectMinutesToFixedTotal = (
	projectMinutes: Array<Pick<AutoTimeProjectMinutes, "project_id" | "project_root_id" | "raw_project_minutes">>,
	totalMinutes: number
): AutoTimeProjectMinutes[] => {
	if (projectMinutes.length === 0) {
		return [];
	}

	const attributedTotalMinutes = projectMinutes.reduce((sum, entry) => sum + entry.raw_project_minutes, 0);
	if (attributedTotalMinutes <= 0 || totalMinutes <= 0) {
		return projectMinutes.map((entry) => ({
			...entry,
			normalized_project_minutes: 0
		}));
	}

	let assignedMinutes = 0;
	return projectMinutes.map((entry, index) => {
		const isLast = index === projectMinutes.length - 1;
		const normalizedProjectMinutes = isLast
			? totalMinutes - assignedMinutes
			: Math.floor((entry.raw_project_minutes / attributedTotalMinutes) * totalMinutes);
		assignedMinutes += normalizedProjectMinutes;

		return {
			...entry,
			normalized_project_minutes: normalizedProjectMinutes
		};
	});
};

export const normalizeProjectMinutesTo480 = (
	projectMinutes: Array<Pick<AutoTimeProjectMinutes, "project_id" | "project_root_id" | "raw_project_minutes">>
): AutoTimeProjectMinutes[] => normalizeProjectMinutesToFixedTotal(projectMinutes, 480);

export const buildProjectIntervalsFromEvents = ({
	compressedProjectEvents,
	rawLastActivityAt
}: {
	compressedProjectEvents: AutoTimeCompressedProjectEvent[];
	rawLastActivityAt: string;
}): AutoTimeProjectInterval[] =>
	compressedProjectEvents.map((event, index) => {
		const endAt = compressedProjectEvents[index + 1]?.detected_at ?? rawLastActivityAt;
		return {
			project_id: event.project_id,
			project_root_id: event.project_root_id,
			start_at: event.detected_at,
			end_at: endAt,
			interval_minutes: diffMinutes(event.detected_at, endAt)
		};
	});

export const calculateRawProjectMinutes = (
	projectIntervals: AutoTimeProjectInterval[]
): AutoTimeProjectMinutes[] => {
	const projectMinutesByKey = new Map<string, AutoTimeProjectMinutes>();

	for (const interval of projectIntervals) {
		const key = `${interval.project_id}|${interval.project_root_id}`;
		const existing = projectMinutesByKey.get(key);

		if (existing) {
			existing.raw_project_minutes += interval.interval_minutes;
			continue;
		}

		projectMinutesByKey.set(key, {
			project_id: interval.project_id,
			project_root_id: interval.project_root_id,
			raw_project_minutes: interval.interval_minutes,
			normalized_project_minutes: 0
		});
	}

	return Array.from(projectMinutesByKey.values());
};

const buildFormalProjectMinutes = ({
	projectMinutes,
	formalAllocationMode,
	formalWriteSkipped
}: {
	projectMinutes: AutoTimeProjectMinutes[];
	formalAllocationMode: AutoTimeAllocationMode;
	formalWriteSkipped: boolean;
}): AutoTimeProjectMinutes[] => {
	if (formalWriteSkipped) {
		return projectMinutes.map((entry) => ({
			...entry,
			formal_generated_minutes: null
		}));
	}

	if (formalAllocationMode === "interval_to_previous_project") {
		return projectMinutes.map((entry) => ({
			...entry,
			formal_generated_minutes: entry.normalized_project_minutes
		}));
	}

	const evenSplitMinutes = allocateDurations(projectMinutes.length);
	return projectMinutes.map((entry, index) => ({
		...entry,
		formal_generated_minutes: evenSplitMinutes[index] ?? 0
	}));
};

export const buildAllocationSummary = ({
	nasUsername,
	userId,
	rawFirstActivityAt,
	rawLastActivityAt,
	rawAllocation,
	formalAllocationMode,
	largeGapThresholdMinutes,
	skipFormalWriteOnLargeGap
}: {
	nasUsername: string;
	userId: string;
	rawFirstActivityAt: string | null;
	rawLastActivityAt: string | null;
	rawAllocation: AutoTimeRawAllocationDiagnostics;
	formalAllocationMode: AutoTimeAllocationMode;
	largeGapThresholdMinutes: number;
	skipFormalWriteOnLargeGap: boolean;
}): AutoTimeUserAllocationDiagnostic => {
	const conservativeModeHit = rawAllocation.distinct_project_count >= CONSERVATIVE_MODE_PROJECT_THRESHOLD;
	const largestIntervalMinutes = rawAllocation.largest_interval_minutes;
	const largeGapHit = largestIntervalMinutes >= largeGapThresholdMinutes;
	const formalWriteSkipReasons: string[] = [];

	if (
		formalAllocationMode === "interval_to_previous_project"
		&& largeGapHit
		&& skipFormalWriteOnLargeGap
	) {
		formalWriteSkipReasons.push(`largest_interval_minutes_gte_${largeGapThresholdMinutes}`);
	}

	const formalWriteSkipped = formalWriteSkipReasons.length > 0;
	const projectMinutes = buildFormalProjectMinutes({
		projectMinutes: normalizeProjectMinutesTo480(rawAllocation.project_minutes),
		formalAllocationMode,
		formalWriteSkipped
	});

	return {
		nas_username: nasUsername,
		user_id: userId,
		raw_first_activity_at: rawFirstActivityAt,
		raw_last_activity_at: rawLastActivityAt,
		raw_total_minutes: rawAllocation.raw_total_minutes,
		unattributed_minutes: rawAllocation.unattributed_minutes,
		attributed_total_minutes: rawAllocation.attributed_total_minutes,
		distinct_project_count: rawAllocation.distinct_project_count,
		allocation_method: RAW_ALLOCATION_METHOD,
		allocation_version: RAW_ALLOCATION_VERSION,
		large_gap_threshold_minutes: largeGapThresholdMinutes,
		large_gap_hit: largeGapHit,
		largest_interval_minutes: largestIntervalMinutes,
		conservative_mode_hit: conservativeModeHit,
		conservative_mode_reason: conservativeModeHit ? "distinct_project_count_gte_3" : null,
		formal_write_skipped: formalWriteSkipped,
		formal_write_skip_reason: formalWriteSkipReasons.length > 0 ? formalWriteSkipReasons.join(",") : null,
		formal_allocation_mode: formalAllocationMode,
		project_minutes: projectMinutes
	};
};

const buildAllocationSampleRows = ({
	targetWorkDate,
	allocationDiagnostics
}: {
	targetWorkDate: string;
	allocationDiagnostics: AutoTimeUserAllocationDiagnostic[];
}): Array<Record<string, unknown>> =>
	allocationDiagnostics.map((entry) => ({
		target_work_date: targetWorkDate,
		nas_username: entry.nas_username,
		user_id: entry.user_id,
		raw_first_activity_at: entry.raw_first_activity_at,
		raw_last_activity_at: entry.raw_last_activity_at,
		raw_total_minutes: entry.raw_total_minutes,
		unattributed_minutes: entry.unattributed_minutes,
		attributed_total_minutes: entry.attributed_total_minutes,
		distinct_project_count: entry.distinct_project_count,
		large_gap_threshold_minutes: entry.large_gap_threshold_minutes,
		large_gap_hit: entry.large_gap_hit,
		largest_interval_minutes: entry.largest_interval_minutes,
		conservative_mode_hit: entry.conservative_mode_hit,
		conservative_mode_reason: entry.conservative_mode_reason,
		formal_write_skipped: entry.formal_write_skipped,
		formal_write_skip_reason: entry.formal_write_skip_reason,
		formal_allocation_mode: entry.formal_allocation_mode,
		projects: entry.project_minutes.map((projectEntry) => ({
			project_id: projectEntry.project_id,
			project_root_id: projectEntry.project_root_id,
			raw_project_minutes: projectEntry.raw_project_minutes,
			normalized_project_minutes: projectEntry.normalized_project_minutes,
			formal_generated_minutes: projectEntry.formal_generated_minutes ?? null
		}))
	}));

export const buildRawAllocationDiagnostics = ({
	dayStartIso,
	rawLastActivityAt,
	projectEvents
}: {
	dayStartIso: string;
	rawLastActivityAt: string | null;
	projectEvents: AutoTimeProjectEvent[];
}): AutoTimeRawAllocationDiagnostics => {
	if (!rawLastActivityAt || Date.parse(rawLastActivityAt) <= Date.parse(dayStartIso)) {
		return {
			raw_total_minutes: 0,
			unattributed_minutes: 0,
			attributed_total_minutes: 0,
			distinct_project_count: 0,
			compressed_project_events: [],
			project_intervals: [],
			largest_interval_minutes: 0,
			project_minutes: []
		};
	}

	const rawTotalMinutes = diffMinutes(dayStartIso, rawLastActivityAt);
	const inWindowProjectEvents = projectEvents.filter((event) => {
		const eventTime = Date.parse(event.detected_at);
		return eventTime >= Date.parse(dayStartIso) && eventTime <= Date.parse(rawLastActivityAt);
	});
	const compressedProjectEvents = compressConsecutiveProjectEvents(inWindowProjectEvents);

	if (compressedProjectEvents.length === 0) {
		return {
			raw_total_minutes: rawTotalMinutes,
			unattributed_minutes: rawTotalMinutes,
			attributed_total_minutes: 0,
			distinct_project_count: 0,
			compressed_project_events: [],
			project_intervals: [],
			largest_interval_minutes: 0,
			project_minutes: []
		};
	}

	const unattributedMinutes = diffMinutes(dayStartIso, compressedProjectEvents[0].detected_at);
	const projectIntervals = buildProjectIntervalsFromEvents({
		compressedProjectEvents,
		rawLastActivityAt
	});
	const rawProjectMinutes = calculateRawProjectMinutes(projectIntervals);
	return {
		raw_total_minutes: rawTotalMinutes,
		unattributed_minutes: unattributedMinutes,
		attributed_total_minutes: rawProjectMinutes.reduce((sum, entry) => sum + entry.raw_project_minutes, 0),
		distinct_project_count: rawProjectMinutes.length,
		compressed_project_events: compressedProjectEvents,
		project_intervals: projectIntervals,
		largest_interval_minutes: projectIntervals.reduce((maxMinutes, interval) => Math.max(maxMinutes, interval.interval_minutes), 0),
		project_minutes: rawProjectMinutes
	};
};

const aggregateCandidateItems = ({
	orgId,
	logs,
	targetWorkDate,
	timezone,
	formalAllocationMode,
	largeGapThresholdMinutes,
	skipFormalWriteOnLargeGap,
	aliases,
	projectRoots
}: {
	orgId: string;
	logs: AutoTimeAssetLog[];
	targetWorkDate: string;
	timezone: string;
	formalAllocationMode: AutoTimeAllocationMode;
	largeGapThresholdMinutes: number;
	skipFormalWriteOnLargeGap: boolean;
	aliases: AutoTimeNasUserAlias[];
	projectRoots: AutoTimeProjectRoot[];
}) => {
	const aliasMap = buildAliasMap(aliases);
	const sortedProjectRoots = buildSortedProjectRoots(projectRoots);
	const dayStartIso = zonedDateTimeToUtcIso(targetWorkDate, timezone, 10);
	let unmappedUserCount = 0;
	let unmappedProjectCount = 0;
	const candidateMap = new Map<string, AutoTimeCandidateAggregation>();
	const userActivityMap = new Map<string, {
		nas_username: string;
		user_id: string;
		raw_first_activity_at: string | null;
		raw_last_activity_at: string | null;
		project_events: AutoTimeProjectEvent[];
	}>();

	for (const log of logs) {
		const userId = resolveUserId(log, aliasMap);
		if (!userId) {
			unmappedUserCount += 1;
			continue;
		}

		const existingUserActivity = userActivityMap.get(userId);
		if (existingUserActivity) {
			existingUserActivity.raw_first_activity_at = existingUserActivity.raw_first_activity_at
				&& existingUserActivity.raw_first_activity_at < log.detected_at
				? existingUserActivity.raw_first_activity_at
				: log.detected_at;
			existingUserActivity.raw_last_activity_at = existingUserActivity.raw_last_activity_at
				&& existingUserActivity.raw_last_activity_at > log.detected_at
				? existingUserActivity.raw_last_activity_at
				: log.detected_at;
		} else {
			userActivityMap.set(userId, {
				nas_username: log.nas_username?.trim() ?? "",
				user_id: userId,
				raw_first_activity_at: log.detected_at,
				raw_last_activity_at: log.detected_at,
				project_events: []
			});
		}

		const projectRoot = resolveProjectRoot(log, sortedProjectRoots);
		if (!projectRoot) {
			unmappedProjectCount += 1;
			continue;
		}

		userActivityMap.get(userId)?.project_events.push({
			project_id: projectRoot.project_id,
			project_root_id: projectRoot.id,
			detected_at: log.detected_at
		});

		const key = `${userId}|${targetWorkDate}|${projectRoot.project_id}`;
		const normalizedPath = log.file_path?.trim() ?? "";
		const existing = candidateMap.get(key);

		if (existing) {
			existing.source_event_count += 1;
			existing.source_event_ids.push(log.id);
			if (!existing.source_paths.includes(normalizedPath)) {
				existing.source_paths.push(normalizedPath);
			}
			existing.first_detected_at = existing.first_detected_at && existing.first_detected_at < log.detected_at
				? existing.first_detected_at
				: log.detected_at;
			existing.last_detected_at = existing.last_detected_at && existing.last_detected_at > log.detected_at
				? existing.last_detected_at
				: log.detected_at;
			continue;
		}

		candidateMap.set(key, {
			org_id: orgId,
			target_work_date: targetWorkDate,
			nas_username: log.nas_username?.trim() ?? "",
			user_id: userId,
			project_id: projectRoot.project_id,
			project_root_id: projectRoot.id,
			source_event_count: 1,
			source_event_ids: [log.id],
			source_paths: normalizedPath ? [normalizedPath] : [],
			first_detected_at: log.detected_at,
			last_detected_at: log.detected_at,
			raw_first_activity_at: null,
			raw_last_activity_at: null,
			raw_total_minutes: 0,
			unattributed_minutes: 0,
			raw_project_minutes: 0,
			normalized_project_minutes: 0,
			allocation_method: RAW_ALLOCATION_METHOD,
			allocation_version: RAW_ALLOCATION_VERSION,
			allocation_meta: {},
			metadata: {
				source: "asset_version_log",
				resolved_via: log.sa_ai_user_id ? "sa_ai_user_id" : "nas_user_aliases"
			}
		});
	}

	const allocationDiagnostics = Array.from(userActivityMap.values()).map((userActivity) => {
		const rawAllocation = buildRawAllocationDiagnostics({
			dayStartIso,
			rawLastActivityAt: userActivity.raw_last_activity_at,
			projectEvents: userActivity.project_events
		});
		return buildAllocationSummary({
			nasUsername: userActivity.nas_username,
			userId: userActivity.user_id,
			rawFirstActivityAt: userActivity.raw_first_activity_at,
			rawLastActivityAt: userActivity.raw_last_activity_at,
			rawAllocation,
			formalAllocationMode,
			largeGapThresholdMinutes,
			skipFormalWriteOnLargeGap
		});
	});
	const allocationDiagnosticsByUserId = new Map(
		allocationDiagnostics.map((entry) => [entry.user_id, entry] as const)
	);
	const candidateItems = Array.from(candidateMap.values()).map((candidateItem) => {
		const userDiagnostic = allocationDiagnosticsByUserId.get(candidateItem.user_id);
		const projectDiagnostic = userDiagnostic?.project_minutes.find((entry) =>
			entry.project_id === candidateItem.project_id
			&& entry.project_root_id === candidateItem.project_root_id
		);

		return {
			...candidateItem,
			raw_first_activity_at: userDiagnostic?.raw_first_activity_at ?? null,
			raw_last_activity_at: userDiagnostic?.raw_last_activity_at ?? null,
			raw_total_minutes: userDiagnostic?.raw_total_minutes ?? 0,
			unattributed_minutes: userDiagnostic?.unattributed_minutes ?? 0,
			raw_project_minutes: projectDiagnostic?.raw_project_minutes ?? 0,
			normalized_project_minutes: projectDiagnostic?.normalized_project_minutes ?? 0,
			allocation_method: userDiagnostic?.allocation_method ?? RAW_ALLOCATION_METHOD,
			allocation_version: userDiagnostic?.allocation_version ?? RAW_ALLOCATION_VERSION,
			allocation_meta: {
				raw_first_activity_at: userDiagnostic?.raw_first_activity_at ?? null,
				raw_last_activity_at: userDiagnostic?.raw_last_activity_at ?? null,
				raw_total_minutes: userDiagnostic?.raw_total_minutes ?? 0,
				unattributed_minutes: userDiagnostic?.unattributed_minutes ?? 0,
				attributed_total_minutes: userDiagnostic?.attributed_total_minutes ?? 0,
				distinct_project_count: userDiagnostic?.distinct_project_count ?? 0,
				diagnostic_normalized_project_minutes: projectDiagnostic?.normalized_project_minutes ?? 0,
				formal_generated_minutes: projectDiagnostic?.formal_generated_minutes ?? null,
				formal_allocation_mode: userDiagnostic?.formal_allocation_mode ?? formalAllocationMode,
				large_gap_threshold_minutes: userDiagnostic?.large_gap_threshold_minutes ?? largeGapThresholdMinutes,
				large_gap_hit: userDiagnostic?.large_gap_hit ?? false,
				largest_interval_minutes: userDiagnostic?.largest_interval_minutes ?? 0,
				conservative_mode_hit: userDiagnostic?.conservative_mode_hit ?? false,
				conservative_mode_reason: userDiagnostic?.conservative_mode_reason ?? null,
				formal_write_skipped: userDiagnostic?.formal_write_skipped ?? false,
				formal_write_skip_reason: userDiagnostic?.formal_write_skip_reason ?? null,
				allocation_method: userDiagnostic?.allocation_method ?? RAW_ALLOCATION_METHOD,
				allocation_version: userDiagnostic?.allocation_version ?? RAW_ALLOCATION_VERSION
			},
			metadata: {
				...candidateItem.metadata,
				allocation: {
					raw_first_activity_at: userDiagnostic?.raw_first_activity_at ?? null,
					raw_last_activity_at: userDiagnostic?.raw_last_activity_at ?? null,
					raw_total_minutes: userDiagnostic?.raw_total_minutes ?? 0,
					unattributed_minutes: userDiagnostic?.unattributed_minutes ?? 0,
					attributed_total_minutes: userDiagnostic?.attributed_total_minutes ?? 0,
					distinct_project_count: userDiagnostic?.distinct_project_count ?? 0,
					raw_project_minutes: projectDiagnostic?.raw_project_minutes ?? 0,
					normalized_project_minutes: projectDiagnostic?.normalized_project_minutes ?? 0,
					formal_generated_minutes: projectDiagnostic?.formal_generated_minutes ?? null,
					formal_allocation_mode: userDiagnostic?.formal_allocation_mode ?? formalAllocationMode,
					large_gap_threshold_minutes: userDiagnostic?.large_gap_threshold_minutes ?? largeGapThresholdMinutes,
					large_gap_hit: userDiagnostic?.large_gap_hit ?? false,
					largest_interval_minutes: userDiagnostic?.largest_interval_minutes ?? 0,
					conservative_mode_hit: userDiagnostic?.conservative_mode_hit ?? false,
					conservative_mode_reason: userDiagnostic?.conservative_mode_reason ?? null,
					formal_write_skipped: userDiagnostic?.formal_write_skipped ?? false,
					formal_write_skip_reason: userDiagnostic?.formal_write_skip_reason ?? null,
					allocation_method: userDiagnostic?.allocation_method ?? RAW_ALLOCATION_METHOD,
					allocation_version: userDiagnostic?.allocation_version ?? RAW_ALLOCATION_VERSION
				}
			}
		};
	});

	return {
		unmappedUserCount,
		unmappedProjectCount,
		candidateItemCount: candidateMap.size,
		allocationDiagnostics,
		candidateItems
	};
};

const allocateDurations = (count: number): number[] => {
	if (count <= 0) {
		return [];
	}

	const base = Math.floor(480 / count);
	const remainder = 480 - (base * count);

	return Array.from({
		length: count
	}, (_, index) => base + (index === count - 1 ? remainder : 0));
};

const buildRunItems = ({
	candidateItems,
	manualOverrideUserIds,
	formalAllocationMode
}: {
	candidateItems: AutoTimeCandidateAggregation[];
	manualOverrideUserIds: string[];
	formalAllocationMode: AutoTimeAllocationMode;
}): {
	runItems: AutoTimeRunItemInsert[];
	manualOverrideItems: number;
	policyGuardItems: number;
} => {
	const manualOverrideSet = new Set(manualOverrideUserIds);
	const candidateItemsByUser = new Map<string, AutoTimeCandidateAggregation[]>();

	for (const candidateItem of candidateItems) {
		const existing = candidateItemsByUser.get(candidateItem.user_id) ?? [];
		existing.push(candidateItem);
		candidateItemsByUser.set(candidateItem.user_id, existing);
	}

	const runItems: AutoTimeRunItemInsert[] = [];
	let manualOverrideItems = 0;
	let policyGuardItems = 0;

	for (const userItems of candidateItemsByUser.values()) {
		const sortedItems = [...userItems].sort((left, right) => left.project_id.localeCompare(right.project_id));
		const isManualOverride = manualOverrideSet.has(sortedItems[0].user_id);
		const evenSplitAllocations = isManualOverride || formalAllocationMode === "interval_to_previous_project"
			? []
			: allocateDurations(sortedItems.length);

		for (const [index, item] of sortedItems.entries()) {
			const policyGuardSkipped = Boolean(item.allocation_meta.formal_write_skipped);
			const generatedDurationMinutes = isManualOverride || policyGuardSkipped
				? null
				: formalAllocationMode === "interval_to_previous_project"
					? item.normalized_project_minutes
					: evenSplitAllocations[index];
			const resolutionStatus = isManualOverride
				? "manual_override_skipped"
				: policyGuardSkipped
					? "policy_guard_skipped"
					: "accepted";
			const resolutionReason = isManualOverride
				? "manual task already exists for target work date"
				: policyGuardSkipped
					? String(item.allocation_meta.formal_write_skip_reason ?? "formal write skipped by allocation policy guard")
					: null;

			if (isManualOverride) {
				manualOverrideItems += 1;
			} else if (policyGuardSkipped) {
				policyGuardItems += 1;
			}

			runItems.push({
				org_id: item.org_id,
				target_work_date: item.target_work_date,
				nas_username: item.nas_username,
				user_id: item.user_id,
				project_id: item.project_id,
				project_root_id: item.project_root_id,
				source_event_count: item.source_event_count,
				source_event_ids: item.source_event_ids,
				source_paths: item.source_paths,
				first_detected_at: item.first_detected_at,
				last_detected_at: item.last_detected_at,
				raw_first_activity_at: item.raw_first_activity_at,
				raw_last_activity_at: item.raw_last_activity_at,
				raw_total_minutes: item.raw_total_minutes,
				unattributed_minutes: item.unattributed_minutes,
				raw_project_minutes: item.raw_project_minutes,
				normalized_project_minutes: item.normalized_project_minutes,
				allocation_method: item.allocation_method,
				allocation_version: item.allocation_version,
				allocation_meta: {
					...item.allocation_meta,
					formal_generated_minutes: generatedDurationMinutes,
					formal_allocation_mode: formalAllocationMode
				},
				resolution_status: resolutionStatus,
				resolution_reason: resolutionReason,
				generated_duration_minutes: generatedDurationMinutes,
				metadata: item.metadata
			});
		}
	}

	return {
		runItems,
		manualOverrideItems,
		policyGuardItems
	};
};

const buildTaskInserts = ({
	runId,
	runItems,
	existingAutoTaskKeys = []
}: {
	runId: string;
	runItems: AutoTimePersistedRunItem[];
	existingAutoTaskKeys?: string[];
}): AutoTimeTaskInsert[] =>
	runItems
		.filter((item) =>
			item.resolution_status === "accepted"
			&& Boolean(item.user_id)
			&& Boolean(item.project_id)
			&& item.generated_duration_minutes !== null
			&& item.generated_duration_minutes > 0
			&& !existingAutoTaskKeys.includes(`${item.user_id}|${item.project_id}|${item.target_work_date}`)
		)
		.map((item) => ({
			org_id: item.org_id,
			user_id: item.user_id as string,
			project_id: item.project_id as string,
			task_name: "NAS自动工时",
			work_date: item.target_work_date,
			duration_minutes: item.generated_duration_minutes as number,
			notes: "基于 asset_version_log 自动生成",
			entry_source: "nas_auto",
			source_run_id: runId,
			source_item_id: item.id
		}));

export const runAutoTimeCapture = async ({
	config,
	repository,
	now = new Date()
}: {
	config: AutoTimeRunnerConfig;
	repository: AutoTimeRunnerRepository;
	now?: Date;
}): Promise<{
	runId?: string;
	status: AutoTimeRunStatus | "dry-run";
	summary: AutoTimeRunnerSummary;
}> => {
	const window = buildWindowForDate(config.targetWorkDate, config.timezone);
	let summary: AutoTimeRunnerSummary = {
		stage: "skeleton_pending_implementation",
		target_work_date: window.targetWorkDate,
		timezone: config.timezone,
		range_start: window.rangeStartIso,
		range_end: window.rangeEndIso,
		day_of_week: window.dayOfWeek,
		actions: config.actions,
		total_logs_scanned: 0,
		total_logs_accepted: 0,
		total_tasks_written: 0,
		formal_allocation_mode: config.allocationMode,
		rebuild_nas_auto: config.rebuildNasAuto
	};
	let runId: string | undefined;

	if (config.ignoreWeekends && isWeekend(window.dayOfWeek)) {
		return {
			status: "skipped",
			summary: {
				...summary,
				skipReason: "weekend"
			}
		};
	}

	const holidayEntry = getHolidayEntry(config.targetWorkDate);
	if (holidayEntry?.isOffDay) {
		return {
			status: "skipped",
			summary: {
				...summary,
				skipReason: "holiday"
			}
		};
	}

	try {
		if (repository.loadAssetLogs) {
			const ignoreAccounts = repository.loadIgnoreAccounts
				? await repository.loadIgnoreAccounts(config.orgId)
				: [];
			const loadedLogs = await repository.loadAssetLogs({
				sourceTable: config.sourceTable,
				rangeStartIso: window.rangeStartIso,
				rangeEndIso: window.rangeEndIso,
				actions: config.actions
			});
			const filteredLogs = filterAcceptedLogs({
				logs: loadedLogs,
				ignoreAccounts
			});

			summary = {
				...summary,
				stage: "logs_loaded",
				total_logs_scanned: loadedLogs.length,
				total_logs_accepted: filteredLogs.acceptedLogs.length,
				total_logs_ignored_accounts: filteredLogs.ignoredAccountCount,
				total_logs_rejected_incomplete: filteredLogs.incompleteCount
			};

			if (repository.loadNasUserAliases && repository.loadProjectRoots) {
				const aliases = await repository.loadNasUserAliases(config.orgId);
				const projectRoots = await repository.loadProjectRoots(config.orgId);
				const candidates = aggregateCandidateItems({
					orgId: config.orgId,
					logs: filteredLogs.acceptedLogs,
					targetWorkDate: config.targetWorkDate,
					timezone: config.timezone,
					formalAllocationMode: config.allocationMode,
					largeGapThresholdMinutes: config.largeGapThresholdMinutes,
					skipFormalWriteOnLargeGap: config.skipFormalWriteOnLargeGap,
					aliases,
					projectRoots
				});

				summary = {
					...summary,
					stage: "candidates_aggregated",
					total_logs_unmapped_users: candidates.unmappedUserCount,
					total_logs_unmapped_projects: candidates.unmappedProjectCount,
					total_candidate_items: candidates.candidateItemCount,
					total_users_with_allocation_diagnostics: candidates.allocationDiagnostics.length,
					allocation_sample_rows: buildAllocationSampleRows({
						targetWorkDate: config.targetWorkDate,
						allocationDiagnostics: candidates.allocationDiagnostics
					}),
					allocation_diagnostics: candidates.allocationDiagnostics.map((entry) => ({
						nas_username: entry.nas_username,
						user_id: entry.user_id,
						raw_first_activity_at: entry.raw_first_activity_at,
						raw_last_activity_at: entry.raw_last_activity_at,
						raw_total_minutes: entry.raw_total_minutes,
						unattributed_minutes: entry.unattributed_minutes,
						attributed_total_minutes: entry.attributed_total_minutes,
						distinct_project_count: entry.distinct_project_count,
						large_gap_threshold_minutes: entry.large_gap_threshold_minutes,
						large_gap_hit: entry.large_gap_hit,
						largest_interval_minutes: entry.largest_interval_minutes,
						conservative_mode_hit: entry.conservative_mode_hit,
						conservative_mode_reason: entry.conservative_mode_reason,
						formal_write_skipped: entry.formal_write_skipped,
						formal_write_skip_reason: entry.formal_write_skip_reason,
						formal_allocation_mode: entry.formal_allocation_mode,
						allocation_method: entry.allocation_method,
						allocation_version: entry.allocation_version,
						project_minutes: entry.project_minutes.map((projectEntry) => ({
							project_id: projectEntry.project_id,
							project_root_id: projectEntry.project_root_id,
							raw_project_minutes: projectEntry.raw_project_minutes,
							normalized_project_minutes: projectEntry.normalized_project_minutes,
							formal_generated_minutes: projectEntry.formal_generated_minutes ?? null
						}))
					}))
				};

				if (!config.dryRun && repository.loadManualTaskUserIds && repository.insertRunItems) {
					const manualTaskUserIds = await repository.loadManualTaskUserIds(config.orgId, config.targetWorkDate);
					const runItemsResult = buildRunItems({
						candidateItems: candidates.candidateItems,
						manualOverrideUserIds: manualTaskUserIds,
						formalAllocationMode: config.allocationMode
					});
					const createdRun = await repository.createRun({
						org_id: config.orgId,
						target_work_date: config.targetWorkDate,
						source_kind: "asset_version_log",
						status: "running",
						started_at: now.toISOString(),
						summary: {
							stage: summary.stage,
							range_start: summary.range_start,
							range_end: summary.range_end,
							actions: summary.actions,
							source_table: config.sourceTable,
							total_logs_scanned: summary.total_logs_scanned,
							total_logs_accepted: summary.total_logs_accepted
						}
					});
					runId = createdRun.id;

					const insertedRunItems = await repository.insertRunItems(runId, runItemsResult.runItems);
					let totalTasksWritten = 0;
					let existingAutoTaskKeys: string[] = [];
					let deletedExistingAutoTaskIds: string[] = [];

					if (repository.insertTasks && repository.linkGeneratedTasks) {
						if (config.rebuildNasAuto && repository.deleteExistingAutoTasks) {
							deletedExistingAutoTaskIds = await repository.deleteExistingAutoTasks(
								config.orgId,
								config.targetWorkDate
							);
						}
						existingAutoTaskKeys = config.rebuildNasAuto
							? []
							: repository.loadExistingAutoTaskKeys
								? await repository.loadExistingAutoTaskKeys(config.orgId, config.targetWorkDate)
								: [];
						const taskInserts = buildTaskInserts({
							runId,
							runItems: insertedRunItems,
							existingAutoTaskKeys
						});

						if (taskInserts.length > 0) {
							const insertedTasks = await repository.insertTasks(runId, taskInserts);
							totalTasksWritten = insertedTasks.length;

							await repository.linkGeneratedTasks(
								insertedTasks.map((task) => ({
									run_item_id: task.source_item_id,
									generated_task_id: task.id
								}))
							);
						}
					}

					summary = {
						...summary,
						stage: totalTasksWritten > 0 ? "tasks_written" : "run_items_written",
						total_run_items_written: insertedRunItems.length,
						total_manual_override_items: runItemsResult.manualOverrideItems,
						total_policy_guard_items: runItemsResult.policyGuardItems,
						total_existing_auto_tasks_skipped: existingAutoTaskKeys.length,
						total_existing_auto_tasks_deleted: deletedExistingAutoTaskIds.length,
						total_tasks_written: totalTasksWritten
					};

					await repository.finalizeRun(runId, "completed", summary);

					return {
						runId,
						status: "completed",
						summary
					};
				}
			}
		}

		if (config.dryRun) {
			return {
				status: "dry-run",
				summary
			};
		}

		const createdRun = await repository.createRun({
			org_id: config.orgId,
			target_work_date: config.targetWorkDate,
			source_kind: "asset_version_log",
			status: "running",
			started_at: now.toISOString(),
			summary: {
				stage: summary.stage,
				range_start: summary.range_start,
				range_end: summary.range_end,
				actions: summary.actions,
				source_table: config.sourceTable,
				total_logs_scanned: summary.total_logs_scanned,
				total_logs_accepted: summary.total_logs_accepted
			}
		});
		runId = createdRun.id;

		await repository.finalizeRun(runId, "skipped", summary);

		return {
			runId,
			status: "skipped",
			summary
		};
	} catch (error) {
		if (runId) {
			await repository.finalizeRun(
				runId,
				"failed",
				summary,
				error instanceof Error ? error.message : String(error)
			);
		}

		throw error;
	}
};
