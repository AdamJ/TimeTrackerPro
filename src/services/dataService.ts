import { supabase } from '@/lib/supabase';
import { Task, DayRecord, Project } from '@/contexts/TimeTrackingContext';
import { TaskCategory } from '@/config/categories';

// Storage keys for localStorage
export const STORAGE_KEYS = {
	CURRENT_DAY: 'timetracker_current_day',
	ARCHIVED_DAYS: 'timetracker_archived_days',
	PROJECTS: 'timetracker_projects',
	CATEGORIES: 'timetracker_categories'
};

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
	updateArchivedDay: (dayId: string, updates: Partial<DayRecord>) => Promise<void>;
	deleteArchivedDay: (dayId: string) => Promise<void>;

	// Projects operations
	saveProjects: (projects: Project[]) => Promise<void>;
	getProjects: () => Promise<Project[]>;

	// Categories operations
	saveCategories: (categories: TaskCategory[]) => Promise<void>;
	getCategories: () => Promise<TaskCategory[]>;

	// Utility methods
	migrateFromLocalStorage: () => Promise<void>;
}

// localStorage implementation
class LocalStorageService implements DataService {
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
				tasks: data.tasks.map((task: Task) => ({
					...task,
					startTime: new Date(task.startTime),
					endTime: task.endTime ? new Date(task.endTime) : undefined
				})),
				currentTask: data.currentTask ? {
					...data.currentTask,
					startTime: new Date(data.currentTask.startTime),
					endTime: data.currentTask.endTime ? new Date(data.currentTask.endTime) : undefined
				} : null
			};
		} catch (error) {
			console.error('Error loading current day from localStorage:', error);
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
			console.error('Error loading archived days from localStorage:', error);
			return [];
		}
	}

	async updateArchivedDay(dayId: string, updates: Partial<DayRecord>): Promise<void> {
		const days = await this.getArchivedDays();
		const updatedDays = days.map(day =>
			day.id === dayId ? { ...day, ...updates } : day
		);
		await this.saveArchivedDays(updatedDays);
	}

	async deleteArchivedDay(dayId: string): Promise<void> {
		const days = await this.getArchivedDays();
		const filteredDays = days.filter(day => day.id !== dayId);
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
			console.error('Error loading projects from localStorage:', error);
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
			console.error('Error loading categories from localStorage:', error);
			return [];
		}
	}

	async migrateFromLocalStorage(): Promise<void> {
		// No-op for localStorage service
	}
}

// Supabase implementation with graceful fallback
class SupabaseService implements DataService {
	private hasNewSchema: boolean | null = null;

	// Check if the new schema exists
	private async checkNewSchema(): Promise<boolean> {
		if (this.hasNewSchema !== null) {
			return this.hasNewSchema;
		}

		try {
			// Try to query the projects table to see if it exists
			await supabase.from('projects').select('id').limit(1);
			this.hasNewSchema = true;
			return true;
		} catch (error) {
			console.warn('New schema not detected, falling back to localStorage for projects and categories');
			this.hasNewSchema = false;
			return false;
		}
	}
	async saveCurrentDay(data: CurrentDayData): Promise<void> {
		const hasNewSchema = await this.checkNewSchema();

		if (!hasNewSchema) {
			// Fallback to old schema format
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error('User not authenticated');

			const { error } = await supabase
				.from('current_day')
				.upsert({
					user_id: user.id,
					is_day_started: data.isDayStarted,
					day_start_time: data.dayStartTime?.toISOString(),
					tasks: JSON.stringify({
						tasks: data.tasks,
						currentTask: data.currentTask
					})
				});

			if (error) throw error;
			return;
		}

		// New schema implementation
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('User not authenticated');

		// Save current day state
		const { error: currentDayError } = await supabase
			.from('current_day')
			.upsert({
				user_id: user.id,
				is_day_started: data.isDayStarted,
				day_start_time: data.dayStartTime?.toISOString(),
				current_task_id: data.currentTask?.id || null
			});

		if (currentDayError) throw currentDayError;

		// Clear existing non-archived tasks for this user
		const { error: clearError } = await supabase
			.from('tasks')
			.delete()
			.eq('user_id', user.id)
			.eq('is_current', true);

		if (clearError) throw clearError;

		// Save all current tasks
		if (data.tasks.length > 0) {
			const tasksToInsert = data.tasks.map(task => ({
				id: task.id,
				user_id: user.id,
				title: task.title,
				description: task.description || null,
				start_time: task.startTime.toISOString(),
				end_time: task.endTime?.toISOString() || null,
				duration: task.duration || null,
				project_id: task.project || null,
				project_name: task.project || null, // Store project name for easier querying
				client: task.client || null,
				category_id: task.category || null,
				category_name: task.category || null, // Store category name for easier querying
				day_record_id: null, // Not archived yet
				is_current: true
			}));

			const { error: tasksError } = await supabase
				.from('tasks')
				.insert(tasksToInsert);

			if (tasksError) throw tasksError;
		}
	}

	async getCurrentDay(): Promise<CurrentDayData | null> {
		const hasNewSchema = await this.checkNewSchema();

		if (!hasNewSchema) {
			// Fallback to old schema format
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error('User not authenticated');

			const { data, error } = await supabase
				.from('current_day')
				.select('*')
				.eq('user_id', user.id)
				.single();

			if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
				throw error;
			}

			if (!data) return null;

			const tasksData = JSON.parse(data.tasks || '{}');
			return {
				isDayStarted: data.is_day_started,
				dayStartTime: data.day_start_time ? new Date(data.day_start_time) : null,
				tasks: (tasksData.tasks || []).map((task: Task) => ({
					...task,
					startTime: new Date(task.startTime),
					endTime: task.endTime ? new Date(task.endTime) : undefined
				})),
				currentTask: tasksData.currentTask ? {
					...tasksData.currentTask,
					startTime: new Date(tasksData.currentTask.startTime),
					endTime: tasksData.currentTask.endTime ? new Date(tasksData.currentTask.endTime) : undefined
				} : null
			};
		}

		// New schema implementation
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('User not authenticated');

		// Get current day state
		const { data: currentDayData, error: currentDayError } = await supabase
			.from('current_day')
			.select('*')
			.eq('user_id', user.id)
			.single();

		if (currentDayError && currentDayError.code !== 'PGRST116') {
			throw currentDayError;
		}

		// Get current tasks
		const { data: tasksData, error: tasksError } = await supabase
			.from('tasks')
			.select('*')
			.eq('user_id', user.id)
			.eq('is_current', true)
			.order('start_time', { ascending: true });

		if (tasksError) throw tasksError;

		if (!currentDayData && (!tasksData || tasksData.length === 0)) {
			return null;
		}

		// Convert tasks from database format
		const tasks: Task[] = (tasksData || []).map(task => ({
			id: task.id,
			title: task.title,
			description: task.description || undefined,
			startTime: new Date(task.start_time),
			endTime: task.end_time ? new Date(task.end_time) : undefined,
			duration: task.duration || undefined,
			project: task.project_name || undefined,
			client: task.client || undefined,
			category: task.category_name || undefined
		}));

		// Find current task
		const currentTask = currentDayData?.current_task_id
			? tasks.find(task => task.id === currentDayData.current_task_id) || null
			: null;

		return {
			isDayStarted: currentDayData?.is_day_started || false,
			dayStartTime: currentDayData?.day_start_time ? new Date(currentDayData.day_start_time) : null,
			tasks,
			currentTask
		};
	}

	async saveArchivedDays(days: DayRecord[]): Promise<void> {
		const hasNewSchema = await this.checkNewSchema();

		if (!hasNewSchema) {
			// Fallback to old schema format
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error('User not authenticated');

			// First, delete existing archived days for this user
			await supabase
				.from('archived_days')
				.delete()
				.eq('user_id', user.id);

			// Then insert all days
			if (days.length > 0) {
				const { error } = await supabase
					.from('archived_days')
					.insert(
						days.map(day => ({
							id: day.id,
							user_id: user.id,
							date: day.date,
							tasks: JSON.stringify(day.tasks),
							total_duration: day.totalDuration,
							start_time: day.startTime.toISOString(),
							end_time: day.endTime.toISOString(),
							notes: day.notes
						}))
					);

				if (error) throw error;
			}
			return;
		}

		// New schema implementation
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('User not authenticated');

		// Delete existing archived days and their tasks
		await supabase
			.from('tasks')
			.delete()
			.eq('user_id', user.id)
			.eq('is_current', false);

		await supabase
			.from('archived_days')
			.delete()
			.eq('user_id', user.id);

		if (days.length === 0) return;

		// Insert archived days
		const archivedDaysToInsert = days.map(day => ({
			id: day.id,
			user_id: user.id,
			date: day.date,
			total_duration: day.totalDuration,
			start_time: day.startTime.toISOString(),
			end_time: day.endTime.toISOString(),
			notes: day.notes
		}));

		const { error: daysError } = await supabase
			.from('archived_days')
			.insert(archivedDaysToInsert);

		if (daysError) throw daysError;

		// Insert all archived tasks
		const allTasks = days.flatMap(day =>
			day.tasks.map(task => ({
				id: task.id,
				user_id: user.id,
				title: task.title,
				description: task.description || null,
				start_time: task.startTime.toISOString(),
				end_time: task.endTime?.toISOString() || null,
				duration: task.duration || null,
				project_id: task.project || null,
				project_name: task.project || null,
				client: task.client || null,
				category_id: task.category || null,
				category_name: task.category || null,
				day_record_id: day.id,
				is_current: false
			}))
		);

		if (allTasks.length > 0) {
			const { error: tasksError } = await supabase
				.from('tasks')
				.insert(allTasks);

			if (tasksError) throw tasksError;
		}
	}

	async getArchivedDays(): Promise<DayRecord[]> {
		const hasNewSchema = await this.checkNewSchema();

		if (!hasNewSchema) {
			// Fallback to old schema format
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error('User not authenticated');

			const { data, error } = await supabase
				.from('archived_days')
				.select('*')
				.eq('user_id', user.id)
				.order('start_time', { ascending: false });

			if (error) throw error;

			return (data || []).map(day => ({
				id: day.id,
				date: day.date,
				tasks: JSON.parse(day.tasks || '[]').map((task: Task) => ({
					...task,
					startTime: new Date(task.startTime),
					endTime: task.endTime ? new Date(task.endTime) : undefined
				})),
				totalDuration: day.total_duration,
				startTime: new Date(day.start_time),
				endTime: new Date(day.end_time),
				notes: day.notes
			}));
		}

		// New schema implementation
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('User not authenticated');

		// Get archived days
		const { data: daysData, error: daysError } = await supabase
			.from('archived_days')
			.select('*')
			.eq('user_id', user.id)
			.order('start_time', { ascending: false });

		if (daysError) throw daysError;

		if (!daysData || daysData.length === 0) return [];

		// Get all archived tasks
		const { data: tasksData, error: tasksError } = await supabase
			.from('tasks')
			.select('*')
			.eq('user_id', user.id)
			.eq('is_current', false)
			.order('start_time', { ascending: true });

		if (tasksError) throw tasksError;

		// Group tasks by day record
		const tasksByDay: Record<string, Task[]> = {};
		(tasksData || []).forEach(task => {
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
				category: task.category_name || undefined
			});
		});

		// Combine days with their tasks
		return daysData.map(day => ({
			id: day.id,
			date: day.date,
			tasks: tasksByDay[day.id] || [],
			totalDuration: day.total_duration,
			startTime: new Date(day.start_time),
			endTime: new Date(day.end_time),
			notes: day.notes
		}));
	}

	async updateArchivedDay(dayId: string, updates: Partial<DayRecord>): Promise<void> {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('User not authenticated');

		const updateData: Record<string, unknown> = {};

		if (updates.date) updateData.date = updates.date;
		if (updates.totalDuration !== undefined) updateData.total_duration = updates.totalDuration;
		if (updates.startTime) updateData.start_time = updates.startTime.toISOString();
		if (updates.endTime) updateData.end_time = updates.endTime.toISOString();
		if (updates.notes !== undefined) updateData.notes = updates.notes;

		// Update archived day
		const { error: dayError } = await supabase
			.from('archived_days')
			.update(updateData)
			.eq('id', dayId)
			.eq('user_id', user.id);

		if (dayError) throw dayError;

		// Update tasks if provided
		if (updates.tasks) {
			// Delete existing tasks for this day
			await supabase
				.from('tasks')
				.delete()
				.eq('day_record_id', dayId)
				.eq('user_id', user.id);

			// Insert updated tasks
			if (updates.tasks.length > 0) {
				const tasksToInsert = updates.tasks.map(task => ({
					id: task.id,
					user_id: user.id,
					title: task.title,
					description: task.description || null,
					start_time: task.startTime.toISOString(),
					end_time: task.endTime?.toISOString() || null,
					duration: task.duration || null,
					project_id: task.project || null,
					project_name: task.project || null,
					client: task.client || null,
					category_id: task.category || null,
					category_name: task.category || null,
					day_record_id: dayId,
					is_current: false
				}));

				const { error: tasksError } = await supabase
					.from('tasks')
					.insert(tasksToInsert);

				if (tasksError) throw tasksError;
			}
		}
	}

	async deleteArchivedDay(dayId: string): Promise<void> {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('User not authenticated');

		// Delete tasks first (foreign key dependency)
		await supabase
			.from('tasks')
			.delete()
			.eq('day_record_id', dayId)
			.eq('user_id', user.id);

		// Delete archived day
		const { error } = await supabase
			.from('archived_days')
			.delete()
			.eq('id', dayId)
			.eq('user_id', user.id);

		if (error) throw error;
	}

	async saveProjects(projects: Project[]): Promise<void> {
		const hasNewSchema = await this.checkNewSchema();

		if (!hasNewSchema) {
			// Fallback to localStorage if new schema doesn't exist
			localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
			return;
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('User not authenticated');

		// Delete existing projects
		await supabase
			.from('projects')
			.delete()
			.eq('user_id', user.id);

		if (projects.length === 0) return;

		// Insert new projects
		const projectsToInsert = projects.map(project => ({
			id: project.id,
			user_id: user.id,
			name: project.name,
			client: project.client,
			hourly_rate: project.hourlyRate || null,
			color: project.color || null
		}));

		const { error } = await supabase
			.from('projects')
			.insert(projectsToInsert);

		if (error) throw error;
	}

	async getProjects(): Promise<Project[]> {
		const hasNewSchema = await this.checkNewSchema();

		if (!hasNewSchema) {
			// Fallback to localStorage if new schema doesn't exist
			try {
				const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
				return saved ? JSON.parse(saved) : [];
			} catch (error) {
				console.error('Error loading projects from localStorage:', error);
				return [];
			}
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('User not authenticated');

		const { data, error } = await supabase
			.from('projects')
			.select('*')
			.eq('user_id', user.id)
			.order('name', { ascending: true });

		if (error) throw error;

		return (data || []).map(project => ({
			id: project.id,
			name: project.name,
			client: project.client,
			hourlyRate: project.hourly_rate || undefined,
			color: project.color || undefined
		}));
	}

	async saveCategories(categories: TaskCategory[]): Promise<void> {
		const hasNewSchema = await this.checkNewSchema();

		if (!hasNewSchema) {
			// Fallback to localStorage if new schema doesn't exist
			localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
			return;
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('User not authenticated');

		// Delete existing categories
		await supabase
			.from('categories')
			.delete()
			.eq('user_id', user.id);

		if (categories.length === 0) return;

		// Insert new categories
		const categoriesToInsert = categories.map(category => ({
			id: category.id,
			user_id: user.id,
			name: category.name,
			color: category.color || null,
			icon: null // Icon field exists in DB but not in interface yet
		}));

		const { error } = await supabase
			.from('categories')
			.insert(categoriesToInsert);

		if (error) throw error;
	}

	async getCategories(): Promise<TaskCategory[]> {
		const hasNewSchema = await this.checkNewSchema();

		if (!hasNewSchema) {
			// Fallback to localStorage if new schema doesn't exist
			try {
				const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
				return saved ? JSON.parse(saved) : [];
			} catch (error) {
				console.error('Error loading categories from localStorage:', error);
				return [];
			}
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('User not authenticated');

		const { data, error } = await supabase
			.from('categories')
			.select('*')
			.eq('user_id', user.id)
			.order('name', { ascending: true });

		if (error) throw error;

		return (data || []).map(category => ({
			id: category.id,
			name: category.name,
			color: category.color || undefined
		}));
	}

	async migrateFromLocalStorage(): Promise<void> {
		try {
			const localService = new LocalStorageService();

			// Migrate projects
			const projects = await localService.getProjects();
			if (projects.length > 0) {
				await this.saveProjects(projects);
			}

			// Migrate categories
			const categories = await localService.getCategories();
			if (categories.length > 0) {
				await this.saveCategories(categories);
			}

			// Migrate current day
			const currentDay = await localService.getCurrentDay();
			if (currentDay) {
				await this.saveCurrentDay(currentDay);
			}

			// Migrate archived days
			const archivedDays = await localService.getArchivedDays();
			if (archivedDays.length > 0) {
				await this.saveArchivedDays(archivedDays);
			}

			console.log('Data migration from localStorage completed');
		} catch (error) {
			console.error('Error migrating data from localStorage:', error);
		}
	}
}

// Factory function to get the appropriate service
export const createDataService = (isAuthenticated: boolean): DataService => {
	return isAuthenticated ? new SupabaseService() : new LocalStorageService();
};
