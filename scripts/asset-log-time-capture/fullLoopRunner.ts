import fs from "node:fs/promises";
import path from "node:path";
import { getHolidayEntry } from "../../src/config/holidays.ts";
import { createRunnerConfig } from "./config.ts";
import {
	runAutoTimeCapture,
	type AutoTimeRunnerConfig,
	type AutoTimeRunnerRepository
} from "./core.ts";
import {
	buildAutoTimeDailyHealthReport,
	buildAutoTimeHealthMarkdown,
	type AutoTimeDailyHealthReport
} from "./healthReportCore.ts";
import { createNasRootAutoParserConfig } from "./nasRootAutoParserConfig.ts";
import {
	runNasRootAutoParser,
	type NasRootAutoParserConfig,
	type NasRootAutoParserRepository,
	type NasRootAutoParserSummary
} from "./nasRootAutoParserCore.ts";
import { createRepository } from "./repository.ts";

export type AutoTimeFullLoopRepository =
	& AutoTimeRunnerRepository
	& NasRootAutoParserRepository
	& {
		insertDailyHealthReport?: (report: AutoTimeDailyHealthReport) => Promise<void>;
	};

type ParserResult = Awaited<ReturnType<typeof runNasRootAutoParser>>;
type CaptureResult = Awaited<ReturnType<typeof runAutoTimeCapture>>;

const makeDateKey = (date: Date): string =>
	`${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;

const getLocalDateKey = (iso: string, timezone: string): string => {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).formatToParts(new Date(iso)).reduce<Record<string, string>>((acc, part) => {
		if (part.type !== "literal") {
			acc[part.type] = part.value;
		}
		return acc;
	}, {});

	return `${parts.year}-${parts.month}-${parts.day}`;
};

const enumerateDateKeys = (startDate: string, endDate: string): string[] => {
	const start = new Date(`${startDate}T00:00:00.000Z`);
	const end = new Date(`${endDate}T00:00:00.000Z`);
	const dates: string[] = [];

	for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
		dates.push(makeDateKey(cursor));
	}

	return dates;
};

const isWeekend = (dateKey: string): boolean => {
	const day = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
	return day === 0 || day === 6;
};

export const buildRebuildDatesFromParserSummary = ({
	parserSummary,
	timezone
}: {
	parserSummary: Pick<NasRootAutoParserSummary, "candidate_samples">;
	timezone: string;
}): string[] => {
	const dateSet = new Set<string>();

	for (const candidate of parserSummary.candidate_samples ?? []) {
		const status = candidate.candidate_status;
		if (status !== "auto_project_created" && status !== "auto_inserted") {
			continue;
		}

		const firstSeenAt = typeof candidate.first_seen_at === "string" ? candidate.first_seen_at : null;
		const lastSeenAt = typeof candidate.last_seen_at === "string" ? candidate.last_seen_at : null;
		if (!firstSeenAt || !lastSeenAt) {
			continue;
		}

		for (const dateKey of enumerateDateKeys(
			getLocalDateKey(firstSeenAt, timezone),
			getLocalDateKey(lastSeenAt, timezone)
		)) {
			if (!isWeekend(dateKey) && !getHolidayEntry(dateKey)?.isOffDay) {
				dateSet.add(dateKey);
			}
		}
	}

	return Array.from(dateSet).sort();
};

export const runAutoTimeFullLoop = async ({
	parserConfig,
	runnerConfig,
	repository,
	runParser = async (config, repo) => runNasRootAutoParser({
		config,
		repository: repo
	}),
	runCapture = async (config, repo) => runAutoTimeCapture({
		config,
		repository: repo
	}),
	reportsDir
}: {
	parserConfig: NasRootAutoParserConfig;
	runnerConfig: AutoTimeRunnerConfig;
	repository: AutoTimeFullLoopRepository;
	runParser?: (config: NasRootAutoParserConfig, repository: AutoTimeFullLoopRepository) => Promise<ParserResult>;
	runCapture?: (config: AutoTimeRunnerConfig, repository: AutoTimeFullLoopRepository) => Promise<CaptureResult>;
	reportsDir?: string;
}) => {
	const parserResult = await runParser(parserConfig, repository);
	const rebuildDates = buildRebuildDatesFromParserSummary({
		parserSummary: parserResult.summary,
		timezone: parserConfig.timezone
	});
	const rebuildResults: CaptureResult[] = [];

	for (const rebuildDate of rebuildDates) {
		rebuildResults.push(await runCapture({
			...runnerConfig,
			targetWorkDate: rebuildDate,
			rebuildNasAuto: true
		}, repository));
	}

	const normalResult = await runCapture({
		...runnerConfig,
		targetWorkDate: runnerConfig.targetWorkDate,
		rebuildNasAuto: false
	}, repository);
	const totalRebuildTasksWritten = rebuildResults.reduce(
		(total, result) => total + (result.summary.total_tasks_written ?? 0),
		0
	);
	const healthReport = buildAutoTimeDailyHealthReport({
		orgId: runnerConfig.orgId,
		targetWorkDate: runnerConfig.targetWorkDate,
		runId: normalResult.runId ?? null,
		parserSummary: {
			total_auto_created_projects: parserResult.summary.total_auto_created_projects,
			total_auto_inserted_roots: parserResult.summary.total_auto_inserted_roots,
			total_conflict_roots: parserResult.summary.total_conflict_roots,
			total_rejected_roots: parserResult.summary.total_rejected_roots
		},
		runnerSummary: {
			...normalResult.summary,
			total_tasks_written: (normalResult.summary.total_tasks_written ?? 0) + totalRebuildTasksWritten,
			total_existing_auto_tasks_deleted: rebuildResults.length
		}
	});
	healthReport.total_rebuild_dates_queued = rebuildDates.length;
	healthReport.total_rebuild_dates_completed = rebuildResults.length;

	if (repository.insertDailyHealthReport) {
		await repository.insertDailyHealthReport(healthReport);
	}

	if (reportsDir) {
		await fs.mkdir(reportsDir, {
			recursive: true
		});
		await fs.writeFile(
			path.join(reportsDir, `${runnerConfig.targetWorkDate}-health.json`),
			`${JSON.stringify(healthReport, null, 2)}\n`
		);
		await fs.writeFile(
			path.join(reportsDir, `${runnerConfig.targetWorkDate}-health.md`),
			`${buildAutoTimeHealthMarkdown(healthReport)}\n`
		);
	}

	return {
		parserResult,
		rebuildDates,
		rebuildResults,
		normalResult,
		healthReport
	};
};

const main = async () => {
	const parserConfig = createNasRootAutoParserConfig();
	const runnerConfig = createRunnerConfig();
	const repository = createRepository(
		runnerConfig.supabaseUrl,
		runnerConfig.supabaseServiceRoleKey
	);
	const reportsDir = process.env.SA_TIME_HEALTH_REPORT_DIR ?? "/logs/reports";
	const result = await runAutoTimeFullLoop({
		parserConfig,
		runnerConfig,
		repository,
		reportsDir
	});

	console.log(JSON.stringify({
		status: result.normalResult.status,
		runId: result.normalResult.runId ?? null,
		rebuildDates: result.rebuildDates,
		healthReport: result.healthReport
	}, null, 2));
};

if (process.argv[1]?.endsWith("fullLoopRunner.ts")) {
	main().catch((error) => {
		console.error("[asset-log-time-capture] full loop runner failed");
		console.error(error);
		process.exitCode = 1;
	});
}
