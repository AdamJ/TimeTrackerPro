import { Task, DayRecord, Project, InvoiceData } from "@/contexts/TimeTrackingContext";
import { TaskCategory } from "@/config/categories";
import { generateDailySummary } from "@/utils/timeUtil";
import { getTotalHoursForPeriod, getRevenueForPeriod } from "@/utils/calculationUtils";

export function exportToCSV(
	archivedDays: DayRecord[],
	projects: Project[],
	categories: TaskCategory[],
	userId: string,
	startDate?: Date,
	endDate?: Date
): string {
	let filteredDays = archivedDays;

	if (startDate && endDate) {
		filteredDays = archivedDays.filter(day => {
			const dayDate = new Date(day.startTime);
			return dayDate >= startDate && dayDate <= endDate;
		});
	}

	const headers = [
		"id",
		"user_id",
		"title",
		"description",
		"start_time",
		"end_time",
		"duration",
		"project_id",
		"project_name",
		"client",
		"category_id",
		"category_name",
		"day_record_id",
		"is_current",
		"inserted_at",
		"updated_at",
		"daily_summary"
	];
	const rows = [headers.join(",")];

	const projectMap = new Map(projects.map(p => [p.name, p]));
	const categoryMap = new Map(categories.map(c => [c.id, c]));

	filteredDays.forEach(day => {
		const dayDescriptions = day.tasks.filter(t => t.description).map(t => t.description!);
		const dailySummary = generateDailySummary(dayDescriptions);

		day.tasks.forEach(task => {
			if (task.duration) {
				const project = projectMap.get(task.project ?? "");
				const category = categoryMap.get(task.category ?? "");

				const startTimeISO = task.startTime.toISOString();
				const endTimeISO = task.endTime?.toISOString() || "";
				const insertedAtISO = task.insertedAt?.toISOString() || new Date().toISOString();
				const updatedAtISO = task.updatedAt?.toISOString() || new Date().toISOString();

				const row = [
					`"${task.id}"`,
					`"${userId}"`,
					`"${task.title}"`,
					`"${task.description || ""}"`,
					`"${startTimeISO}"`,
					`"${endTimeISO}"`,
					task.duration || "",
					`"${project?.id || ""}"`,
					`"${task.project || ""}"`,
					`"${task.client || ""}"`,
					`"${category?.id || ""}"`,
					`"${task.category || ""}"`,
					`"${day.id}"`,
					"false",
					`"${insertedAtISO}"`,
					`"${updatedAtISO}"`,
					`"${dailySummary.replace(/"/g, '""')}"`
				];
				rows.push(row.join(","));
			}
		});
	});

	return rows.join("\n");
}

export function exportToJSON(
	archivedDays: DayRecord[],
	projects: Project[],
	categories: TaskCategory[],
	startDate?: Date,
	endDate?: Date
): string {
	let filteredDays = archivedDays;

	if (startDate && endDate) {
		filteredDays = archivedDays.filter(day => {
			const dayDate = new Date(day.startTime);
			return dayDate >= startDate && dayDate <= endDate;
		});
	}

	const daysWithSummary = filteredDays.map(day => {
		const dayDescriptions = day.tasks.filter(t => t.description).map(t => t.description!);
		const dailySummary = generateDailySummary(dayDescriptions);
		return { ...day, dailySummary };
	});

	const exportData = {
		exportDate: new Date().toISOString(),
		period: {
			startDate: startDate?.toISOString(),
			endDate: endDate?.toISOString()
		},
		summary: {
			totalDays: filteredDays.length,
			totalHours: getTotalHoursForPeriod(
				archivedDays,
				startDate || new Date(0),
				endDate || new Date()
			),
			totalRevenue: getRevenueForPeriod(
				archivedDays,
				projects,
				categories,
				startDate || new Date(0),
				endDate || new Date()
			)
		},
		days: daysWithSummary,
		projects
	};

	return JSON.stringify(exportData, null, 2);
}

export function generateInvoiceData(
	archivedDays: DayRecord[],
	projects: Project[],
	categories: TaskCategory[],
	clientName: string,
	startDate: Date,
	endDate: Date
): InvoiceData {
	const projectMap = new Map(projects.map(p => [p.name, p]));
	const categoryMap = new Map(categories.map(c => [c.id, c]));

	const filteredDays = archivedDays.filter(day => {
		const dayDate = new Date(day.startTime);
		return dayDate >= startDate && dayDate <= endDate;
	});

	const dailySummaries: { [dayId: string]: { date: string; summary: string } } = {};
	filteredDays.forEach(day => {
		const dayDescriptions = day.tasks.filter(t => t.description).map(t => t.description!);
		const summary = generateDailySummary(dayDescriptions);
		if (summary) {
			dailySummaries[day.id] = { date: day.date, summary };
		}
	});

	const clientTasks = filteredDays.flatMap(day =>
		day.tasks
			.filter(task => {
				if (!task.client || task.client !== clientName || !task.duration) return false;

				if (task.project && task.category) {
					const project = projectMap.get(task.project);
					const category = categoryMap.get(task.category);
					const projectIsBillable = project?.isBillable !== false;
					const categoryIsBillable = category?.isBillable !== false;
					return projectIsBillable && categoryIsBillable;
				}

				return false;
			})
			.map(task => ({
				...task,
				dayId: day.id,
				dayDate: day.date,
				dailySummary: dailySummaries[day.id]?.summary || ""
			}))
	);

	const projectSummary: {
		[key: string]: { hours: number; rate: number; amount: number };
	} = {};

	clientTasks.forEach(task => {
		const projectName = task.project || "General";
		const project = projectMap.get(task.project);
		const hours = (task.duration || 0) / (1000 * 60 * 60);
		const rate = project?.hourlyRate || 0;

		if (!projectSummary[projectName]) {
			projectSummary[projectName] = { hours: 0, rate, amount: 0 };
		}

		projectSummary[projectName].hours += hours;
		projectSummary[projectName].amount += hours * rate;
	});

	const totalHours = Object.values(projectSummary).reduce((sum, proj) => sum + proj.hours, 0);
	const totalAmount = Object.values(projectSummary).reduce((sum, proj) => sum + proj.amount, 0);

	return {
		client: clientName,
		period: { startDate, endDate },
		projects: projectSummary,
		summary: {
			totalHours: Math.round(totalHours * 100) / 100,
			totalAmount: Math.round(totalAmount * 100) / 100
		},
		tasks: clientTasks,
		dailySummaries
	};
}

const EXPECTED_IMPORT_HEADERS = [
	"id",
	"user_id",
	"title",
	"description",
	"start_time",
	"end_time",
	"duration",
	"project_id",
	"project_name",
	"client",
	"category_id",
	"category_name",
	"day_record_id",
	"is_current",
	"inserted_at",
	"updated_at"
];

export interface ParsedImportResult {
	success: boolean;
	message: string;
	importedCount: number;
	newArchivedDays: DayRecord[];
}

export function parseCSVImport(
	csvContent: string,
	categories: TaskCategory[]
): ParsedImportResult {
	const lines = csvContent.split("\n").filter(line => line.trim());
	if (lines.length === 0) {
		return { success: false, message: "CSV file is empty", importedCount: 0, newArchivedDays: [] };
	}

	const headerLine = lines[0];
	const headers = headerLine.split(",").map(h => h.trim().replace(/"/g, ""));
	const missingHeaders = EXPECTED_IMPORT_HEADERS.filter(h => !headers.includes(h));
	if (missingHeaders.length > 0) {
		return {
			success: false,
			message: `CSV missing required headers: ${missingHeaders.join(", ")}`,
			importedCount: 0,
			newArchivedDays: []
		};
	}

	// Build lookup map once before the row loop
	const categoryByNameMap = new Map(categories.map(c => [c.name, c]));

	const tasksByDay: {
		[dayId: string]: { tasks: Task[]; dayRecord: Partial<DayRecord> };
	} = {};
	let importedCount = 0;

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		try {
			const values: string[] = [];
			let current = "";
			let inQuotes = false;

			for (let j = 0; j < line.length; j++) {
				const char = line[j];
				if (char === '"') {
					inQuotes = !inQuotes;
				} else if (char === "," && !inQuotes) {
					values.push(current.trim());
					current = "";
				} else {
					current += char;
				}
			}
			values.push(current.trim());

			if (values.length !== headers.length) {
				console.warn(
					`Skipping malformed CSV line ${i + 1}: expected ${headers.length} columns, got ${values.length}`
				);
				continue;
			}

			const taskData: { [key: string]: string } = {};
			headers.forEach((header, index) => {
				taskData[header] = values[index].replace(/^"|"$/g, "");
			});

			if (!taskData.id || !taskData.title || !taskData.start_time) {
				console.warn(`Skipping incomplete task on line ${i + 1}: missing required fields`);
				continue;
			}

			const categoryByName = categoryByNameMap.get(taskData.category_name);
			const categoryId = categoryByName?.id || taskData.category_id || undefined;

			const task: Task = {
				id: taskData.id,
				title: taskData.title,
				description: taskData.description || undefined,
				startTime: new Date(taskData.start_time),
				endTime: taskData.end_time ? new Date(taskData.end_time) : undefined,
				duration: taskData.duration ? parseInt(taskData.duration, 10) : undefined,
				project: taskData.project_name || undefined,
				client: taskData.client || undefined,
				category: categoryId
			};

			if (isNaN(task.startTime.getTime())) {
				console.warn(`Skipping task with invalid start_time on line ${i + 1}`);
				continue;
			}

			if (task.endTime && isNaN(task.endTime.getTime())) {
				task.endTime = undefined;
			}

			const dayRecordId = taskData.day_record_id;
			if (!dayRecordId) {
				console.warn(`Skipping task without day_record_id on line ${i + 1}`);
				continue;
			}

			if (!tasksByDay[dayRecordId]) {
				tasksByDay[dayRecordId] = {
					tasks: [],
					dayRecord: {
						id: dayRecordId,
						date: task.startTime.toISOString().split("T")[0],
						startTime: task.startTime,
						endTime: task.endTime || task.startTime,
						totalDuration: 0,
						tasks: []
					}
				};
			}

			tasksByDay[dayRecordId].tasks.push(task);

			if (task.startTime < (tasksByDay[dayRecordId].dayRecord.startTime || new Date())) {
				tasksByDay[dayRecordId].dayRecord.startTime = task.startTime;
			}
			if (
				task.endTime &&
				task.endTime > (tasksByDay[dayRecordId].dayRecord.endTime || new Date(0))
			) {
				tasksByDay[dayRecordId].dayRecord.endTime = task.endTime;
			}

			importedCount++;
		} catch (error) {
			console.warn(`Error parsing line ${i + 1}:`, error);
		}
	}

	const newArchivedDays: DayRecord[] = [];

	for (const [, { tasks, dayRecord }] of Object.entries(tasksByDay)) {
		const totalDuration = tasks.reduce((sum, task) => sum + (task.duration || 0), 0);

		const completeDay: DayRecord = {
			id: dayRecord.id!,
			date: dayRecord.date!,
			tasks,
			totalDuration,
			startTime: dayRecord.startTime!,
			endTime: dayRecord.endTime!,
			notes: dayRecord.notes
		};

		newArchivedDays.push(completeDay);
	}

	return {
		success: true,
		message: `Successfully imported ${importedCount} tasks in ${newArchivedDays.length} days`,
		importedCount,
		newArchivedDays
	};
}
