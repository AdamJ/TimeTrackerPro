import { Task, DayRecord, Project, TodoItem } from "@/contexts/TimeTrackingContext";
import { TaskCategory } from "@/config/categories";
import { DataService, CurrentDayData } from "@/services/dataService";

export const STORAGE_KEYS = {
	CURRENT_DAY: "timetracker_current_day",
	ARCHIVED_DAYS: "timetracker_archived_days",
	PROJECTS: "timetracker_projects",
	CATEGORIES: "timetracker_categories",
	TODOS: "timetracker_todos"
};

// Increment this when the stored data format changes in a breaking way.
// On read, if the stored version is lower than SCHEMA_VERSION the data is
// treated as legacy and the key is cleared rather than letting corrupted data
// propagate through the application.
export const SCHEMA_VERSION = 1;

export class LocalStorageService implements DataService {
	async saveCurrentDay(data: CurrentDayData): Promise<void> {
		try {
			localStorage.setItem(STORAGE_KEYS.CURRENT_DAY, JSON.stringify({ ...data, _v: SCHEMA_VERSION }));
		} catch (error) {
			console.warn("Failed to save current day to localStorage:", error);
		}
	}

	async getCurrentDay(): Promise<CurrentDayData | null> {
		try {
			const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_DAY);
			if (!saved) return null;

			const data = JSON.parse(saved);
			if (data._v !== SCHEMA_VERSION) {
				console.warn("localStorage current day schema mismatch — clearing stale data");
				localStorage.removeItem(STORAGE_KEYS.CURRENT_DAY);
				return null;
			}
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
		try {
			localStorage.setItem(STORAGE_KEYS.ARCHIVED_DAYS, JSON.stringify({ days, _v: SCHEMA_VERSION }));
		} catch (error) {
			console.warn("Failed to save archived days to localStorage:", error);
		}
	}

	async getArchivedDays(): Promise<DayRecord[]> {
		try {
			const saved = localStorage.getItem(STORAGE_KEYS.ARCHIVED_DAYS);
			if (!saved) return [];

			const parsed = JSON.parse(saved);
			// Support both versioned format { days, _v } and legacy bare array
			const data: DayRecord[] | undefined = Array.isArray(parsed) ? parsed : parsed?.days;
			if (!Array.isArray(parsed) && parsed?._v !== SCHEMA_VERSION) {
				console.warn("localStorage archived days schema mismatch — clearing stale data");
				localStorage.removeItem(STORAGE_KEYS.ARCHIVED_DAYS);
				return [];
			}
			if (!Array.isArray(data)) return [];
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
		try {
			localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify({ data: projects, _v: SCHEMA_VERSION }));
		} catch (error) {
			console.warn("Failed to save projects to localStorage:", error);
		}
	}

	async getProjects(): Promise<Project[]> {
		try {
			const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
			if (!saved) return [];
			const parsed = JSON.parse(saved);
			// Support legacy bare array and new versioned format { data, _v }
			const data: Project[] = Array.isArray(parsed) ? parsed : parsed?.data;
			if (!Array.isArray(parsed) && parsed?._v !== SCHEMA_VERSION) {
				console.warn("localStorage projects schema mismatch — clearing stale data");
				localStorage.removeItem(STORAGE_KEYS.PROJECTS);
				return [];
			}
			return Array.isArray(data) ? data : [];
		} catch (error) {
			console.error("Error loading projects from localStorage:", error);
			return [];
		}
	}

	async saveCategories(categories: TaskCategory[]): Promise<void> {
		try {
			localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify({ data: categories, _v: SCHEMA_VERSION }));
		} catch (error) {
			console.warn("Failed to save categories to localStorage:", error);
		}
	}

	async getCategories(): Promise<TaskCategory[]> {
		try {
			const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
			if (!saved) return [];
			const parsed = JSON.parse(saved);
			// Support legacy bare array and new versioned format { data, _v }
			const data: TaskCategory[] = Array.isArray(parsed) ? parsed : parsed?.data;
			if (!Array.isArray(parsed) && parsed?._v !== SCHEMA_VERSION) {
				console.warn("localStorage categories schema mismatch — clearing stale data");
				localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
				return [];
			}
			return Array.isArray(data) ? data : [];
		} catch (error) {
			console.error("Error loading categories from localStorage:", error);
			return [];
		}
	}

	async saveTodos(todos: TodoItem[]): Promise<void> {
		try {
			localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify({ data: todos, _v: SCHEMA_VERSION }));
		} catch (error) {
			console.warn("Failed to save todos to localStorage:", error);
		}
	}

	async getTodos(): Promise<TodoItem[]> {
		try {
			const saved = localStorage.getItem(STORAGE_KEYS.TODOS);
			if (!saved) return [];
			const parsed = JSON.parse(saved);
			const data: TodoItem[] = Array.isArray(parsed) ? parsed : parsed?.data;
			if (!Array.isArray(parsed) && parsed?._v !== SCHEMA_VERSION) {
				console.warn("localStorage todos schema mismatch — clearing stale data");
				localStorage.removeItem(STORAGE_KEYS.TODOS);
				return [];
			}
			return Array.isArray(data) ? data : [];
		} catch (error) {
			console.error("Error loading todos from localStorage:", error);
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
