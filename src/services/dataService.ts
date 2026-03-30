import { DayRecord, Project, TodoItem } from "@/contexts/TimeTrackingContext";
import { Task } from "@/contexts/TimeTrackingContext";
import { TaskCategory } from "@/config/categories";
import { LocalStorageService } from "@/services/localStorageService";
import { SupabaseService } from "@/services/supabaseService";

export { STORAGE_KEYS } from "@/services/localStorageService";

// Current day data structure
export interface CurrentDayData {
	isDayStarted: boolean;
	dayStartTime: Date | null;
	currentTask: Task | null;
	tasks: Task[];
}

// Data service interface
export interface DataService {
	// Current day operations
	saveCurrentDay: (data: CurrentDayData) => Promise<void>;
	getCurrentDay: () => Promise<CurrentDayData | null>;

	// Archived days operations
	saveArchivedDays: (days: DayRecord[]) => Promise<void>;
	getArchivedDays: () => Promise<DayRecord[]>;
	updateArchivedDay: (id: string, updates: Partial<DayRecord>) => Promise<void>;
	deleteArchivedDay: (id: string) => Promise<void>;

	// Projects operations
	saveProjects: (projects: Project[]) => Promise<void>;
	getProjects: () => Promise<Project[]>;

	// Categories operations
	saveCategories: (categories: TaskCategory[]) => Promise<void>;
	getCategories: () => Promise<TaskCategory[]>;

	// Todo items operations
	saveTodos: (todos: TodoItem[]) => Promise<void>;
	getTodos: () => Promise<TodoItem[]>;

	// Migration operations
	migrateFromLocalStorage: () => Promise<void>;
	migrateToLocalStorage: () => Promise<void>;
}

// Factory function to get the appropriate service
export const createDataService = (isAuthenticated: boolean): DataService => {
	return isAuthenticated ? new SupabaseService() : new LocalStorageService();
};
