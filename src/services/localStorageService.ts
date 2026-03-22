import { Task, DayRecord, Project } from "@/contexts/TimeTrackingContext";
import { TaskCategory } from "@/config/categories";
import { DataService, CurrentDayData } from "@/services/dataService";

export const STORAGE_KEYS = {
	CURRENT_DAY: "timetracker_current_day",
	ARCHIVED_DAYS: "timetracker_archived_days",
	PROJECTS: "timetracker_projects",
	CATEGORIES: "timetracker_categories"
};

export class LocalStorageService implements DataService {
	async saveCurrentDay(data: CurrentDayData): Promise<void> {
		localStorage.setItem(STORAGE_KEYS.CURRENT_DAY, JSON.stringify(data));
	}

	async getCurrentDay(): Promise<CurrentDayData | null> {
		try {
			const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_DAY);
			if (!saved) return null;

			const data = JSON.parse(saved);
			return {
				...data,
				dayStartTime: data.dayStartTime ? new Date(data.dayStartTime) : null,
				tasks: (data.tasks ?? []).map((task: Task) => ({
					...task,
					startTime: new Date(task.startTime),
					endTime: task.endTime ? new Date(task.endTime) : undefined
				})),
				currentTask: data.currentTask
					? {
							...data.currentTask,
							startTime: new Date(data.currentTask.startTime),
							endTime: data.currentTask.endTime
								? new Date(data.currentTask.endTime)
								: undefined
						}
					: null
			};
		} catch (error) {
			console.error("Error loading current day from localStorage:", error);
			return null;
		}
	}

	async saveArchivedDays(days: DayRecord[]): Promise<void> {
		localStorage.setItem(STORAGE_KEYS.ARCHIVED_DAYS, JSON.stringify(days));
	}

	async getArchivedDays(): Promise<DayRecord[]> {
		try {
			const saved = localStorage.getItem(STORAGE_KEYS.ARCHIVED_DAYS);
			if (!saved) return [];

			const data = JSON.parse(saved);
			return data.map((day: DayRecord) => ({
				...day,
				startTime: new Date(day.startTime),
				endTime: new Date(day.endTime),
				tasks: day.tasks.map((task: Task) => ({
					...task,
					startTime: new Date(task.startTime),
					endTime: task.endTime ? new Date(task.endTime) : undefined
				}))
			}));
		} catch (error) {
			console.error("Error loading archived days from localStorage:", error);
			return [];
		}
	}

	async updateArchivedDay(dayId: string, updates: Partial<DayRecord>): Promise<void> {
		const days = await this.getArchivedDays();
		const updatedDays = days.map((day) =>
			day.id === dayId ? { ...day, ...updates } : day
		);
		await this.saveArchivedDays(updatedDays);
	}

	async deleteArchivedDay(dayId: string): Promise<void> {
		const days = await this.getArchivedDays();
		const filteredDays = days.filter((day) => day.id !== dayId);
		await this.saveArchivedDays(filteredDays);
	}

	async saveProjects(projects: Project[]): Promise<void> {
		localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
	}

	async getProjects(): Promise<Project[]> {
		try {
			const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
			return saved ? JSON.parse(saved) : [];
		} catch (error) {
			console.error("Error loading projects from localStorage:", error);
			return [];
		}
	}

	async saveCategories(categories: TaskCategory[]): Promise<void> {
		localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
	}

	async getCategories(): Promise<TaskCategory[]> {
		try {
			const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
			return saved ? JSON.parse(saved) : [];
		} catch (error) {
			console.error("Error loading categories from localStorage:", error);
			return [];
		}
	}

	async migrateFromLocalStorage(): Promise<void> {
		// No-op for localStorage service
	}

	async migrateToLocalStorage(): Promise<void> {
		// No-op for localStorage service - already in localStorage
	}
}
