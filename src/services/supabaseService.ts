import {
	supabase,
	trackDbCall,
	getCachedUser,
	getCachedProjects,
	setCachedProjects,
	getCachedCategories,
	setCachedCategories,
	clearDataCaches,
	trackAuthCall
} from "@/lib/supabase";
import { Task, DayRecord, Project, TodoItem } from "@/contexts/TimeTrackingContext";
import { TaskCategory } from "@/config/categories";
import { DataService, CurrentDayData } from "@/services/dataService";
import { LocalStorageService } from "@/services/localStorageService";

export class SupabaseService implements DataService {
	// Schema detection with permanent caching
	private hasNewSchema: boolean | null = null;
	private static schemaChecked: boolean = false;
	private static globalSchemaResult: boolean | null = null;

	/**
	 * Resolves the authenticated user and validates their ID.
	 * Throws descriptively if the user is unauthenticated or the ID is empty,
	 * ensuring every DB method fails fast before touching the database.
	 */
	private async requireUser(): Promise<{ id: string }> {
		const cachedUser = await getCachedUser(); // throws if unauthenticated
		if (!cachedUser.id) {
			throw new Error("Authenticated user has no ID — cannot perform database operation");
		}
		return cachedUser;
	}

	private async checkNewSchema(): Promise<boolean> {
		// Use global cache first (survives across service instances)
		if (SupabaseService.schemaChecked && SupabaseService.globalSchemaResult !== null) {
			this.hasNewSchema = SupabaseService.globalSchemaResult;
			return this.hasNewSchema;
		}

		// Use instance cache
		if (this.hasNewSchema !== null) {
			return this.hasNewSchema;
		}

		try {
			// Check if we have a valid authenticated user first
			const {
				data: { user },
				error: userError
			} = await supabase.auth.getUser();
			trackAuthCall("getUser", "SupabaseService.checkNewSchema");

			if (userError || !user) {
				console.warn("User not authenticated, cannot check schema");
				this.hasNewSchema = false;
				SupabaseService.globalSchemaResult = false;
				SupabaseService.schemaChecked = true;
				return false;
			}

			// Try to query the current_day table to see if the new schema exists
			const { error } = await supabase
				.from("current_day")
				.select("user_id")
				.eq("user_id", user.id)
				.limit(1);
			trackDbCall("select", "current_day", "SupabaseService.checkNewSchema");

			if (error) {
				console.warn("New schema not detected:", error.message);
				this.hasNewSchema = false;
				SupabaseService.globalSchemaResult = false;
				SupabaseService.schemaChecked = true;
				return false;
			}

			this.hasNewSchema = true;
			SupabaseService.globalSchemaResult = true;
			SupabaseService.schemaChecked = true;
			return true;
		} catch (error) {
			console.warn("Error checking schema, assuming new schema exists:", error);
			this.hasNewSchema = true;
			SupabaseService.globalSchemaResult = true;
			SupabaseService.schemaChecked = true;
			return true;
		}
	}

	async saveCurrentDay(data: CurrentDayData): Promise<void> {

		const user = await this.requireUser();

		const categories = getCachedCategories() ?? [];
		const projects = getCachedProjects() ?? [];
		const categoryMap = new Map(categories.map(c => [c.id, c]));
		const projectMap = new Map(projects.map(p => [p.name, p]));

		try {
			// 1. Save current day state
			const { error: currentDayError } = await supabase
				.from("current_day")
				.upsert({
					user_id: user.id,
					is_day_started: data.isDayStarted,
					day_start_time: data.dayStartTime?.toISOString(),
					current_task_id: data.currentTask?.id || null
				});
			trackDbCall("upsert", "current_day");

			if (currentDayError) {
				console.error("❌ Error saving current day state:", currentDayError);
				throw currentDayError;
			}

			// 2. Handle tasks efficiently
			if (data.tasks.length === 0) {
				const { error: deleteError } = await supabase
					.from("tasks")
					.delete()
					.eq("user_id", user.id)
					.eq("is_current", true);
				trackDbCall("delete", "tasks");

				if (deleteError) {
					console.error("❌ Error deleting all current tasks:", deleteError);
					throw deleteError;
				}
			} else {
				// Get existing task IDs to minimize database operations
				const { data: existingTasks } = await supabase
					.from("tasks")
					.select("id")
					.eq("user_id", user.id)
					.eq("is_current", true);
				trackDbCall("select", "tasks");

				const existingTaskIds = new Set(existingTasks?.map(t => t.id) || []);
				const newTaskIds = new Set(data.tasks.map(t => t.id));

				// 3. Delete obsolete tasks
				const tasksToDelete = Array.from(existingTaskIds).filter(id => !newTaskIds.has(id));
				if (tasksToDelete.length > 0) {
					const { error: deleteError } = await supabase
						.from("tasks")
						.delete()
						.eq("user_id", user.id)
						.eq("is_current", true)
						.in("id", tasksToDelete);
					trackDbCall("delete", "tasks");

					if (deleteError) {
						console.error("❌ Error deleting obsolete tasks:", deleteError);
						throw deleteError;
					}
				}

				// 4. Upsert current tasks (single batch operation)
				const tasksToUpsert = data.tasks.map((task) => {
					const category = categoryMap.get(task.category ?? "");
					const project = projectMap.get(task.project ?? "");

					return {
						id: task.id,
						user_id: user.id,
						title: task.title,
						description: task.description || null,
						start_time: task.startTime.toISOString(),
						end_time: task.endTime?.toISOString() || null,
						duration: task.duration || null,
						project_id: project?.id || null,
						project_name: task.project || null,
						client: task.client || null,
						category_id: task.category || null,
						category_name: category?.name || null,
						day_record_id: null,
						is_current: true
					};
				});

				const { error: tasksError } = await supabase
					.from("tasks")
					.upsert(tasksToUpsert, { onConflict: "id" });
				trackDbCall("upsert", "tasks");

				if (tasksError) {
					console.error("❌ Error upserting tasks:", tasksError);
					throw tasksError;
				}

			}

		} catch (error) {
			console.error("❌ Error in saveCurrentDay:", error);
			throw error;
		}
	}

	async getCurrentDay(): Promise<CurrentDayData | null> {

		const user = await this.requireUser();

		const { data: currentDayData, error: currentDayError } = await supabase
			.from("current_day")
			.select("*")
			.eq("user_id", user.id)
			.single();

		if (currentDayError && currentDayError.code !== "PGRST116") {
			console.error("❌ Error loading current day state:", currentDayError);
			throw currentDayError;
		}

		const { data: tasksData, error: tasksError } = await supabase
			.from("tasks")
			.select("*")
			.eq("user_id", user.id)
			.eq("is_current", true)
			.order("start_time", { ascending: true });

		if (tasksError) {
			console.error("❌ Error loading current tasks:", tasksError);
			throw tasksError;
		}

		if (!currentDayData && (!tasksData || tasksData.length === 0)) {
			return null;
		}

		const tasks: Task[] = (tasksData || []).map((task) => ({
			id: task.id,
			title: task.title,
			description: task.description || undefined,
			startTime: new Date(task.start_time),
			endTime: task.end_time ? new Date(task.end_time) : undefined,
			duration: task.duration || undefined,
			project: task.project_name || undefined,
			client: task.client || undefined,
			category: task.category_id || undefined,
			insertedAt: task.inserted_at ? new Date(task.inserted_at) : undefined,
			updatedAt: task.updated_at ? new Date(task.updated_at) : undefined
		}));

		const currentTask = currentDayData?.current_task_id
			? tasks.find((task) => task.id === currentDayData.current_task_id) || null
			: null;

		const result = {
			isDayStarted: currentDayData?.is_day_started || false,
			dayStartTime: currentDayData?.day_start_time
				? new Date(currentDayData.day_start_time)
				: null,
			tasks,
			currentTask
		};

		return result;
	}

	async saveArchivedDays(days: DayRecord[]): Promise<void> {

		const user = await this.requireUser();

		const categories = getCachedCategories() ?? [];
		const projects = getCachedProjects() ?? [];
		const categoryMap = new Map(categories.map(c => [c.id, c]));
		const projectMap = new Map(projects.map(p => [p.name, p]));

		if (days.length === 0) {
			await supabase.from("tasks").delete().eq("user_id", user.id).eq("is_current", false);
			await supabase.from("archived_days").delete().eq("user_id", user.id);
			return;
		}

		const archivedDaysToUpsert = days.map((day) => ({
			id: day.id,
			user_id: user.id,
			date: day.date,
			total_duration: day.totalDuration,
			start_time: day.startTime.toISOString(),
			end_time: day.endTime.toISOString(),
			notes: day.notes
		}));

		const allTasks = days.flatMap((day) =>
			day.tasks.map((task) => {
				const category = categoryMap.get(task.category ?? "");
				const project = projectMap.get(task.project ?? "");

				return {
					id: task.id,
					user_id: user.id,
					title: task.title,
					description: task.description || null,
					start_time: task.startTime.toISOString(),
					end_time: task.endTime?.toISOString() || null,
					duration: task.duration || null,
					project_id: project?.id || null,
					project_name: task.project || null,
					client: task.client || null,
					category_id: task.category || null,
					category_name: category?.name || null,
					day_record_id: day.id,
					is_current: false
				};
			})
		);

		try {
			// Step 1: Get existing data to determine what to delete
			const { data: existingDays } = await supabase
				.from("archived_days")
				.select("id")
				.eq("user_id", user.id);
			trackDbCall("select", "archived_days");

			const { data: existingTasks } = await supabase
				.from("tasks")
				.select("id")
				.eq("user_id", user.id)
				.eq("is_current", false);
			trackDbCall("select", "tasks");

			const existingDayIds = new Set(existingDays?.map(d => d.id) || []);
			const newDayIds = new Set(days.map(d => d.id));
			const existingTaskIds = new Set(existingTasks?.map(t => t.id) || []);
			const newTaskIds = new Set(allTasks.map(t => t.id));

			// Step 2: Delete archived days that no longer exist in local state
			const daysToDelete = Array.from(existingDayIds).filter(id => !newDayIds.has(id));
			if (daysToDelete.length > 0) {
				const { error: deleteDaysError } = await supabase
					.from("archived_days")
					.delete()
					.eq("user_id", user.id)
					.in("id", daysToDelete);
				trackDbCall("delete", "archived_days");

				if (deleteDaysError) {
					console.error("❌ Error deleting obsolete days:", deleteDaysError);
					throw deleteDaysError;
				}
			}

			// Step 3: Delete archived tasks that no longer exist in local state
			const tasksToDelete = Array.from(existingTaskIds).filter(id => !newTaskIds.has(id));
			if (tasksToDelete.length > 0) {
				const { error: deleteTasksError } = await supabase
					.from("tasks")
					.delete()
					.eq("user_id", user.id)
					.eq("is_current", false)
					.in("id", tasksToDelete);
				trackDbCall("delete", "tasks");

				if (deleteTasksError) {
					console.error("❌ Error deleting obsolete tasks:", deleteTasksError);
					throw deleteTasksError;
				}
			}

			// Step 4: Upsert archived days
			const { error: daysError } = await supabase
				.from("archived_days")
				.upsert(archivedDaysToUpsert, { onConflict: "id" });
			trackDbCall("upsert", "archived_days");

			if (daysError) {
				console.error("❌ Error upserting archived days:", daysError);
				throw daysError;
			}

			// Step 5: Upsert archived tasks
			if (allTasks.length > 0) {

				const { error: tasksError } = await supabase
					.from("tasks")
					.upsert(allTasks, { onConflict: "id" });
				trackDbCall("upsert", "tasks");

				if (tasksError) {
					console.error("❌ Error upserting archived tasks:", tasksError);
					console.error("❌ Failed task data sample:", allTasks[0]);
					throw tasksError;
				}

			}

			await this.verifyArchivedDataIntegrity(days);
		} catch (error) {
			console.error("💥 Archiving save failed:", error);
			console.error("🚨 Data that failed to save:", {
				daysCount: archivedDaysToUpsert.length,
				tasksCount: allTasks.length,
				firstDay: archivedDaysToUpsert[0]?.date,
				error: error
			});
			throw error;
		}
	}

	private async verifyArchivedDataIntegrity(expectedDays: DayRecord[]): Promise<void> {
		try {
			const user = await this.requireUser();

			const { data: savedDays, error: daysError } = await supabase
				.from("archived_days")
				.select("id")
				.eq("user_id", user.id);

			if (daysError) {
				console.warn("⚠️ Could not verify archived days:", daysError);
				return;
			}

			const { data: savedTasks, error: tasksError } = await supabase
				.from("tasks")
				.select("id")
				.eq("user_id", user.id)
				.eq("is_current", false);

			if (tasksError) {
				console.warn("⚠️ Could not verify archived tasks:", tasksError);
				return;
			}

			const expectedTasksCount = expectedDays.reduce((sum, day) => sum + day.tasks.length, 0);

			if (savedDays?.length !== expectedDays.length) {
				console.error("❌ Archive verification failed: Day count mismatch");
			}

			if (savedTasks?.length !== expectedTasksCount) {
				console.error("❌ Archive verification failed: Task count mismatch");
				throw new Error(
					`Archive verification failed: Expected ${expectedTasksCount} tasks, found ${savedTasks?.length}`
				);
			}

		} catch (error) {
			console.error("❌ Archive verification failed:", error);
			throw error;
		}
	}

	async getArchivedDays(): Promise<DayRecord[]> {

		const user = await this.requireUser();

		const { data: daysData, error: daysError } = await supabase
			.from("archived_days")
			.select("*")
			.eq("user_id", user.id)
			.order("start_time", { ascending: false });

		if (daysError) {
			console.error("❌ Error loading archived days:", daysError);
			throw daysError;
		}

		if (!daysData || daysData.length === 0) {
			return [];
		}

		const { data: tasksData, error: tasksError } = await supabase
			.from("tasks")
			.select("*")
			.eq("user_id", user.id)
			.eq("is_current", false)
			.order("start_time", { ascending: true });

		if (tasksError) {
			console.error("❌ Error loading archived tasks:", tasksError);
			throw tasksError;
		}

		const tasksByDay: Record<string, Task[]> = {};
		(tasksData || []).forEach((task) => {
			if (!task.day_record_id) return;

			if (!tasksByDay[task.day_record_id]) {
				tasksByDay[task.day_record_id] = [];
			}

			tasksByDay[task.day_record_id].push({
				id: task.id,
				title: task.title,
				description: task.description || undefined,
				startTime: new Date(task.start_time),
				endTime: task.end_time ? new Date(task.end_time) : undefined,
				duration: task.duration || undefined,
				project: task.project_name || undefined,
				client: task.client || undefined,
				category: task.category_id || undefined,
				insertedAt: task.inserted_at ? new Date(task.inserted_at) : undefined,
				updatedAt: task.updated_at ? new Date(task.updated_at) : undefined
			});
		});

		const result = daysData.map((day) => ({
			id: day.id,
			date: day.date,
			tasks: tasksByDay[day.id] || [],
			totalDuration: day.total_duration,
			startTime: new Date(day.start_time),
			endTime: new Date(day.end_time),
			notes: day.notes,
			insertedAt: day.inserted_at ? new Date(day.inserted_at) : undefined,
			updatedAt: day.updated_at ? new Date(day.updated_at) : undefined
		}));

		return result;
	}

	async updateArchivedDay(dayId: string, updates: Partial<DayRecord>): Promise<void> {
		const user = await this.requireUser();

		const categories = getCachedCategories() ?? [];
		const projects = getCachedProjects() ?? [];
		const categoryMap = new Map(categories.map(c => [c.id, c]));
		const projectMap = new Map(projects.map(p => [p.name, p]));

		const updateData: Record<string, unknown> = {};

		if (updates.date) updateData.date = updates.date;
		if (updates.totalDuration !== undefined) updateData.total_duration = updates.totalDuration;
		if (updates.startTime) updateData.start_time = updates.startTime.toISOString();
		if (updates.endTime) updateData.end_time = updates.endTime.toISOString();
		if (updates.notes !== undefined) updateData.notes = updates.notes;

		const { error: dayError } = await supabase
			.from("archived_days")
			.update(updateData)
			.eq("id", dayId)
			.eq("user_id", user.id);
		trackDbCall("update", "archived_days");

		if (dayError) throw dayError;

		if (updates.tasks) {
			const { data: existingTasks } = await supabase
				.from("tasks")
				.select("id")
				.eq("day_record_id", dayId)
				.eq("user_id", user.id)
				.eq("is_current", false);
			trackDbCall("select", "tasks");

			const existingTaskIds = new Set(existingTasks?.map(t => t.id) || []);
			const newTaskIds = new Set(updates.tasks.map(t => t.id));

			const tasksToDelete = Array.from(existingTaskIds).filter(id => !newTaskIds.has(id));
			if (tasksToDelete.length > 0) {
				const { error: deleteError } = await supabase
					.from("tasks")
					.delete()
					.eq("day_record_id", dayId)
					.eq("user_id", user.id)
					.eq("is_current", false)
					.in("id", tasksToDelete);
				trackDbCall("delete", "tasks");

				if (deleteError) throw deleteError;
			}

			if (updates.tasks.length > 0) {
				const tasksToUpsert = updates.tasks.map((task) => {
					const category = categoryMap.get(task.category ?? "");
					const project = projectMap.get(task.project ?? "");

					return {
						id: task.id,
						user_id: user.id,
						title: task.title,
						description: task.description || null,
						start_time: task.startTime.toISOString(),
						end_time: task.endTime?.toISOString() || null,
						duration: task.duration || null,
						project_id: project?.id || null,
						project_name: task.project || null,
						client: task.client || null,
						category_id: task.category || null,
						category_name: category?.name || null,
						day_record_id: dayId,
						is_current: false
					};
				});

				const { error: tasksError } = await supabase
					.from("tasks")
					.upsert(tasksToUpsert, { onConflict: "id" });
				trackDbCall("upsert", "tasks");

				if (tasksError) throw tasksError;
			}
		}
	}

	async deleteArchivedDay(dayId: string): Promise<void> {
		const user = await this.requireUser();

		// Delete tasks first (foreign key dependency)
		await supabase
			.from("tasks")
			.delete()
			.eq("day_record_id", dayId)
			.eq("user_id", user.id);

		const { error } = await supabase
			.from("archived_days")
			.delete()
			.eq("id", dayId)
			.eq("user_id", user.id);

		if (error) throw error;
	}

	async saveProjects(projects: Project[]): Promise<void> {

		const user = await this.requireUser();

		if (projects.length === 0) {
			await supabase.from("projects").delete().eq("user_id", user.id);
			trackDbCall("delete", "projects");
			clearDataCaches();
			return;
		}

		const { data: existingProjects } = await supabase
			.from("projects")
			.select("id")
			.eq("user_id", user.id);
		trackDbCall("select", "projects");

		const existingProjectIds = new Set(existingProjects?.map(p => p.id) || []);
		const newProjectIds = new Set(projects.map(p => p.id));

		const projectsToDelete = Array.from(existingProjectIds).filter(
			id => !newProjectIds.has(id)
		);
		if (projectsToDelete.length > 0) {
			const { error: deleteError } = await supabase
				.from("projects")
				.delete()
				.eq("user_id", user.id)
				.in("id", projectsToDelete);
			trackDbCall("delete", "projects");

			if (deleteError) {
				console.error("❌ Error deleting obsolete projects:", deleteError);
				throw deleteError;
			}
		}

		const projectsToUpsert = projects.map((project) => ({
			id: project.id,
			user_id: user.id,
			name: project.name,
			client: project.client,
			hourly_rate: project.hourlyRate || null,
			color: project.color || null,
			is_billable: project.isBillable !== false
		}));

		const { error } = await supabase
			.from("projects")
			.upsert(projectsToUpsert, { onConflict: "id" });
		trackDbCall("upsert", "projects");

		if (error) {
			console.error("❌ Error upserting projects:", error);
			throw error;
		}

		setCachedProjects(projects);
	}

	async getProjects(): Promise<Project[]> {

		const cachedResult = await getCachedProjects();
		if (cachedResult) {
			return cachedResult;
		}

		const user = await this.requireUser();

		const { data, error } = await supabase
			.from("projects")
			.select("*")
			.eq("user_id", user.id)
			.order("name", { ascending: true });

		if (error) {
			console.error("❌ Error loading projects:", error);
			throw error;
		}

		const result = (data || []).map((project) => ({
			id: project.id,
			name: project.name,
			client: project.client,
			hourlyRate: project.hourly_rate || undefined,
			color: project.color || undefined,
			isBillable: project.is_billable !== false
		}));

		setCachedProjects(result);
		return result;
	}

	async saveCategories(categories: TaskCategory[]): Promise<void> {

		const user = await this.requireUser();

		if (categories.length === 0) {
			await supabase.from("categories").delete().eq("user_id", user.id);
			trackDbCall("delete", "categories");
			clearDataCaches();
			return;
		}

		const { data: existingCategories } = await supabase
			.from("categories")
			.select("id")
			.eq("user_id", user.id);
		trackDbCall("select", "categories");

		const existingCategoryIds = new Set(existingCategories?.map(c => c.id) || []);
		const newCategoryIds = new Set(categories.map(c => c.id));

		const categoriesToDelete = Array.from(existingCategoryIds).filter(
			id => !newCategoryIds.has(id)
		);
		if (categoriesToDelete.length > 0) {
			const { error: deleteError } = await supabase
				.from("categories")
				.delete()
				.eq("user_id", user.id)
				.in("id", categoriesToDelete);
			trackDbCall("delete", "categories");

			if (deleteError) {
				console.error("❌ Error deleting obsolete categories:", deleteError);
				throw deleteError;
			}
		}

		const categoriesToUpsert = categories.map((category) => ({
			id: category.id,
			user_id: user.id,
			name: category.name,
			color: category.color || null,
			icon: null,
			is_billable: category.isBillable !== false
		}));

		const { error } = await supabase
			.from("categories")
			.upsert(categoriesToUpsert, { onConflict: "id" });
		trackDbCall("upsert", "categories");

		if (error) {
			console.error("❌ Error upserting categories:", error);
			throw error;
		}

		setCachedCategories(categories);
	}

	async getCategories(): Promise<TaskCategory[]> {

		const cachedResult = await getCachedCategories();
		if (cachedResult) {
			return cachedResult;
		}

		const user = await this.requireUser();

		const { data, error } = await supabase
			.from("categories")
			.select("*")
			.eq("user_id", user.id)
			.order("name", { ascending: true });

		if (error) {
			console.error("❌ Error loading categories:", error);
			throw error;
		}

		const result = (data || []).map((category) => ({
			id: category.id,
			name: category.name,
			color: category.color || "#8B5CF6",
			isBillable: category.is_billable !== false
		}));

		setCachedCategories(result);
		return result;
	}

	async saveTodos(todos: TodoItem[]): Promise<void> {
		const user = await this.requireUser();

		if (todos.length === 0) {
			await supabase.from("todo_items").delete().eq("user_id", user.id);
			trackDbCall("delete", "todo_items");
			return;
		}

		const { data: existingTodos } = await supabase
			.from("todo_items")
			.select("id")
			.eq("user_id", user.id);
		trackDbCall("select", "todo_items");

		const existingIds = new Set(existingTodos?.map((t: { id: string }) => t.id) || []);
		const newIds = new Set(todos.map((t) => t.id));

		const toDelete = Array.from(existingIds).filter((id) => !newIds.has(id));
		if (toDelete.length > 0) {
			const { error: deleteError } = await supabase
				.from("todo_items")
				.delete()
				.eq("user_id", user.id)
				.in("id", toDelete);
			trackDbCall("delete", "todo_items");
			if (deleteError) throw deleteError;
		}

		const toUpsert = todos.map((item) => ({
			id: item.id,
			user_id: user.id,
			text: item.text,
			completed: item.completed,
			created_at: item.createdAt,
			completed_at: item.completedAt ?? null
		}));

		const { error } = await supabase
			.from("todo_items")
			.upsert(toUpsert, { onConflict: "id" });
		trackDbCall("upsert", "todo_items");
		if (error) throw error;
	}

	async getTodos(): Promise<TodoItem[]> {
		const user = await this.requireUser();

		const { data, error } = await supabase
			.from("todo_items")
			.select("*")
			.eq("user_id", user.id)
			.order("created_at", { ascending: true });
		trackDbCall("select", "todo_items");

		if (error) {
			console.error("❌ Error loading todos:", error);
			throw error;
		}

		return (data || []).map((row: {
			id: string;
			text: string;
			completed: boolean;
			created_at: string;
			completed_at: string | null;
		}) => ({
			id: row.id,
			text: row.text,
			completed: row.completed,
			createdAt: row.created_at,
			completedAt: row.completed_at ?? undefined
		}));
	}

	async migrateFromLocalStorage(): Promise<void> {
		try {
			const localService = new LocalStorageService();

			const projects = await localService.getProjects();
			const categories = await localService.getCategories();
			const currentDay = await localService.getCurrentDay();
			const archivedDays = await localService.getArchivedDays();
			const todos = await localService.getTodos();

			const hasProjects = projects.length > 0;
			const hasCategories = categories.length > 0;
			const hasCurrentDay =
				currentDay && (currentDay.tasks.length > 0 || currentDay.isDayStarted);
			const hasArchivedDays = archivedDays.length > 0;
			const hasTodos = todos.length > 0;

			if (!hasProjects && !hasCategories && !hasCurrentDay && !hasArchivedDays && !hasTodos) {
				return;
			}

			const existingCurrentDay = await this.getCurrentDay();
			const existingArchivedDays = await this.getArchivedDays();
			const existingProjects = await this.getProjects();

			const hasExistingData =
				(existingCurrentDay &&
					(existingCurrentDay.tasks.length > 0 || existingCurrentDay.isDayStarted)) ||
				existingArchivedDays.length > 0 ||
				existingProjects.length > 0;

			if (hasExistingData) {

				const shouldMigrateCurrentDay =
					hasCurrentDay &&
					(!existingCurrentDay ||
						(currentDay?.tasks.length ?? 0) > existingCurrentDay.tasks.length);

				const shouldMigrateArchived =
					hasArchivedDays && archivedDays.length > existingArchivedDays.length;

				if (shouldMigrateCurrentDay) {
					if (currentDay) {
						await this.saveCurrentDay(currentDay);
					} else {
						console.warn("⚠️ Tried to migrate current day, but currentDay is null or undefined.");
					}
				}

				if (shouldMigrateArchived) {
					await this.saveArchivedDays(archivedDays);
				}

				if (hasProjects) {
					await this.saveProjects(projects);
				}

				const existingCategories = await this.getCategories();
				if (hasCategories && existingCategories.length === 0) {
					await this.saveCategories(categories);
				}

				if (hasTodos) {
					await this.saveTodos(todos);
				}
			} else {

				if (hasProjects) await this.saveProjects(projects);
				if (hasCategories) await this.saveCategories(categories);
				if (hasCurrentDay) await this.saveCurrentDay(currentDay);
				if (hasArchivedDays) await this.saveArchivedDays(archivedDays);
				if (hasTodos) await this.saveTodos(todos);
			}

		} catch (error) {
			console.error("❌ Error migrating data from localStorage:", error);
		}
	}

	async migrateToLocalStorage(): Promise<void> {
		try {
			const localService = new LocalStorageService();

			const currentDay = await this.getCurrentDay();
			const archivedDays = await this.getArchivedDays();
			const projects = await this.getProjects();
			const categories = await this.getCategories();
			const todos = await this.getTodos();

			if (currentDay) {
				await localService.saveCurrentDay(currentDay);
			}

			if (archivedDays.length > 0) {
				await localService.saveArchivedDays(archivedDays);
			}

			if (projects.length > 0) {
				await localService.saveProjects(projects);
			}

			if (categories.length > 0) {
				await localService.saveCategories(categories);
			}

			if (todos.length > 0) {
				await localService.saveTodos(todos);
			}

		} catch (error) {
			console.error("❌ Error migrating data to localStorage:", error);
		}
	}
}
