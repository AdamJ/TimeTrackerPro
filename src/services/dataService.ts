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

// Supabase implementation
class SupabaseService implements DataService {
	async saveCurrentDay(data: CurrentDayData): Promise<void> {
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
	}

	async getCurrentDay(): Promise<CurrentDayData | null> {
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

	async saveArchivedDays(days: DayRecord[]): Promise<void> {
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
	}

	async getArchivedDays(): Promise<DayRecord[]> {
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

	async updateArchivedDay(dayId: string, updates: Partial<DayRecord>): Promise<void> {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('User not authenticated');

		const updateData: Record<string, unknown> = {};

		if (updates.date) updateData.date = updates.date;
		if (updates.totalDuration !== undefined) updateData.total_duration = updates.totalDuration;
		if (updates.startTime) updateData.start_time = updates.startTime.toISOString();
		if (updates.endTime) updateData.end_time = updates.endTime.toISOString();
		if (updates.notes !== undefined) updateData.notes = updates.notes;
		if (updates.tasks) updateData.tasks = JSON.stringify(updates.tasks);

		const { error } = await supabase
			.from('archived_days')
			.update(updateData)
			.eq('id', dayId)
			.eq('user_id', user.id);

		if (error) throw error;
	}

	async deleteArchivedDay(dayId: string): Promise<void> {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('User not authenticated');

		const { error } = await supabase
			.from('archived_days')
			.delete()
			.eq('id', dayId)
			.eq('user_id', user.id);

		if (error) throw error;
	}

	async saveProjects(projects: Project[]): Promise<void> {
		// Store projects in localStorage for now - could be moved to Supabase later
		localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
	}

	async getProjects(): Promise<Project[]> {
		// Load projects from localStorage for now - could be moved to Supabase later
		try {
			const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
			return saved ? JSON.parse(saved) : [];
		} catch (error) {
			console.error('Error loading projects:', error);
			return [];
		}
	}

	async saveCategories(categories: TaskCategory[]): Promise<void> {
		// Store categories in localStorage for now - could be moved to Supabase later
		localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
	}

	async getCategories(): Promise<TaskCategory[]> {
		// Load categories from localStorage for now - could be moved to Supabase later
		try {
			const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
			return saved ? JSON.parse(saved) : [];
		} catch (error) {
			console.error('Error loading categories:', error);
			return [];
		}
	}

	async migrateFromLocalStorage(): Promise<void> {
		try {
			const localService = new LocalStorageService();

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
