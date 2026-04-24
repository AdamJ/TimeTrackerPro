import {
	buildTargetDayWindow,
	type AutoTimeAction,
	type AutoTimeAllocationMode,
	type AutoTimeRunnerConfig
} from "./core.ts";

const DEFAULT_ACTIONS: AutoTimeAction[] = ["create", "write", "rename", "delete"];
const VALID_ACTIONS = new Set<AutoTimeAction>(DEFAULT_ACTIONS);
const VALID_ALLOCATION_MODES = new Set<AutoTimeAllocationMode>(["even_split", "interval_to_previous_project"]);
const DEFAULT_LARGE_GAP_THRESHOLD_MINUTES = 120;
const DEFAULT_SKIP_FORMAL_WRITE_ON_LARGE_GAP = false;

const readArgumentValue = (argv: string[], name: string): string | undefined => {
	const exactIndex = argv.findIndex((entry) => entry === name);
	if (exactIndex >= 0) {
		return argv[exactIndex + 1];
	}

	const prefix = `${name}=`;
	const matched = argv.find((entry) => entry.startsWith(prefix));
	return matched ? matched.slice(prefix.length) : undefined;
};

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
	if (!value) {
		return defaultValue;
	}

	if (value === "true") {
		return true;
	}

	if (value === "false") {
		return false;
	}

	throw new Error(`Invalid boolean value: ${value}`);
};

const parseActions = (value: string | undefined): AutoTimeAction[] => {
	if (!value) {
		return DEFAULT_ACTIONS;
	}

	const actions = value
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean) as AutoTimeAction[];

	if (actions.length === 0 || actions.some((entry) => !VALID_ACTIONS.has(entry))) {
		throw new Error(`Invalid action list: ${value}`);
	}

	return actions;
};

const parseAllocationMode = (value: string | undefined): AutoTimeAllocationMode => {
	if (!value) {
		return "interval_to_previous_project";
	}

	if (!VALID_ALLOCATION_MODES.has(value as AutoTimeAllocationMode)) {
		throw new Error(`Invalid allocation mode: ${value}`);
	}

	return value as AutoTimeAllocationMode;
};

const parsePositiveInteger = (value: string | undefined, defaultValue: number): number => {
	if (!value) {
		return defaultValue;
	}

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`Invalid positive integer: ${value}`);
	}

	return parsed;
};

export const createRunnerConfig = ({
	env = process.env,
	argv = process.argv.slice(2),
	now = new Date()
}: {
	env?: NodeJS.ProcessEnv;
	argv?: string[];
	now?: Date;
} = {}): AutoTimeRunnerConfig => {
	const timezone = readArgumentValue(argv, "--timezone") ?? env.SA_TIME_TIMEZONE ?? "Asia/Shanghai";
	const targetWorkDate = readArgumentValue(argv, "--date")
		?? env.SA_TIME_TARGET_WORK_DATE
		?? buildTargetDayWindow({
			now,
			timezone
		}).targetWorkDate;
	const dryRun = argv.includes("--dry-run") || env.SA_TIME_DRY_RUN === "true";
	const ignoreWeekends = parseBoolean(
		readArgumentValue(argv, "--ignore-weekends") ?? env.SA_TIME_IGNORE_WEEKENDS,
		true
	);

	const config: AutoTimeRunnerConfig = {
		orgId: readArgumentValue(argv, "--org-id") ?? env.SA_TIME_ORG_ID ?? "",
		supabaseUrl: env.SA_TIME_SUPABASE_URL ?? "",
		supabaseServiceRoleKey: env.SA_TIME_SUPABASE_SERVICE_ROLE_KEY ?? "",
		targetWorkDate,
		timezone,
		dryRun,
		ignoreWeekends,
		actions: parseActions(readArgumentValue(argv, "--actions") ?? env.SA_TIME_ACTIONS),
		sourceTable: env.SA_TIME_SOURCE_TABLE ?? "public.asset_version_log",
		allocationMode: parseAllocationMode(
			readArgumentValue(argv, "--allocation-mode") ?? env.SA_TIME_ALLOCATION_MODE
		),
		largeGapThresholdMinutes: parsePositiveInteger(
			readArgumentValue(argv, "--large-gap-threshold-minutes")
				?? env.SA_TIME_LARGE_GAP_THRESHOLD_MINUTES,
			DEFAULT_LARGE_GAP_THRESHOLD_MINUTES
		),
		skipFormalWriteOnLargeGap: parseBoolean(
			readArgumentValue(argv, "--skip-formal-write-on-large-gap")
				?? env.SA_TIME_SKIP_FORMAL_WRITE_ON_LARGE_GAP,
			DEFAULT_SKIP_FORMAL_WRITE_ON_LARGE_GAP
		),
		rebuildNasAuto: argv.includes("--rebuild-nas-auto")
			|| parseBoolean(env.SA_TIME_REBUILD_NAS_AUTO, false)
	};

	if (!config.orgId) {
		throw new Error("Missing SA_TIME_ORG_ID or --org-id");
	}

	if (!config.dryRun) {
		if (!config.supabaseUrl) {
			throw new Error("Missing SA_TIME_SUPABASE_URL");
		}

		if (!config.supabaseServiceRoleKey) {
			throw new Error("Missing SA_TIME_SUPABASE_SERVICE_ROLE_KEY");
		}
	}

	return config;
};
