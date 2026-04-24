import type {
	AutoTimeAction,
	AutoTimeAssetLog,
	AutoTimeProjectRoot,
	LoadAssetLogsParams
} from "./core.ts";

export type NasRootAutoParserStatus = "completed" | "dry-run";
export type NasRootCandidateMatchMethod = "code_exact" | "name_exact" | "none";
export type NasRootCandidateStatus =
	| "auto_inserted"
	| "auto_project_created"
	| "auto_root_inserted"
	| "rebuild_queued"
	| "rebuild_completed"
	| "pending_review"
	| "missing_project_master"
	| "rejected"
	| "rejected_by_rule"
	| "conflict_needs_manual_fix"
	| "failed";

export type NasRootAutoParserConfig = {
	orgId: string;
	supabaseUrl: string;
	supabaseServiceRoleKey: string;
	sourceTable: string;
	targetWorkDate: string;
	timezone: string;
	dryRun: boolean;
	actions: AutoTimeAction[];
	lookbackDays: number;
};

export type NasRootProjectRecord = {
	id: string;
	name: string | null;
	source_project_code: string | null;
	status: string | null;
};

export type NasRootProjectInsert = {
	org_id: string;
	name: string;
	source_project_code: string | null;
	status: "active";
};

export type NasRootProjectRootInsert = {
	org_id: string;
	project_id: string;
	root_path: string;
	notes: string | null;
};

export type NasRootProjectActionInsert = {
	org_id: string;
	target_work_date: string;
	candidate_root_path: string;
	parsed_project_code: string | null;
	parsed_project_name: string | null;
	action_type:
		| "auto_create_project"
		| "auto_insert_root"
		| "queue_rebuild"
		| "complete_rebuild"
		| "reject_candidate"
		| "conflict_candidate"
		| "fail_candidate";
	action_status: "completed" | "skipped" | "failed";
	project_id: string | null;
	project_root_id: string | null;
	run_id: string | null;
	rebuild_target_work_date: string | null;
	reason: string | null;
	metadata: Record<string, unknown>;
};

export type NasRootProjectRootCandidateUpsert = {
	org_id: string;
	candidate_root_path: string;
	normalized_root_path: string;
	parsed_project_code: string | null;
	parsed_project_name: string | null;
	matched_project_id: string | null;
	match_method: NasRootCandidateMatchMethod;
	confidence_score: number;
	candidate_status: NasRootCandidateStatus;
	sample_log_count: number;
	first_seen_at: string | null;
	last_seen_at: string | null;
	sample_paths: string[];
	promoted_root_id: string | null;
	notes: string | null;
};

export type NasRootAutoParserSummary = {
	stage: string;
	target_work_date: string;
	timezone: string;
	range_start: string;
	range_end: string;
	actions: AutoTimeAction[];
	total_logs_scanned: number;
	total_logs_accepted: number;
	total_logs_ignored_accounts: number;
	total_logs_rejected_incomplete: number;
	total_existing_project_hits: number;
	total_candidate_roots: number;
	total_auto_created_projects: number;
	total_auto_inserted_roots: number;
	total_pending_review_roots: number;
	total_missing_project_master_roots: number;
	total_conflict_roots: number;
	total_rejected_roots: number;
	candidate_samples: Array<Record<string, unknown>>;
};

export type NasRootAutoParserRepository = {
	loadAssetLogs: (params: LoadAssetLogsParams) => Promise<AutoTimeAssetLog[]>;
	loadIgnoreAccounts?: (orgId: string) => Promise<string[]>;
	loadProjectRoots: (orgId: string) => Promise<AutoTimeProjectRoot[]>;
	loadProjects: (orgId: string) => Promise<NasRootProjectRecord[]>;
	createProjects?: (items: NasRootProjectInsert[]) => Promise<NasRootProjectRecord[]>;
	insertProjectRoots?: (items: NasRootProjectRootInsert[]) => Promise<AutoTimeProjectRoot[]>;
	insertProjectActions?: (items: NasRootProjectActionInsert[]) => Promise<void>;
	upsertProjectRootCandidates?: (items: NasRootProjectRootCandidateUpsert[]) => Promise<void>;
};

type NasRootCandidateAggregation = {
	candidate_root_path: string;
	normalized_root_path: string;
	parsed_project_code: string | null;
	parsed_project_name: string | null;
	sample_log_count: number;
	first_seen_at: string | null;
	last_seen_at: string | null;
	sample_paths: string[];
};

type NasRootMatchDecision = {
	matched_project_id: string | null;
	match_method: NasRootCandidateMatchMethod;
	confidence_score: number;
	candidate_status: NasRootCandidateStatus;
	notes: string | null;
};

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

const sanitizePath = (value: string | null | undefined): string =>
	(value ?? "")
		.trim()
		.replace(/\\/g, "/")
		.replace(/\/{2,}/g, "/")
		.replace(/\/+$/, "");

const normalizePath = (value: string | null | undefined): string =>
	sanitizePath(value).toLowerCase();

const normalizeNasUsername = (value: string | null | undefined): string =>
	value?.trim().toLowerCase() ?? "";

const normalizeProjectCode = (value: string | null | undefined): string | null => {
	const normalized = value?.trim().toUpperCase() ?? "";
	return normalized || null;
};

const normalizeProjectName = (value: string | null | undefined): string => {
	const normalized = value
		?.trim()
		.normalize("NFKC")
		.replace(/[\s_\-()（）[\]【】]+/g, "")
		.toLowerCase() ?? "";

	return normalized;
};

const REJECTED_PROJECT_NAMES = new Set([
	"新建文件夹",
	"新建文件夹->",
	"serverbackup",
	"chatimages",
	"consolelog",
	"项目梳理",
	"000000项目梳理",
	"backup",
	"temp",
	"tmp",
	"test"
]);

const buildDateRange = (targetWorkDate: string, timezone: string, lookbackDays: number) => ({
	rangeStartIso: zonedDateKeyToUtcIso(shiftDateKey(targetWorkDate, -lookbackDays), timezone),
	rangeEndIso: zonedDateKeyToUtcIso(shiftDateKey(targetWorkDate, 1), timezone)
});

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
		const normalizedPath = sanitizePath(log.file_path);

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

const buildSortedProjectRoots = (roots: AutoTimeProjectRoot[]): Array<AutoTimeProjectRoot & { normalized_root_path: string }> =>
	roots
		.map((root) => ({
			...root,
			normalized_root_path: normalizePath(root.root_path)
		}))
		.filter((root) => Boolean(root.normalized_root_path))
		.sort((left, right) => right.normalized_root_path.length - left.normalized_root_path.length);

const resolveProjectRoot = (
	log: AutoTimeAssetLog,
	projectRoots: Array<AutoTimeProjectRoot & { normalized_root_path: string }>
) => {
	const normalizedFilePath = normalizePath(log.file_path);

	return projectRoots.find((root) =>
		normalizedFilePath === root.normalized_root_path
		|| normalizedFilePath.startsWith(`${root.normalized_root_path}/`)
	) ?? null;
};

const extractCandidateRootPath = (filePath: string | null | undefined): string | null => {
	const sanitized = sanitizePath(filePath);
	if (!sanitized) {
		return null;
	}

	const segments = sanitized.split("/").filter(Boolean);
	const baseIndex = segments.findIndex((segment) => /^daga-\d{4}-project$/i.test(segment));
	if (baseIndex < 0 || baseIndex >= segments.length - 1) {
		return null;
	}

	const baseSegment = segments[baseIndex];
	const firstProjectSegment = segments[baseIndex + 1];
	if (!firstProjectSegment) {
		return null;
	}

	if (/^concept$/i.test(firstProjectSegment)) {
		const secondProjectSegment = segments[baseIndex + 2];
		if (!secondProjectSegment) {
			return null;
		}

		return `/${baseSegment}/${firstProjectSegment}/${secondProjectSegment}`;
	}

	return `/${baseSegment}/${firstProjectSegment}`;
};

const extractProjectCode = (candidateRootPath: string): string | null => {
	const match = /(C\d{8}|D\d{4})/i.exec(candidateRootPath);
	return match ? match[1].toUpperCase() : null;
};

const extractProjectName = (candidateRootPath: string, projectCode: string | null): string | null => {
	const segments = sanitizePath(candidateRootPath).split("/").filter(Boolean);
	const projectSegment = segments[segments.length - 1] ?? "";
	const withoutCode = projectCode
		? projectSegment.replace(new RegExp(projectCode, "i"), "")
		: projectSegment;
	const normalized = withoutCode.replace(/^[-_\s]+/, "").trim();

	return normalized || null;
};

const buildProjectIndexes = (projects: NasRootProjectRecord[]) => {
	const activeProjects = projects.filter((project) => project.status === "active");
	const projectCodes = new Map<string, NasRootProjectRecord[]>();
	const projectNames = new Map<string, NasRootProjectRecord[]>();

	for (const project of activeProjects) {
		const projectCode = normalizeProjectCode(project.source_project_code);
		if (projectCode) {
			const entries = projectCodes.get(projectCode) ?? [];
			entries.push(project);
			projectCodes.set(projectCode, entries);
		}

		const projectName = normalizeProjectName(project.name);
		if (projectName) {
			const entries = projectNames.get(projectName) ?? [];
			entries.push(project);
			projectNames.set(projectName, entries);
		}
	}

	return {
		projectCodes,
		projectNames
	};
};

const shouldRejectCandidateByRule = ({
	parsedProjectCode,
	parsedProjectName,
	candidateRootPath
}: {
	parsedProjectCode: string | null;
	parsedProjectName: string | null;
	candidateRootPath: string;
}): boolean => {
	if (parsedProjectCode === "000000") {
		return true;
	}

	const normalizedName = normalizeProjectName(parsedProjectName);
	const normalizedPathSegment = normalizeProjectName(sanitizePath(candidateRootPath).split("/").filter(Boolean).at(-1));
	const normalizedPath = normalizeProjectName(candidateRootPath);

	return REJECTED_PROJECT_NAMES.has(normalizedName)
		|| REJECTED_PROJECT_NAMES.has(normalizedPathSegment)
		|| normalizedPath.endsWith("consolelog")
		|| normalizedPath.includes("serverbackup")
		|| normalizedPath.includes("chatimages")
		|| normalizedName.startsWith("000000");
};

const decideCandidateMatch = ({
	candidateRootPath,
	parsedProjectCode,
	parsedProjectName,
	projectIndexes
}: {
	candidateRootPath: string;
	parsedProjectCode: string | null;
	parsedProjectName: string | null;
	projectIndexes: ReturnType<typeof buildProjectIndexes>;
}): NasRootMatchDecision => {
	if (shouldRejectCandidateByRule({
		parsedProjectCode,
		parsedProjectName,
		candidateRootPath
	})) {
		return {
			matched_project_id: null,
			match_method: "none",
			confidence_score: 0,
			candidate_status: "rejected_by_rule",
			notes: "candidate root rejected by auto-create guard"
		};
	}

	if (parsedProjectCode) {
		const matchedByCode = projectIndexes.projectCodes.get(parsedProjectCode) ?? [];
		if (matchedByCode.length === 1) {
			return {
				matched_project_id: matchedByCode[0].id,
				match_method: "code_exact",
				confidence_score: 1,
				candidate_status: "auto_inserted",
				notes: `source_project_code ${parsedProjectCode} matched exactly once`
			};
		}

		if (matchedByCode.length > 1) {
			return {
				matched_project_id: null,
				match_method: "code_exact",
				confidence_score: 0.4,
				candidate_status: "conflict_needs_manual_fix",
				notes: `source_project_code ${parsedProjectCode} matched multiple active projects`
			};
		}
	}

	if (parsedProjectName) {
		const normalizedProjectName = normalizeProjectName(parsedProjectName);
		const matchedByName = projectIndexes.projectNames.get(normalizedProjectName) ?? [];
		if (matchedByName.length === 1) {
			return {
				matched_project_id: matchedByName[0].id,
				match_method: "name_exact",
				confidence_score: 0.6,
				candidate_status: "pending_review",
				notes: `project name ${parsedProjectName} matched exactly once`
			};
		}

		if (matchedByName.length > 1) {
			return {
				matched_project_id: null,
				match_method: "name_exact",
				confidence_score: 0.3,
				candidate_status: "pending_review",
				notes: `project name ${parsedProjectName} matched multiple active projects`
			};
		}
	}

	if (parsedProjectCode || parsedProjectName) {
		return {
			matched_project_id: null,
			match_method: "none",
			confidence_score: 0,
			candidate_status: "missing_project_master",
			notes: "parsed project code or name did not match active project master data"
		};
	}

	return {
		matched_project_id: null,
		match_method: "none",
		confidence_score: 0,
		candidate_status: "rejected",
		notes: "could not extract project code or project name from candidate path"
	};
};

const buildCandidateRows = ({
	orgId,
	logs,
	projectRoots,
	projects
}: {
	orgId: string;
	logs: AutoTimeAssetLog[];
	projectRoots: AutoTimeProjectRoot[];
	projects: NasRootProjectRecord[];
}) => {
	const sortedProjectRoots = buildSortedProjectRoots(projectRoots);
	const projectIndexes = buildProjectIndexes(projects);
	const candidateMap = new Map<string, NasRootCandidateAggregation>();
	let existingProjectHitCount = 0;
	let rejectedRootCount = 0;

	for (const log of logs) {
		const resolvedProjectRoot = resolveProjectRoot(log, sortedProjectRoots);
		if (resolvedProjectRoot) {
			existingProjectHitCount += 1;
			continue;
		}

		const candidateRootPath = extractCandidateRootPath(log.file_path);
		if (!candidateRootPath) {
			rejectedRootCount += 1;
			continue;
		}

		const normalizedRootPath = normalizePath(candidateRootPath);
		const parsedProjectCode = extractProjectCode(candidateRootPath);
		const parsedProjectName = extractProjectName(candidateRootPath, parsedProjectCode);
		const existing = candidateMap.get(normalizedRootPath);

		if (existing) {
			existing.sample_log_count += 1;
			existing.first_seen_at = existing.first_seen_at && existing.first_seen_at < log.detected_at
				? existing.first_seen_at
				: log.detected_at;
			existing.last_seen_at = existing.last_seen_at && existing.last_seen_at > log.detected_at
				? existing.last_seen_at
				: log.detected_at;
			const sanitizedFilePath = sanitizePath(log.file_path);
			if (sanitizedFilePath && !existing.sample_paths.includes(sanitizedFilePath)) {
				existing.sample_paths.push(sanitizedFilePath);
			}
			continue;
		}

		candidateMap.set(normalizedRootPath, {
			candidate_root_path: candidateRootPath,
			normalized_root_path: normalizedRootPath,
			parsed_project_code: parsedProjectCode,
			parsed_project_name: parsedProjectName,
			sample_log_count: 1,
			first_seen_at: log.detected_at,
			last_seen_at: log.detected_at,
			sample_paths: sanitizePath(log.file_path) ? [sanitizePath(log.file_path)] : []
		});
	}

	const candidateRows = Array.from(candidateMap.values())
		.sort((left, right) => left.candidate_root_path.localeCompare(right.candidate_root_path))
		.map((candidate) => {
			const matchDecision = decideCandidateMatch({
				candidateRootPath: candidate.candidate_root_path,
				parsedProjectCode: candidate.parsed_project_code,
				parsedProjectName: candidate.parsed_project_name,
				projectIndexes
			});

			return {
				org_id: orgId,
				candidate_root_path: candidate.candidate_root_path,
				normalized_root_path: candidate.normalized_root_path,
				parsed_project_code: candidate.parsed_project_code,
				parsed_project_name: candidate.parsed_project_name,
				matched_project_id: matchDecision.matched_project_id,
				match_method: matchDecision.match_method,
				confidence_score: matchDecision.confidence_score,
				candidate_status: matchDecision.candidate_status,
				sample_log_count: candidate.sample_log_count,
				first_seen_at: candidate.first_seen_at,
				last_seen_at: candidate.last_seen_at,
				sample_paths: candidate.sample_paths,
				promoted_root_id: null,
				notes: matchDecision.notes
			} satisfies NasRootProjectRootCandidateUpsert;
		});

	return {
		candidateRows,
		existingProjectHitCount,
		rejectedRootCount
	};
};

const attachPromotedRootIds = ({
	candidateRows,
	insertedRoots
}: {
	candidateRows: NasRootProjectRootCandidateUpsert[];
	insertedRoots: AutoTimeProjectRoot[];
}) => {
	const insertedRootIdByPath = new Map(
		insertedRoots.map((root) => [normalizePath(root.root_path), root.id] as const)
	);

	return candidateRows.map((candidate) =>
		(candidate.candidate_status === "auto_inserted" || candidate.candidate_status === "auto_project_created")
			? {
				...candidate,
				promoted_root_id: insertedRootIdByPath.get(candidate.normalized_root_path) ?? null
			}
			: candidate
	);
};

const buildProjectKey = (candidate: Pick<NasRootProjectRootCandidateUpsert, "parsed_project_code" | "normalized_root_path">): string =>
	candidate.parsed_project_code ?? candidate.normalized_root_path;

const buildProjectAction = ({
	orgId,
	targetWorkDate,
	candidate,
	actionType,
	actionStatus,
	projectId = null,
	projectRootId = null,
	reason = null,
	metadata = {}
}: {
	orgId: string;
	targetWorkDate: string;
	candidate: NasRootProjectRootCandidateUpsert;
	actionType: NasRootProjectActionInsert["action_type"];
	actionStatus: NasRootProjectActionInsert["action_status"];
	projectId?: string | null;
	projectRootId?: string | null;
	reason?: string | null;
	metadata?: Record<string, unknown>;
}): NasRootProjectActionInsert => ({
	org_id: orgId,
	target_work_date: targetWorkDate,
	candidate_root_path: candidate.candidate_root_path,
	parsed_project_code: candidate.parsed_project_code,
	parsed_project_name: candidate.parsed_project_name,
	action_type: actionType,
	action_status: actionStatus,
	project_id: projectId,
	project_root_id: projectRootId,
	run_id: null,
	rebuild_target_work_date: null,
	reason,
	metadata
});

const markDuplicateNewProjectCodesAsConflicts = (
	candidateRows: NasRootProjectRootCandidateUpsert[]
): NasRootProjectRootCandidateUpsert[] => {
	const candidatesByCode = new Map<string, NasRootProjectRootCandidateUpsert[]>();

	for (const candidate of candidateRows) {
		if (candidate.candidate_status !== "missing_project_master" || !candidate.parsed_project_code) {
			continue;
		}

		const existing = candidatesByCode.get(candidate.parsed_project_code) ?? [];
		existing.push(candidate);
		candidatesByCode.set(candidate.parsed_project_code, existing);
	}

	const duplicateCodes = new Set(
		Array.from(candidatesByCode.entries())
			.filter(([, candidates]) => candidates.length > 1)
			.map(([projectCode]) => projectCode)
	);

	if (duplicateCodes.size === 0) {
		return candidateRows;
	}

	return candidateRows.map((candidate) =>
		candidate.parsed_project_code && duplicateCodes.has(candidate.parsed_project_code)
			? {
				...candidate,
				candidate_status: "conflict_needs_manual_fix",
				match_method: "code_exact",
				confidence_score: 0.4,
				matched_project_id: null,
				notes: `source_project_code ${candidate.parsed_project_code} appears in multiple new NAS candidates`
			}
			: candidate
	);
};

export const runNasRootAutoParser = async ({
	config,
	repository
}: {
	config: NasRootAutoParserConfig;
	repository: NasRootAutoParserRepository;
}): Promise<{
	status: NasRootAutoParserStatus;
	summary: NasRootAutoParserSummary;
}> => {
	const window = buildDateRange(config.targetWorkDate, config.timezone, config.lookbackDays);
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
	const [projectRoots, projects] = await Promise.all([
		repository.loadProjectRoots(config.orgId),
		repository.loadProjects(config.orgId)
	]);
	const builtCandidates = buildCandidateRows({
		orgId: config.orgId,
		logs: filteredLogs.acceptedLogs,
		projectRoots,
		projects
	});
	const candidateRows = markDuplicateNewProjectCodesAsConflicts(builtCandidates.candidateRows);
	const autoInsertCandidates: NasRootProjectRootCandidateUpsert[] = candidateRows.filter((candidate) =>
		candidate.candidate_status === "auto_inserted"
		&& Boolean(candidate.matched_project_id)
	);
	const autoProjectCandidates: NasRootProjectRootCandidateUpsert[] = candidateRows.filter((candidate) =>
		candidate.candidate_status === "missing_project_master"
		&& Boolean(candidate.parsed_project_code)
		&& Boolean(candidate.parsed_project_name)
	);
	let persistedCandidates: NasRootProjectRootCandidateUpsert[] = candidateRows;
	let autoCreatedProjectCount = 0;
	const actionRows: NasRootProjectActionInsert[] = [];

	if (!config.dryRun && autoProjectCandidates.length > 0 && repository.createProjects) {
		const createdProjects = await repository.createProjects(
			autoProjectCandidates.map((candidate) => ({
				org_id: config.orgId,
				name: candidate.parsed_project_name as string,
				source_project_code: candidate.parsed_project_code,
				status: "active"
			}))
		);
		autoCreatedProjectCount = createdProjects.length;
		const createdProjectByKey = new Map(
			createdProjects.map((project, index) => [
				buildProjectKey(autoProjectCandidates[index]),
				project
			] as const)
		);

		persistedCandidates = persistedCandidates.map((candidate) => {
			if (!autoProjectCandidates.includes(candidate)) {
				return candidate;
			}

			const createdProject = createdProjectByKey.get(buildProjectKey(candidate));
			if (!createdProject) {
				return {
					...candidate,
					candidate_status: "failed" as const,
					notes: "auto project creation did not return a matching project"
				};
			}

			actionRows.push(buildProjectAction({
				orgId: config.orgId,
				targetWorkDate: config.targetWorkDate,
				candidate,
				actionType: "auto_create_project",
				actionStatus: "completed",
				projectId: createdProject.id,
				reason: `auto created active project ${createdProject.source_project_code ?? createdProject.name}`
			}));

			return {
				...candidate,
				matched_project_id: createdProject.id,
				match_method: "code_exact" as const,
				confidence_score: 1,
				candidate_status: "auto_project_created" as const,
				notes: `auto created active project ${createdProject.source_project_code ?? createdProject.name}`
			};
		});
	}

	const projectRootInsertCandidates = persistedCandidates.filter((candidate) =>
		(candidate.candidate_status === "auto_inserted" || candidate.candidate_status === "auto_project_created")
		&& Boolean(candidate.matched_project_id)
	);

	if (!config.dryRun && projectRootInsertCandidates.length > 0 && repository.insertProjectRoots) {
		const insertedRoots = await repository.insertProjectRoots(
			projectRootInsertCandidates.map((candidate) => ({
				org_id: config.orgId,
				project_id: candidate.matched_project_id as string,
				root_path: candidate.candidate_root_path,
				notes: `Auto inserted from NAS root parser for ${config.targetWorkDate}`
			}))
		);
		persistedCandidates = attachPromotedRootIds({
			candidateRows: persistedCandidates,
			insertedRoots
		});

		const insertedRootByPath = new Map(
			insertedRoots.map((root) => [normalizePath(root.root_path), root] as const)
		);
		for (const candidate of projectRootInsertCandidates) {
			const insertedRoot = insertedRootByPath.get(candidate.normalized_root_path);
			if (insertedRoot) {
				actionRows.push(buildProjectAction({
					orgId: config.orgId,
					targetWorkDate: config.targetWorkDate,
					candidate,
					actionType: "auto_insert_root",
					actionStatus: "completed",
					projectId: candidate.matched_project_id,
					projectRootId: insertedRoot.id,
					reason: `auto inserted project NAS root for ${candidate.candidate_root_path}`
				}));
			}
		}
	}

	if (!config.dryRun) {
		for (const candidate of persistedCandidates) {
			if (candidate.candidate_status === "rejected_by_rule") {
				actionRows.push(buildProjectAction({
					orgId: config.orgId,
					targetWorkDate: config.targetWorkDate,
					candidate,
					actionType: "reject_candidate",
					actionStatus: "skipped",
					reason: candidate.notes
				}));
			}
			if (candidate.candidate_status === "conflict_needs_manual_fix") {
				actionRows.push(buildProjectAction({
					orgId: config.orgId,
					targetWorkDate: config.targetWorkDate,
					candidate,
					actionType: "conflict_candidate",
					actionStatus: "skipped",
					reason: candidate.notes
				}));
			}
		}
	}

	if (!config.dryRun && actionRows.length > 0 && repository.insertProjectActions) {
		await repository.insertProjectActions(actionRows);
	}

	if (!config.dryRun && repository.upsertProjectRootCandidates) {
		await repository.upsertProjectRootCandidates(persistedCandidates);
	}

	const summary: NasRootAutoParserSummary = {
		stage: config.dryRun
			? "candidates_built"
			: projectRootInsertCandidates.length > 0
				? "project_roots_updated"
				: "candidates_persisted",
		target_work_date: config.targetWorkDate,
		timezone: config.timezone,
		range_start: window.rangeStartIso,
		range_end: window.rangeEndIso,
		actions: config.actions,
		total_logs_scanned: loadedLogs.length,
		total_logs_accepted: filteredLogs.acceptedLogs.length,
		total_logs_ignored_accounts: filteredLogs.ignoredAccountCount,
		total_logs_rejected_incomplete: filteredLogs.incompleteCount,
		total_existing_project_hits: builtCandidates.existingProjectHitCount,
		total_candidate_roots: persistedCandidates.length,
		total_auto_created_projects: autoCreatedProjectCount,
		total_auto_inserted_roots: persistedCandidates.filter((candidate) =>
			(candidate.candidate_status === "auto_inserted" || candidate.candidate_status === "auto_project_created")
			&& Boolean(candidate.promoted_root_id)
		).length,
		total_pending_review_roots: persistedCandidates.filter((candidate) => candidate.candidate_status === "pending_review").length,
		total_missing_project_master_roots: persistedCandidates.filter((candidate) => candidate.candidate_status === "missing_project_master").length,
		total_conflict_roots: persistedCandidates.filter((candidate) => candidate.candidate_status === "conflict_needs_manual_fix").length,
		total_rejected_roots: builtCandidates.rejectedRootCount
			+ persistedCandidates.filter((candidate) => candidate.candidate_status === "rejected_by_rule").length,
		candidate_samples: persistedCandidates.map((candidate) => ({
			candidate_root_path: candidate.candidate_root_path,
			parsed_project_code: candidate.parsed_project_code,
			parsed_project_name: candidate.parsed_project_name,
			matched_project_id: candidate.matched_project_id,
			match_method: candidate.match_method,
			candidate_status: candidate.candidate_status,
			promoted_root_id: candidate.promoted_root_id,
			sample_log_count: candidate.sample_log_count,
			first_seen_at: candidate.first_seen_at,
			last_seen_at: candidate.last_seen_at
		}))
	};

	return {
		status: config.dryRun ? "dry-run" : "completed",
		summary
	};
};
