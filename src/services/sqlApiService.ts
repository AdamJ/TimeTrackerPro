import { Task, DayRecord, Project, Client, TodoItem, PlannedTask } from "@/contexts/TimeTrackingContext";
import { TaskCategory } from "@/config/categories";
import { DataService, CurrentDayData } from "@/services/dataService";
import { LocalStorageService } from "@/services/localStorageService";

const BASE_URL = (import.meta.env.VITE_SQL_API_URL ?? "http://localhost:4001/api").replace(/\/$/, "");

interface TaskWire extends Omit<Task, "startTime" | "endTime" | "insertedAt" | "updatedAt"> {
	startTime: string;
	endTime?: string;
	insertedAt?: string;
	updatedAt?: string;
}

interface CurrentDayWire {
	isDayStarted: boolean;
	dayStartTime: string | null;
	currentTask: TaskWire | null;
	tasks: TaskWire[];
}

interface DayRecordWire extends Omit<DayRecord, "tasks" | "startTime" | "endTime" | "insertedAt" | "updatedAt"> {
	tasks: TaskWire[];
	startTime: string;
	endTime: string;
	insertedAt?: string;
	updatedAt?: string;
}

function reviveTask(task: TaskWire): Task {
	return {
		...task,
		startTime: new Date(task.startTime),
		endTime: task.endTime ? new Date(task.endTime) : undefined,
		insertedAt: task.insertedAt ? new Date(task.insertedAt) : undefined,
		updatedAt: task.updatedAt ? new Date(task.updatedAt) : undefined
	};
}

function reviveDay(day: DayRecordWire): DayRecord {
	return {
		...day,
		tasks: day.tasks.map(reviveTask),
		startTime: new Date(day.startTime),
		endTime: new Date(day.endTime),
		insertedAt: day.insertedAt ? new Date(day.insertedAt) : undefined,
		updatedAt: day.updatedAt ? new Date(day.updatedAt) : undefined
	};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${BASE_URL}${path}`, {
		...options,
		headers: { "Content-Type": "application/json", ...options?.headers }
	});

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(`SQL backend request failed (${response.status}): ${body || response.statusText}`);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return response.json() as Promise<T>;
}

// Talks to the self-hosted backend in server/ over HTTP — browsers cannot
// open a raw MySQL/Postgres connection directly, so this mirrors the
// Supabase/localStorage services against a small REST API instead.
export class SqlApiService implements DataService {
	async saveCurrentDay(data: CurrentDayData): Promise<void> {
		await request("/current-day", { method: "PUT", body: JSON.stringify(data) });
	}

	async getCurrentDay(): Promise<CurrentDayData | null> {
		const data = await request<CurrentDayWire | null>("/current-day");
		if (!data) return null;
		return {
			isDayStarted: data.isDayStarted,
			dayStartTime: data.dayStartTime ? new Date(data.dayStartTime) : null,
			tasks: data.tasks.map(reviveTask),
			currentTask: data.currentTask ? reviveTask(data.currentTask) : null
		};
	}

	async saveArchivedDays(days: DayRecord[]): Promise<void> {
		await request("/archived-days", { method: "PUT", body: JSON.stringify(days) });
	}

	async getArchivedDays(): Promise<DayRecord[]> {
		const days = await request<DayRecordWire[]>("/archived-days");
		return days.map(reviveDay);
	}

	async updateArchivedDay(id: string, updates: Partial<DayRecord>): Promise<void> {
		await request(`/archived-days/${encodeURIComponent(id)}`, {
			method: "PATCH",
			body: JSON.stringify(updates)
		});
	}

	async deleteArchivedDay(id: string): Promise<void> {
		await request(`/archived-days/${encodeURIComponent(id)}`, { method: "DELETE" });
	}

	async saveProjects(projects: Project[]): Promise<void> {
		await request("/projects", { method: "PUT", body: JSON.stringify(projects) });
	}

	async getProjects(): Promise<Project[]> {
		return request<Project[]>("/projects");
	}

	async saveClients(clients: Client[]): Promise<void> {
		await request("/clients", { method: "PUT", body: JSON.stringify(clients) });
	}

	async getClients(): Promise<Client[]> {
		return request<Client[]>("/clients");
	}

	async upsertClient(client: Client): Promise<void> {
		await request(`/clients/${encodeURIComponent(client.id)}`, {
			method: "PUT",
			body: JSON.stringify(client)
		});
	}

	async saveCategories(categories: TaskCategory[]): Promise<void> {
		await request("/categories", { method: "PUT", body: JSON.stringify(categories) });
	}

	async getCategories(): Promise<TaskCategory[]> {
		return request<TaskCategory[]>("/categories");
	}

	async saveTodos(todos: TodoItem[]): Promise<void> {
		await request("/todos", { method: "PUT", body: JSON.stringify(todos) });
	}

	async getTodos(): Promise<TodoItem[]> {
		return request<TodoItem[]>("/todos");
	}

	async savePlannedTasks(tasks: PlannedTask[]): Promise<void> {
		await request("/planned-tasks", { method: "PUT", body: JSON.stringify(tasks) });
	}

	async getPlannedTasks(): Promise<PlannedTask[]> {
		return request<PlannedTask[]>("/planned-tasks");
	}

	async upsertPlannedTask(task: PlannedTask): Promise<void> {
		await request(`/planned-tasks/${encodeURIComponent(task.id)}`, {
			method: "PUT",
			body: JSON.stringify(task)
		});
	}

	async deletePlannedTask(id: string): Promise<void> {
		await request(`/planned-tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
	}

	// Reuses the same one-time-merge strategy as SupabaseService: only pull
	// guest localStorage data in if the SQL backend doesn't already have it.
	async migrateFromLocalStorage(): Promise<void> {
		try {
			const localService = new LocalStorageService();

			const projects = await localService.getProjects();
			const categories = await localService.getCategories();
			const currentDay = await localService.getCurrentDay();
			const archivedDaysData = await localService.getArchivedDays();
			const todos = await localService.getTodos();
			const plannedTasksData = await localService.getPlannedTasks();
			const clients = await localService.getClients();

			const hasProjects = projects.length > 0;
			const hasCategories = categories.length > 0;
			const hasCurrentDay = currentDay && (currentDay.tasks.length > 0 || currentDay.isDayStarted);
			const hasArchivedDays = archivedDaysData.length > 0;
			const hasTodos = todos.length > 0;
			const hasPlannedTasks = plannedTasksData.length > 0;
			const hasClients = clients.length > 0;

			if (!hasProjects && !hasCategories && !hasCurrentDay && !hasArchivedDays && !hasTodos && !hasPlannedTasks && !hasClients) {
				return;
			}

			const existingProjects = await this.getProjects();
			const existingCategories = await this.getCategories();
			const existingArchivedDays = await this.getArchivedDays();
			const existingPlannedTasks = await this.getPlannedTasks();
			const existingClients = await this.getClients();

			if (hasProjects && existingProjects.length === 0) await this.saveProjects(projects);
			if (hasCategories && existingCategories.length === 0) await this.saveCategories(categories);
			if (hasCurrentDay && currentDay) await this.saveCurrentDay(currentDay);
			if (hasArchivedDays && existingArchivedDays.length === 0) await this.saveArchivedDays(archivedDaysData);
			if (hasTodos) await this.saveTodos(todos);
			if (hasPlannedTasks && existingPlannedTasks.length === 0) await this.savePlannedTasks(plannedTasksData);

			if (hasClients) {
				const existingNames = new Set(existingClients.map((client) => client.name));
				const newClients = clients.filter((client) => !existingNames.has(client.name));
				for (const client of newClients) {
					await this.upsertClient(client);
				}
			}
		} catch (error) {
			console.error("❌ Error migrating data from localStorage to SQL backend:", error);
		}
	}

	async migrateToLocalStorage(): Promise<void> {
		try {
			const localService = new LocalStorageService();

			const currentDay = await this.getCurrentDay();
			const archivedDaysData = await this.getArchivedDays();
			const projects = await this.getProjects();
			const categories = await this.getCategories();
			const todos = await this.getTodos();
			const plannedTasksData = await this.getPlannedTasks();
			const clients = await this.getClients();

			if (currentDay) await localService.saveCurrentDay(currentDay);
			if (archivedDaysData.length > 0) await localService.saveArchivedDays(archivedDaysData);
			if (projects.length > 0) await localService.saveProjects(projects);
			if (categories.length > 0) await localService.saveCategories(categories);
			if (todos.length > 0) await localService.saveTodos(todos);
			if (plannedTasksData.length > 0) await localService.savePlannedTasks(plannedTasksData);
			if (clients.length > 0) await localService.saveClients(clients);
		} catch (error) {
			console.error("❌ Error migrating data from SQL backend to localStorage:", error);
		}
	}
}
