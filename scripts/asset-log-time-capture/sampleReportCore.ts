type AllocationSampleRow = Record<string, unknown>;
type SampleReportSummary = ReturnType<typeof buildSampleReportSummary>;

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

const makeDateKey = (year: number, month: number, day: number): string =>
	`${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

const shiftDateKey = (value: string, offsetDays: number): string => {
	const { year, month, day } = parseDateKey(value);
	const shifted = new Date(Date.UTC(year, month - 1, day));
	shifted.setUTCDate(shifted.getUTCDate() + offsetDays);

	return makeDateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
};

const getDayOfWeek = (dateKey: string): number => new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();

const isWeekend = (dayOfWeek: number): boolean => dayOfWeek === 0 || dayOfWeek === 6;

export const buildRecentWorkDates = ({
	endDate,
	days
}: {
	endDate: string;
	days: number;
}): string[] => {
	if (days <= 0) {
		return [];
	}

	const collectedDates: string[] = [];
	let cursor = endDate;

	while (collectedDates.length < days) {
		if (!isWeekend(getDayOfWeek(cursor))) {
			collectedDates.push(cursor);
		}
		cursor = shiftDateKey(cursor, -1);
	}

	return collectedDates.reverse();
};

export const buildSampleReportSummary = ({
	targetDates,
	results
}: {
	targetDates: string[];
	results: Array<{
		target_work_date: string;
		allocation_sample_rows?: AllocationSampleRow[];
	}>;
}) => {
	const sampleRows = results.flatMap((result) => result.allocation_sample_rows ?? []);

	return {
		target_dates: targetDates,
		total_dates: targetDates.length,
		total_sample_rows: sampleRows.length,
		single_project_days: sampleRows.filter((row) => Number(row.distinct_project_count ?? 0) === 1).length,
		two_project_days: sampleRows.filter((row) => Number(row.distinct_project_count ?? 0) === 2).length,
		three_plus_project_days: sampleRows.filter((row) => Number(row.distinct_project_count ?? 0) >= 3).length,
		large_gap_hit_days: sampleRows.filter((row) => Boolean(row.large_gap_hit)).length,
		conservative_mode_hit_days: sampleRows.filter((row) => Boolean(row.conservative_mode_hit)).length,
		sample_rows: sampleRows
	};
};

const formatProjectList = (projects: unknown): string => {
	if (!Array.isArray(projects) || projects.length === 0) {
		return "-";
	}

	return projects
		.map((project) => {
			const entry = project as Record<string, unknown>;
			return `${entry.project_id ?? "unknown"}: raw ${entry.raw_project_minutes ?? 0}m, normalized ${entry.normalized_project_minutes ?? 0}m, formal ${entry.formal_generated_minutes ?? 0}m`;
		})
		.join("<br />");
};

export const buildSampleReportMarkdown = ({
	report
}: {
	report: SampleReportSummary;
}): string => {
	const startDate = String(report.target_dates[0] ?? "");
	const endDate = String(report.target_dates[report.target_dates.length - 1] ?? "");
	const sampleRows = Array.isArray(report.sample_rows) ? report.sample_rows : [];

	return [
		"# SA-TIME Allocation Sample Report",
		"",
		`Report Window: ${startDate} -> ${endDate}`,
		"",
		"## Summary",
		"",
		"| Metric | Value |",
		"| --- | --- |",
		`| Total Dates | ${report.total_dates} |`,
		`| Total Sample Rows | ${report.total_sample_rows} |`,
		`| Single Project Days | ${report.single_project_days} |`,
		`| Two Project Days | ${report.two_project_days} |`,
		`| Three+ Project Days | ${report.three_plus_project_days} |`,
		`| Large Gap Hit Days | ${report.large_gap_hit_days} |`,
		`| Conservative Mode Hit Days | ${report.conservative_mode_hit_days} |`,
		"",
		"## Sample Rows",
		"",
		"| User | User ID | Date | Last Activity | Raw Total | Unattributed | Large Gap | Conservative | Projects |",
		"| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
		...sampleRows.map((row) => {
			const entry = row as Record<string, unknown>;
			return `| ${entry.nas_username ?? "-"} | ${entry.user_id ?? "-"} | ${entry.target_work_date ?? "-"} | ${entry.raw_last_activity_at ?? "-"} | ${entry.raw_total_minutes ?? 0} | ${entry.unattributed_minutes ?? 0} | ${Boolean(entry.large_gap_hit) ? "yes" : "no"} | ${Boolean(entry.conservative_mode_hit) ? "yes" : "no"} | ${formatProjectList(entry.projects)} |`;
		}),
		""
	].join("\n");
};
