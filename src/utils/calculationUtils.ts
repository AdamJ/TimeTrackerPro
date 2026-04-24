import { Task, DayRecord, Project } from "@/contexts/TimeTrackingContext";
import { TaskCategory } from "@/config/categories";

/**
 * Returns true if a task is billable based on its project and category settings.
 */
function isTaskBillable(
	task: Task,
	projectMap: Map<string, Project>,
	categoryMap: Map<string, TaskCategory>
): boolean {
	if (!task.project || !task.category) return false;
	const project = projectMap.get(task.project);
	const category = categoryMap.get(task.category);
	const projectIsBillable = project?.isBillable !== false;
	const categoryIsBillable = category?.isBillable !== false;
	return projectIsBillable && categoryIsBillable;
}

export interface DayStats {
	hoursWorked: number;
	billableHours: number;
	nonBillableHours: number;
	revenue: number;
}

/**
 * Computes all four day stats in a single pass with pre-built maps.
 * Prefer this over calling the individual functions separately when
 * you need multiple stats for the same day.
 */
export function getDayStats(
	day: DayRecord,
	projectMap: Map<string, Project>,
	categoryMap: Map<string, TaskCategory>
): DayStats {
	let totalMs = 0;
	let billableMs = 0;
	let nonBillableMs = 0;
	let revenue = 0;

	day.tasks.forEach(task => {
		if (!task.duration) return;
		totalMs += task.duration;
		if (task.project && task.category) {
			if (isTaskBillable(task, projectMap, categoryMap)) {
				billableMs += task.duration;
				const project = projectMap.get(task.project);
				if (project?.hourlyRate) {
					revenue += (task.duration / 3600000) * project.hourlyRate;
				}
			} else {
				nonBillableMs += task.duration;
			}
		}
	});

	return {
		hoursWorked: Math.round((totalMs / 3600000) * 100) / 100,
		billableHours: Math.round((billableMs / 3600000) * 100) / 100,
		nonBillableHours: Math.round((nonBillableMs / 3600000) * 100) / 100,
		revenue: Math.round(revenue * 100) / 100
	};
}

export function getHoursWorkedForDay(day: DayRecord): number {
	let totalTaskDuration = 0;
	day.tasks.forEach(task => {
		if (task.duration) totalTaskDuration += task.duration;
	});
	return Math.round((totalTaskDuration / (1000 * 60 * 60)) * 100) / 100;
}

export function getRevenueForDay(
	day: DayRecord,
	projects: Project[],
	categories: TaskCategory[]
): number {
	const projectMap = new Map(projects.map(p => [p.name, p]));
	const categoryMap = new Map(categories.map(c => [c.id, c]));

	let totalRevenue = 0;
	day.tasks.forEach(task => {
		if (task.project && task.duration && task.category) {
			if (isTaskBillable(task, projectMap, categoryMap)) {
				const project = projectMap.get(task.project);
				if (project?.hourlyRate) {
					const hours = task.duration / (1000 * 60 * 60);
					totalRevenue += hours * project.hourlyRate;
				}
			}
		}
	});

	return Math.round(totalRevenue * 100) / 100;
}

export function getBillableHoursForDay(
	day: DayRecord,
	projects: Project[],
	categories: TaskCategory[]
): number {
	const projectMap = new Map(projects.map(p => [p.name, p]));
	const categoryMap = new Map(categories.map(c => [c.id, c]));

	let billableTime = 0;
	day.tasks.forEach(task => {
		if (task.duration && task.category && task.project) {
			if (isTaskBillable(task, projectMap, categoryMap)) {
				billableTime += task.duration;
			}
		}
	});

	return Math.round((billableTime / (1000 * 60 * 60)) * 100) / 100;
}

export function getNonBillableHoursForDay(
	day: DayRecord,
	projects: Project[],
	categories: TaskCategory[]
): number {
	const projectMap = new Map(projects.map(p => [p.name, p]));
	const categoryMap = new Map(categories.map(c => [c.id, c]));

	let nonBillableTime = 0;
	day.tasks.forEach(task => {
		if (task.duration && task.category && task.project) {
			if (!isTaskBillable(task, projectMap, categoryMap)) {
				nonBillableTime += task.duration;
			}
		}
	});

	return Math.round((nonBillableTime / (1000 * 60 * 60)) * 100) / 100;
}

export function getTotalHoursForPeriod(
	archivedDays: DayRecord[],
	startDate: Date,
	endDate: Date
): number {
	const filteredDays = archivedDays.filter(day => {
		const dayDate = new Date(day.startTime);
		return dayDate >= startDate && dayDate <= endDate;
	});

	const totalMs = filteredDays.reduce((total, day) => total + day.totalDuration, 0);
	return Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
}

export function getRevenueForPeriod(
	archivedDays: DayRecord[],
	projects: Project[],
	categories: TaskCategory[],
	startDate: Date,
	endDate: Date
): number {
	const filteredDays = archivedDays.filter(day => {
		const dayDate = new Date(day.startTime);
		return dayDate >= startDate && dayDate <= endDate;
	});

	const projectMap = new Map(projects.map(p => [p.name, p]));
	const categoryMap = new Map(categories.map(c => [c.id, c]));

	let totalRevenue = 0;
	filteredDays.forEach(day => {
		day.tasks.forEach(task => {
			if (task.project && task.duration && task.category) {
				if (isTaskBillable(task, projectMap, categoryMap)) {
					const project = projectMap.get(task.project);
					if (project?.hourlyRate) {
						const hours = task.duration / (1000 * 60 * 60);
						totalRevenue += hours * project.hourlyRate;
					}
				}
			}
		});
	});

	return Math.round(totalRevenue * 100) / 100;
}
