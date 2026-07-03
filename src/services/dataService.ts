import { DayRecord, Project, Client, TodoItem, PlannedTask } from "@/contexts/TimeTrackingContext";
import { Task } from "@/contexts/TimeTrackingContext";
import { TaskCategory } from "@/config/categories";
import { LocalStorageService } from "@/services/localStorageService";
import { SupabaseService } from "@/services/supabaseService";
import { SqlApiService } from "@/services/sqlApiService";

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
	deleteProject: (id: string) => Promise<void>;

	// Clients operations
	saveClients: (clients: Client[]) => Promise<void>;
	getClients: () => Promise<Client[]>;
	upsertClient: (client: Client) => Promise<void>;

	// Categories operations
	saveCategories: (categories: TaskCategory[]) => Promise<void>;
	getCategories: () => Promise<TaskCategory[]>;
	deleteCategory: (id: string) => Promise<void>;

	// Todo items operations
	saveTodos: (todos: TodoItem[]) => Promise<void>;
	getTodos: () => Promise<TodoItem[]>;
	deleteTodo: (id: string) => Promise<void>;

	// Planned tasks operations
	savePlannedTasks: (tasks: PlannedTask[]) => Promise<void>;
	getPlannedTasks: () => Promise<PlannedTask[]>;
	upsertPlannedTask: (task: PlannedTask) => Promise<void>;
	deletePlannedTask: (id: string) => Promise<void>;

	// Migration operations
	migrateFromLocalStorage: () => Promise<void>;
	migrateToLocalStorage: () => Promise<void>;
}

// Factory function to get the appropriate service
export const createDataService = (isAuthenticated: boolean): DataService => {
	// Self-hosted SQL backend opt-in — takes precedence over Supabase/localStorage
	// when explicitly configured, but never affects existing deployments.
	if (import.meta.env.VITE_DATA_BACKEND === "sql") {
		return new SqlApiService();
	}
	return isAuthenticated ? new SupabaseService() : new LocalStorageService();
};
