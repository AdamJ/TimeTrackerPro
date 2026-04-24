import {
	buildTargetDayWindow,
	type AutoTimeAction
} from "./core.ts";
import type { NasRootAutoParserConfig } from "./nasRootAutoParserCore.ts";

const DEFAULT_ACTIONS: AutoTimeAction[] = ["create", "write", "rename", "delete"];
const VALID_ACTIONS = new Set<AutoTimeAction>(DEFAULT_ACTIONS);
const DEFAULT_LOOKBACK_DAYS = 7;

const readArgumentValue = (argv: string[], name: string): string | undefined => {
	const exactIndex = argv.findIndex((entry) => entry === name);
	if (exactIndex >= 0) {
		return argv[exactIndex + 1];
	}

	const prefix = `${name}=`;
	const matched = argv.find((entry) => entry.startsWith(prefix));
	return matched ? matched.slice(prefix.length) : undefined;
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

const parsePositiveInteger = (value: string | undefined, defaultValue: number): number => {
	if (!value) {
		return defaultValue;
	}

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new Error(`Invalid non-negative integer: ${value}`);
	}

	return parsed;
};

export const createNasRootAutoParserConfig = ({
	env = process.env,
	argv = process.argv.slice(2),
	now = new Date()
}: {
	env?: NodeJS.ProcessEnv;
	argv?: string[];
	now?: Date;
} = {}): NasRootAutoParserConfig => {
	const timezone = readArgumentValue(argv, "--timezone") ?? env.SA_TIME_TIMEZONE ?? "Asia/Shanghai";
	const targetWorkDate = readArgumentValue(argv, "--date")
		?? env.SA_TIME_TARGET_WORK_DATE
		?? buildTargetDayWindow({
			now,
			timezone
		}).targetWorkDate;
	const dryRun = argv.includes("--dry-run") || env.SA_TIME_DRY_RUN === "true";

	const config: NasRootAutoParserConfig = {
		orgId: readArgumentValue(argv, "--org-id") ?? env.SA_TIME_ORG_ID ?? "",
		supabaseUrl: env.SA_TIME_SUPABASE_URL ?? "",
		supabaseServiceRoleKey: env.SA_TIME_SUPABASE_SERVICE_ROLE_KEY ?? "",
		sourceTable: env.SA_TIME_SOURCE_TABLE ?? "public.asset_version_log",
		targetWorkDate,
		timezone,
		dryRun,
		actions: parseActions(readArgumentValue(argv, "--actions") ?? env.SA_TIME_ACTIONS),
		lookbackDays: parsePositiveInteger(
			readArgumentValue(argv, "--lookback-days") ?? env.SA_TIME_NAS_ROOT_LOOKBACK_DAYS,
			DEFAULT_LOOKBACK_DAYS
		)
	};

	if (!config.orgId) {
		throw new Error("Missing SA_TIME_ORG_ID or --org-id");
	}

	if (!config.supabaseUrl) {
		throw new Error("Missing SA_TIME_SUPABASE_URL");
	}

	if (!config.supabaseServiceRoleKey) {
		throw new Error("Missing SA_TIME_SUPABASE_SERVICE_ROLE_KEY");
	}

	return config;
};
