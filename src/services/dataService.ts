import { supabase, trackDbCall, getCachedUser, getCachedProjects, setCachedProjects, getCachedCategories, setCachedCategories, clearDataCaches, trackAuthCall } from '@/lib/supabase';
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
  updateArchivedDay: (
    id: string,
    updates: Partial<DayRecord>
  ) => Promise<void>;
  deleteArchivedDay: (id: string) => Promise<void>;

  // Projects operations
  saveProjects: (projects: Project[]) => Promise<void>;
  getProjects: () => Promise<Project[]>;

  // Categories operations
  saveCategories: (categories: TaskCategory[]) => Promise<void>;
  getCategories: () => Promise<TaskCategory[]>;

  // Migration operations
  migrateFromLocalStorage: () => Promise<void>;
  migrateToLocalStorage: () => Promise<void>;
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

  async updateArchivedDay(
    dayId: string,
    updates: Partial<DayRecord>
  ): Promise<void> {
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

  async migrateToLocalStorage(): Promise<void> {
    // No-op for localStorage service - already in localStorage
  }
}

// Supabase implementation with graceful fallback
class SupabaseService implements DataService {
  // Schema detection with permanent caching
  private hasNewSchema: boolean | null = null;
  private static schemaChecked: boolean = false;
  private static globalSchemaResult: boolean | null = null;

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
      trackAuthCall('getUser', 'SupabaseService.checkNewSchema');

      if (userError || !user) {
        console.warn('User not authenticated, cannot check schema');
        this.hasNewSchema = false;
        SupabaseService.globalSchemaResult = false;
        SupabaseService.schemaChecked = true;
        return false;
      }

      // Try to query the current_day table to see if the new schema exists
      // We use current_day because it's simpler and always exists in the new schema
      const { error } = await supabase
        .from('current_day')
        .select('user_id')
        .eq('user_id', user.id)
        .limit(1);
      trackDbCall('select', 'current_day', 'SupabaseService.checkNewSchema');

      if (error) {
        console.warn('New schema not detected:', error.message);
        this.hasNewSchema = false;
        SupabaseService.globalSchemaResult = false;
        SupabaseService.schemaChecked = true;
        return false;
      }

      this.hasNewSchema = true;
      SupabaseService.globalSchemaResult = true;
      SupabaseService.schemaChecked = true;
      console.log('✅ New schema confirmed and cached globally');
      return true;
    } catch (error) {
      console.warn(
        'Error checking schema, assuming new schema exists:',
        error
      );
      // Default to true since your schema.sql shows the new schema
      this.hasNewSchema = true;
      SupabaseService.globalSchemaResult = true;
      SupabaseService.schemaChecked = true;
      return true;
    }
  }
  async saveCurrentDay(data: CurrentDayData): Promise<void> {
    console.log('💾 SupabaseService: Saving current day...', {
      tasksCount: data.tasks.length,
      isDayStarted: data.isDayStarted,
      hasCurrentTask: !!data.currentTask
    });

    // Get cached user (much more efficient than repeated auth calls)
    const user = await getCachedUser();
    console.log('👤 User authenticated:', user.id);

    try {
      // Start a transaction-like approach with batch operations

      // 1. Save current day state
      const { error: currentDayError } = await supabase
        .from('current_day')
        .upsert({
          user_id: user.id,
          is_day_started: data.isDayStarted,
          day_start_time: data.dayStartTime?.toISOString(),
          current_task_id: data.currentTask?.id || null
        });
      trackDbCall('upsert', 'current_day');

      if (currentDayError) {
        console.error('❌ Error saving current day state:', currentDayError);
        throw currentDayError;
      }

      // 2. Handle tasks efficiently - only if there are changes
      if (data.tasks.length === 0) {
        // If no tasks, just delete all current tasks
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('user_id', user.id)
          .eq('is_current', true);
        trackDbCall('delete', 'tasks');

        if (deleteError) {
          console.error('❌ Error deleting all current tasks:', deleteError);
          throw deleteError;
        }
        console.log('🗑️ Deleted all current tasks (no tasks provided)');
      } else {
        // Get existing task IDs to minimize database operations
        const { data: existingTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_current', true);
        trackDbCall('select', 'tasks');

        const existingTaskIds = new Set(existingTasks?.map(t => t.id) || []);
        const newTaskIds = new Set(data.tasks.map(t => t.id));

        // 3. Delete obsolete tasks (exist in DB but not in current data)
        const tasksToDelete = Array.from(existingTaskIds).filter(id => !newTaskIds.has(id));
        if (tasksToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('tasks')
            .delete()
            .eq('user_id', user.id)
            .eq('is_current', true)
            .in('id', tasksToDelete);
          trackDbCall('delete', 'tasks');

          if (deleteError) {
            console.error('❌ Error deleting obsolete tasks:', deleteError);
            throw deleteError;
          }
          console.log('🗑️ Deleted obsolete tasks:', tasksToDelete.length);
        }

        // 4. Upsert current tasks (single batch operation)
        const tasksToUpsert = data.tasks.map((task) => ({
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
          day_record_id: null,
          is_current: true
        }));

        console.log('📝 Upserting tasks:', tasksToUpsert.length);

        const { error: tasksError } = await supabase
          .from('tasks')
          .upsert(tasksToUpsert, {
            onConflict: 'id'
          });
        trackDbCall('upsert', 'tasks');

        if (tasksError) {
          console.error('❌ Error upserting tasks:', tasksError);
          throw tasksError;
        }

        console.log('✅ Tasks upserted successfully');
      }

      console.log('✅ Current day saved successfully');
    } catch (error) {
      console.error('❌ Error in saveCurrentDay:', error);
      throw error;
    }
  }  async getCurrentDay(): Promise<CurrentDayData | null> {
    console.log('🔄 SupabaseService: Loading current day...');

    // Get cached user
    const user = await getCachedUser();
    console.log('👤 User authenticated:', user.id);

    // Get current day state
    const { data: currentDayData, error: currentDayError } = await supabase
      .from('current_day')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (currentDayError && currentDayError.code !== 'PGRST116') {
      console.error('❌ Error loading current day state:', currentDayError);
      throw currentDayError;
    }

    // Get current tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_current', true)
      .order('start_time', { ascending: true });

    if (tasksError) {
      console.error('❌ Error loading current tasks:', tasksError);
      throw tasksError;
    }

    console.log('📊 Loaded data:', {
      hasDayData: !!currentDayData,
      tasksCount: tasksData?.length || 0
    });

    if (!currentDayData && (!tasksData || tasksData.length === 0)) {
      console.log('📭 No current day data found');
      return null;
    }

    // Convert tasks from database format
    const tasks: Task[] = (tasksData || []).map((task) => ({
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

    console.log('✅ Current day loaded:', {
      isDayStarted: result.isDayStarted,
      tasksCount: result.tasks.length,
      hasCurrentTask: !!result.currentTask
    });

    return result;
  }

  async saveArchivedDays(days: DayRecord[]): Promise<void> {
    console.log('📁 SupabaseService: Saving archived days...', days.length);

    // Get cached user
    const user = await getCachedUser();
    console.log('👤 User authenticated:', user.id);

    // Delete existing archived days and their tasks
    await supabase
      .from('tasks')
      .delete()
      .eq('user_id', user.id)
      .eq('is_current', false);

    await supabase.from('archived_days').delete().eq('user_id', user.id);

    console.log('🗑️ Cleared existing archived data');

    if (days.length === 0) {
      console.log('📭 No archived days to save');
      return;
    }

    // Insert archived days
    const archivedDaysToInsert = days.map((day) => ({
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

    if (daysError) {
      console.error('❌ Error saving archived days:', daysError);
      throw daysError;
    }

    console.log('✅ Archived days saved');

    // Insert all archived tasks
    const allTasks = days.flatMap((day) =>
      day.tasks.map((task) => ({
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
      console.log('📝 Inserting archived tasks:', allTasks.length);

      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(allTasks);

      if (tasksError) {
        console.error('❌ Error saving archived tasks:', tasksError);
        throw tasksError;
      }

      console.log('✅ Archived tasks saved');
    }
  }

  async getArchivedDays(): Promise<DayRecord[]> {
    console.log('📁 SupabaseService: Loading archived days...');

    // Get cached user
    const user = await getCachedUser();

    console.log('👤 User authenticated:', user.id);

    // Get archived days
    const { data: daysData, error: daysError } = await supabase
      .from('archived_days')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false });

    if (daysError) {
      console.error('❌ Error loading archived days:', daysError);
      throw daysError;
    }

    if (!daysData || daysData.length === 0) {
      console.log('📭 No archived days found');
      return [];
    }

    console.log('📊 Found archived days:', daysData.length);

    // Get all archived tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_current', false)
      .order('start_time', { ascending: true });

    if (tasksError) {
      console.error('❌ Error loading archived tasks:', tasksError);
      throw tasksError;
    }

    console.log('📝 Found archived tasks:', tasksData?.length || 0);

    // Group tasks by day record
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
        category: task.category_name || undefined
      });
    });

    // Combine days with their tasks
    const result = daysData.map((day) => ({
      id: day.id,
      date: day.date,
      tasks: tasksByDay[day.id] || [],
      totalDuration: day.total_duration,
      startTime: new Date(day.start_time),
      endTime: new Date(day.end_time),
      notes: day.notes
    }));

    console.log('✅ Archived days loaded:', {
      daysCount: result.length,
      totalTasks: result.reduce((sum, day) => sum + day.tasks.length, 0)
    });

    return result;
  }

  async updateArchivedDay(
    dayId: string,
    updates: Partial<DayRecord>
  ): Promise<void> {
    const user = await getCachedUser();

    const updateData: Record<string, unknown> = {};

    if (updates.date) updateData.date = updates.date;
    if (updates.totalDuration !== undefined)
      updateData.total_duration = updates.totalDuration;
    if (updates.startTime)
      updateData.start_time = updates.startTime.toISOString();
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
        const tasksToInsert = updates.tasks.map((task) => ({
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
    const user = await getCachedUser();

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
    console.log('🗂️ SupabaseService: Saving projects...', projects.length);

    const user = await getCachedUser();

    // Delete existing projects
    await supabase.from('projects').delete().eq('user_id', user.id);

    if (projects.length === 0) {
      console.log('📭 No projects to save');
      // Clear cache since projects changed
      clearDataCaches();
      return;
    }

    // Insert new projects
    const projectsToInsert = projects.map((project) => ({
      id: project.id,
      user_id: user.id,
      name: project.name,
      client: project.client,
      hourly_rate: project.hourlyRate || null,
      color: project.color || null
    }));

    const { error } = await supabase.from('projects').insert(projectsToInsert);

    if (error) {
      console.error('❌ Error saving projects:', error);
      throw error;
    }

    // Update cache with new data
    setCachedProjects(projects);

    console.log('✅ Projects saved successfully');
  }

  async getProjects(): Promise<Project[]> {
    console.log('🗂️ SupabaseService: Loading projects...');

    // Check cache first
    const cachedResult = await getCachedProjects();
    if (cachedResult) {
      return cachedResult;
    }

    const user = await getCachedUser();

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error loading projects:', error);
      throw error;
    }

    const result = (data || []).map((project) => ({
      id: project.id,
      name: project.name,
      client: project.client,
      hourlyRate: project.hourly_rate || undefined,
      color: project.color || undefined
    }));

    // Cache the result
    setCachedProjects(result);

    console.log('✅ Projects loaded:', result.length);
    return result;
  }

  async saveCategories(categories: TaskCategory[]): Promise<void> {
    console.log('🏷️ SupabaseService: Saving categories...', categories.length);

    const user = await getCachedUser();

    // Delete existing categories
    await supabase.from('categories').delete().eq('user_id', user.id);

    if (categories.length === 0) {
      console.log('📭 No categories to save');
      // Clear cache since categories changed
      clearDataCaches();
      return;
    }

    // Insert new categories
    const categoriesToInsert = categories.map((category) => ({
      id: category.id,
      user_id: user.id,
      name: category.name,
      color: category.color || null,
      icon: null // Icon field exists in DB but not in interface yet
    }));

    const { error } = await supabase
      .from('categories')
      .insert(categoriesToInsert);

    if (error) {
      console.error('❌ Error saving categories:', error);
      throw error;
    }

    // Update cache with new data
    setCachedCategories(categories);

    console.log('✅ Categories saved successfully');
  }

  async getCategories(): Promise<TaskCategory[]> {
    console.log('🏷️ SupabaseService: Loading categories...');

    // Check cache first
    const cachedResult = await getCachedCategories();
    if (cachedResult) {
      return cachedResult;
    }

    const user = await getCachedUser();

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error loading categories:', error);
      throw error;
    }

    const result = (data || []).map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color || '#8B5CF6' // Default color if missing
    }));

    // Cache the result
    setCachedCategories(result);

    console.log('✅ Categories loaded:', result.length);
    return result;
  }

  async migrateFromLocalStorage(): Promise<void> {
    try {
      console.log('🔄 Checking for localStorage data to migrate...');
      const localService = new LocalStorageService();

      // Check if there's actually meaningful data in localStorage before migrating
      const projects = await localService.getProjects();
      const categories = await localService.getCategories();
      const currentDay = await localService.getCurrentDay();
      const archivedDays = await localService.getArchivedDays();

      const hasProjects = projects.length > 0;
      const hasCategories = categories.length > 0;
      const hasCurrentDay = currentDay && (currentDay.tasks.length > 0 || currentDay.isDayStarted);
      const hasArchivedDays = archivedDays.length > 0;

      console.log('📊 localStorage data check:', {
        hasProjects,
        hasCategories,
        hasCurrentDay,
        hasArchivedDays,
        projectsCount: projects.length,
        categoriesCount: categories.length,
        currentDayTasks: currentDay?.tasks.length || 0,
        archivedDaysCount: archivedDays.length
      });

      // Only migrate if there's substantial data in localStorage
      // This prevents overwriting Supabase data with empty localStorage after logout/login
      if (!hasProjects && !hasCategories && !hasCurrentDay && !hasArchivedDays) {
        console.log('✅ No meaningful localStorage data found - skipping migration');
        return;
      }

      // Check if Supabase already has data - if so, be more cautious
      const existingCurrentDay = await this.getCurrentDay();
      const existingArchivedDays = await this.getArchivedDays();
      const existingProjects = await this.getProjects();

      const hasExistingData = (
        (existingCurrentDay && (existingCurrentDay.tasks.length > 0 || existingCurrentDay.isDayStarted)) ||
        existingArchivedDays.length > 0 ||
        existingProjects.length > 0
      );

      if (hasExistingData) {
        console.log('⚠️ Supabase already contains data - being cautious with migration');

        // Only migrate if localStorage has MORE recent or substantial data
        const shouldMigrateCurrentDay = hasCurrentDay && (!existingCurrentDay ||
          (currentDay?.tasks.length ?? 0) > existingCurrentDay.tasks.length);

        const shouldMigrateArchived = hasArchivedDays &&
          archivedDays.length > existingArchivedDays.length;

        console.log('🔍 Migration decision:', {
          shouldMigrateCurrentDay,
          shouldMigrateArchived,
          localCurrentDayTasks: currentDay?.tasks.length || 0,
          existingCurrentDayTasks: existingCurrentDay?.tasks.length || 0,
          localArchivedDays: archivedDays.length,
          existingArchivedDays: existingArchivedDays.length
        });

        // Only migrate current day if localStorage has more data
        if (shouldMigrateCurrentDay) {
          console.log('📱 Migrating current day from localStorage (has more data)');
          await this.saveCurrentDay(currentDay!);
        }

        // Only migrate archived days if localStorage has more data
        if (shouldMigrateArchived) {
          console.log('📚 Migrating archived days from localStorage (has more data)');
          await this.saveArchivedDays(archivedDays);
        }

        // Always migrate projects and categories if they exist (they're less likely to conflict)
        if (hasProjects) {
          console.log('📋 Migrating projects from localStorage');
          await this.saveProjects(projects);
        }

        if (hasCategories) {
          console.log('🏷️ Migrating categories from localStorage');
          await this.saveCategories(categories);
        }
      } else {
        // No existing data in Supabase, safe to migrate everything
        console.log('✅ No existing Supabase data - safe to migrate all localStorage data');

        if (hasProjects) {
          await this.saveProjects(projects);
        }

        if (hasCategories) {
          await this.saveCategories(categories);
        }

        if (hasCurrentDay) {
          await this.saveCurrentDay(currentDay!);
        }

        if (hasArchivedDays) {
          await this.saveArchivedDays(archivedDays);
        }
      }

      console.log('✅ Data migration from localStorage completed safely');
    } catch (error) {
      console.error('❌ Error migrating data from localStorage:', error);
    }
  }

  async migrateToLocalStorage(): Promise<void> {
    try {
      console.log('🔄 Migrating current data TO localStorage for offline access...');
      const localService = new LocalStorageService();

      // Get current data from Supabase
      const currentDay = await this.getCurrentDay();
      const archivedDays = await this.getArchivedDays();
      const projects = await this.getProjects();
      const categories = await this.getCategories();

      // Save to localStorage
      if (currentDay) {
        await localService.saveCurrentDay(currentDay);
        console.log('📱 Current day synced to localStorage');
      }

      if (archivedDays.length > 0) {
        await localService.saveArchivedDays(archivedDays);
        console.log(`📚 ${archivedDays.length} archived days synced to localStorage`);
      }

      if (projects.length > 0) {
        await localService.saveProjects(projects);
        console.log(`📋 ${projects.length} projects synced to localStorage`);
      }

      if (categories.length > 0) {
        await localService.saveCategories(categories);
        console.log(`🏷️ ${categories.length} categories synced to localStorage`);
      }

      console.log('✅ Data successfully synced to localStorage for offline access');
    } catch (error) {
      console.error('❌ Error migrating data to localStorage:', error);
    }
  }
}

// Factory function to get the appropriate service
export const createDataService = (isAuthenticated: boolean): DataService => {
  console.log('🔧 Creating data service:', { isAuthenticated });
  return isAuthenticated ? new SupabaseService() : new LocalStorageService();
};
