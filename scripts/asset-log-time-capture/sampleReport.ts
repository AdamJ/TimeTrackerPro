import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRunnerConfig } from "./config.ts";
import { runAutoTimeCapture } from "./core.ts";
import { createRepository } from "./repository.ts";
import { buildRecentWorkDates, buildSampleReportMarkdown, buildSampleReportSummary } from "./sampleReportCore.ts";

const readArgumentValue = (argv: string[], name: string): string | undefined => {
	const exactIndex = argv.findIndex((entry) => entry === name);
	if (exactIndex >= 0) {
		return argv[exactIndex + 1];
	}

	const prefix = `${name}=`;
	const matched = argv.find((entry) => entry.startsWith(prefix));
	return matched ? matched.slice(prefix.length) : undefined;
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

const main = async () => {
	const argv = process.argv.slice(2);
	const baseConfig = createRunnerConfig({
		argv
	});

	if (!baseConfig.supabaseUrl || !baseConfig.supabaseServiceRoleKey) {
		throw new Error("sample-report requires SA_TIME_SUPABASE_URL and SA_TIME_SUPABASE_SERVICE_ROLE_KEY");
	}

	const days = parsePositiveInteger(readArgumentValue(argv, "--days"), 7);
	const endDate = readArgumentValue(argv, "--end-date") ?? baseConfig.targetWorkDate;
	const markdownOutputPath = readArgumentValue(argv, "--markdown-output");
	const targetDates = buildRecentWorkDates({
		endDate,
		days
	});
	const repository = createRepository(baseConfig.supabaseUrl, baseConfig.supabaseServiceRoleKey);
	const results = [];

	for (const targetWorkDate of targetDates) {
		const result = await runAutoTimeCapture({
			config: {
				...baseConfig,
				targetWorkDate,
				dryRun: true
			},
			repository
		});

		results.push({
			status: result.status,
			target_work_date: targetWorkDate,
			allocation_sample_rows: result.summary.allocation_sample_rows ?? [],
			allocation_diagnostics: result.summary.allocation_diagnostics ?? []
		});
	}

	const report = buildSampleReportSummary({
		targetDates,
		results
	});

	if (markdownOutputPath) {
		const resolvedPath = path.resolve(markdownOutputPath);
		await mkdir(path.dirname(resolvedPath), {
			recursive: true
		});
		await writeFile(
			resolvedPath,
			buildSampleReportMarkdown({
				report
			}),
			"utf8"
		);
	}

	console.log(JSON.stringify({
		report,
		results,
		markdown_output_path: markdownOutputPath ? path.resolve(markdownOutputPath) : null
	}, null, 2));
};

main().catch((error) => {
	console.error("[asset-log-time-capture] sample report failed");
	console.error(error);
	process.exitCode = 1;
});
