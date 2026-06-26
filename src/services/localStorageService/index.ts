import type { DayRecord, Project, Client, TodoItem, PlannedTask } from "@/contexts/TimeTrackingContext";
import type { TaskCategory } from "@/config/categories";
import type { DataService, CurrentDayData } from "@/services/dataService";
import { saveCurrentDay, getCurrentDay } from "./currentDay";
import {
	saveArchivedDays,
	getArchivedDays,
	updateArchivedDay,
	deleteArchivedDay
} from "./archivedDays";
import { saveProjects, getProjects, deleteProject } from "./projects";
import { saveClients, getClients, upsertClient } from "./clients";
import { saveCategories, getCategories, deleteCategory } from "./categories";
import { saveTodos, getTodos, deleteTodo } from "./todos";
import { savePlannedTasks, getPlannedTasks, upsertPlannedTask, deletePlannedTask } from "./plannedTasks";

export { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";

export class LocalStorageService implements DataService {
	saveCurrentDay(data: CurrentDayData): Promise<void> {
		return saveCurrentDay(data);
	}

	getCurrentDay(): Promise<CurrentDayData | null> {
		return getCurrentDay();
	}

	saveArchivedDays(days: DayRecord[]): Promise<void> {
		return saveArchivedDays(days);
	}

	getArchivedDays(): Promise<DayRecord[]> {
		return getArchivedDays();
	}

	updateArchivedDay(dayId: string, updates: Partial<DayRecord>): Promise<void> {
		return updateArchivedDay(dayId, updates);
	}

	deleteArchivedDay(dayId: string): Promise<void> {
		return deleteArchivedDay(dayId);
	}

	saveProjects(projects: Project[]): Promise<void> {
		return saveProjects(projects);
	}

	getProjects(): Promise<Project[]> {
		return getProjects();
	}

	deleteProject(id: string): Promise<void> {
		return deleteProject(id);
	}

	saveClients(clients: Client[]): Promise<void> {
		return saveClients(clients);
	}

	getClients(): Promise<Client[]> {
		return getClients();
	}

	upsertClient(client: Client): Promise<void> {
		return upsertClient(client);
	}

	saveCategories(categories: TaskCategory[]): Promise<void> {
		return saveCategories(categories);
	}

	getCategories(): Promise<TaskCategory[]> {
		return getCategories();
	}

	deleteCategory(id: string): Promise<void> {
		return deleteCategory(id);
	}

	saveTodos(todos: TodoItem[]): Promise<void> {
		return saveTodos(todos);
	}

	getTodos(): Promise<TodoItem[]> {
		return getTodos();
	}

	deleteTodo(id: string): Promise<void> {
		return deleteTodo(id);
	}

	savePlannedTasks(tasks: PlannedTask[]): Promise<void> {
		return savePlannedTasks(tasks);
	}

	getPlannedTasks(): Promise<PlannedTask[]> {
		return getPlannedTasks();
	}

	upsertPlannedTask(task: PlannedTask): Promise<void> {
		return upsertPlannedTask(task);
	}

	deletePlannedTask(id: string): Promise<void> {
		return deletePlannedTask(id);
	}

	async migrateFromLocalStorage(): Promise<void> {
		// No-op for localStorage service
	}

	async migrateToLocalStorage(): Promise<void> {
		// No-op for localStorage service — already in localStorage
	}
}
