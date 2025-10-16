import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react';
import { DEFAULT_CATEGORIES, TaskCategory } from '@/config/categories';
import { DEFAULT_PROJECTS, ProjectCategory } from '@/config/projects';
import { useAuth } from '@/hooks/useAuth';
import { createDataService, DataService } from '@/services/dataService';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

export interface Task {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  project?: string;
  client?: string;
  category?: string;
}

export interface DayRecord {
  id: string;
  date: string;
  tasks: Task[];
  totalDuration: number;
  startTime: Date;
  endTime: Date;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  hourlyRate?: number;
  color?: string;
  isBillable?: boolean;
}

export interface TimeEntry {
  id: string;
  date: string;
  project: string;
  client: string;
  description: string;
  duration: number;
  hourlyRate?: number;
}

export interface InvoiceData {
  client: string;
  period: { startDate: Date; endDate: Date };
  projects: { [key: string]: { hours: number; rate: number; amount: number } };
  summary: {
    totalHours: number;
    totalAmount: number;
  };
  tasks: Task[];
}

interface TimeTrackingContextType {
  // Current day state
  isDayStarted: boolean;
  dayStartTime: Date | null;
  currentTask: Task | null;
  tasks: Task[];

  // Timer state
  currentTime: Date;

  // Sync state - manual sync only
  isSyncing: boolean;
  lastSyncTime: Date | null;
  hasUnsavedChanges: boolean;
  refreshFromDatabase: () => void;
  forceSyncToDatabase: () => void; // Manual sync function

  // Archive state
  archivedDays: DayRecord[];

  // Projects and clients
  projects: Project[];

  // Categories
  categories: TaskCategory[];

  // Actions
  startDay: () => void;
  endDay: () => void;
  startNewTask: (
    title: string,
    description?: string,
    project?: string,
    client?: string,
    category?: string
  ) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  postDay: (notes?: string) => void;

  // Project management
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  resetProjectsToDefaults: () => void;

  // Category management
  addCategory: (category: Omit<TaskCategory, 'id'>) => void;
  updateCategory: (categoryId: string, updates: Partial<TaskCategory>) => void;
  deleteCategory: (categoryId: string) => void;

  generateInvoiceData: (
    clientName: string,
    startDate: Date,
    endDate: Date
  ) => InvoiceData;
  adjustTaskTime: (taskId: string, startTime: Date, endTime?: Date) => void;

  // Archive management
  updateArchivedDay: (dayId: string, updates: Partial<DayRecord>) => void;
  deleteArchivedDay: (dayId: string) => void;
  restoreArchivedDay: (dayId: string) => void;

  // Export functions
  exportToCSV: (startDate?: Date, endDate?: Date) => string;
  exportToJSON: (startDate?: Date, endDate?: Date) => string;
  importFromCSV: (csvContent: string) => Promise<{ success: boolean; message: string; importedCount: number }>;
  // generateInvoiceData: (clientName: string, startDate: Date, endDate: Date) => any;

  // Calculated values
  getTotalDayDuration: () => number;
  getCurrentTaskDuration: () => number;
  getTotalHoursForPeriod: (startDate: Date, endDate: Date) => number;
  getRevenueForPeriod: (startDate: Date, endDate: Date) => number;
  getHoursWorkedForDay: (day: DayRecord) => number;
  getRevenueForDay: (day: DayRecord) => number;
  getBillableHoursForDay: (day: DayRecord) => number;
  getNonBillableHoursForDay: (day: DayRecord) => number;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(
  undefined
);

export { TimeTrackingContext };

const STORAGE_KEYS = {
  CURRENT_DAY: 'timetracker_current_day',
  ARCHIVED_DAYS: 'timetracker_archived_days',
  PROJECTS: 'timetracker_projects',
  CATEGORIES: 'timetracker_categories'
};

// Convert ProjectCategory to Project by adding an id
const convertDefaultProjects = (
  defaultProjects: ProjectCategory[]
): Project[] => {
  return defaultProjects.map((project, index) => ({
    ...project,
    id: `default-${index}-${project.name.toLowerCase().replace(/\s+/g, '-')}`
  }));
};

export const TimeTrackingProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [dataService, setDataService] = useState<DataService | null>(null);
  const [previousAuthState, setPreviousAuthState] = useState<boolean | null>(null);
  const [isDayStarted, setIsDayStarted] = useState(false);
  const [dayStartTime, setDayStartTime] = useState<Date | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [archivedDays, setArchivedDays] = useState<DayRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>(
    convertDefaultProjects(DEFAULT_PROJECTS)
  );
  const [categories, setCategories] =
    useState<TaskCategory[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Debounce refs to manage timeouts
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTaskTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStateRef = useRef<string>(''); // Track last saved state to prevent duplicate saves
  const currentAuthStateRef = useRef<boolean>(false); // Track current auth state without triggering re-renders

  // Initialize data service when auth state changes
  useEffect(() => {
    if (!authLoading) {
      const service = createDataService(isAuthenticated);
      setDataService(service);
      currentAuthStateRef.current = isAuthenticated;
    }
  }, [isAuthenticated, authLoading]);

  // Handle logout data sync separately
  useEffect(() => {
    const handleLogout = async () => {
      // Detect logout: was authenticated, now not authenticated
      if (previousAuthState === true && !isAuthenticated && dataService) {
        console.log('🔄 User logged out - syncing data to localStorage for offline access');
        try {
          // Use the current (Supabase) service to sync data to localStorage before switching
          await dataService.migrateToLocalStorage();
        } catch (error) {
          console.error('❌ Error syncing data to localStorage on logout:', error);
        }
      }
      // Update previous auth state
      setPreviousAuthState(isAuthenticated);
    };

    if (!authLoading) {
      handleLogout();
    }
  }, [isAuthenticated, authLoading, previousAuthState, dataService]);

  // Load data when data service is available
  useEffect(() => {
    const loadData = async () => {
      if (!dataService) return;

      setLoading(true);
      try {
        // Load current day
        console.log('🔄 Loading current day from database...');
        const currentDay = await dataService.getCurrentDay();
        console.log('📱 Raw current day data from storage:', currentDay);
        if (currentDay) {
          console.log('📱 Current day loaded from database:', {
            tasksCount: currentDay.tasks.length,
            isDayStarted: currentDay.isDayStarted,
            hasCurrentTask: !!currentDay.currentTask,
            dayStartTime: currentDay.dayStartTime,
            fullData: currentDay
          });
          setIsDayStarted(currentDay.isDayStarted);
          setDayStartTime(currentDay.dayStartTime);
          setTasks(currentDay.tasks);
          setCurrentTask(currentDay.currentTask);
        } else {
          console.log('📱 No current day data found in database');
        }

        // Load archived days
        const archived = await dataService.getArchivedDays();
        setArchivedDays(archived);

        // Load projects
        const loadedProjects = await dataService.getProjects();
        if (loadedProjects.length > 0) {
          // Merge default projects with saved projects, avoiding duplicates
          const defaultProjects = convertDefaultProjects(DEFAULT_PROJECTS);
          const mergedProjects = [...defaultProjects];

          // Add saved projects that don't conflict with default ones
          loadedProjects.forEach((savedProject: Project) => {
            const existsInDefaults = defaultProjects.some(
              (defaultProject) =>
                defaultProject.name === savedProject.name &&
                defaultProject.client === savedProject.client
            );
            if (!existsInDefaults) {
              mergedProjects.push(savedProject);
            }
          });

          setProjects(mergedProjects);
        } else {
          setProjects(convertDefaultProjects(DEFAULT_PROJECTS));
        }

        // Load categories
        const loadedCategories = await dataService.getCategories();
        if (loadedCategories.length > 0) {
          setCategories(loadedCategories);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }

        // If switching from localStorage to Supabase, migrate data
        if (currentAuthStateRef.current && dataService) {
          await dataService.migrateFromLocalStorage();
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dataService]);

  // Stable reference to the actual save function
  const saveCurrentDayRef = useRef<() => Promise<void>>();

  // Refs to hold the latest state without causing effect reruns
  const latestStateRef = useRef({
    isDayStarted,
    dayStartTime,
    currentTask,
    tasks
  });

  // Update the ref whenever state changes
  useEffect(() => {
    latestStateRef.current = {
      isDayStarted,
      dayStartTime,
      currentTask,
      tasks
    };
  }, [isDayStarted, dayStartTime, currentTask, tasks]);

  // Save current day data when it changes (with stable reference)
  const saveCurrentDay = useCallback(async () => {
    if (!dataService) return;

    try {
      setIsSyncing(true);
      const state = latestStateRef.current;
      console.log('💾 Syncing current day to database...', {
        tasksCount: state.tasks.length,
        isDayStarted: state.isDayStarted,
        hasCurrentTask: !!state.currentTask,
        dayStartTime: state.dayStartTime,
        fullState: state
      });
      await dataService.saveCurrentDay(state);
      setLastSyncTime(new Date());
      console.log('✅ Current day synced successfully');
    } catch (error) {
      console.error('❌ Error saving current day:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [dataService]);

  // Create a stable save function that doesn't change reference frequently
  const stableSaveCurrentDay = useCallback(async () => {
    await saveCurrentDay();
  }, [saveCurrentDay]);

  // DISABLED: Automatic debounced saves for single-device usage
  // Data will only be saved on:
  // 1. Day end (postDay)
  // 2. Manual sync (forceSyncToDatabase)
  // 3. Window beforeunload (browser close)
  // 4. Component unmount

  // Manual save function for immediate saves (bypasses debouncing)
  const saveImmediately = useCallback(async () => {
    if (!dataService) return;
    await stableSaveCurrentDay();
  }, [dataService, stableSaveCurrentDay]);

  // Manual sync function - saves ALL data types
  const forceSyncToDatabase = useCallback(async () => {
    if (!dataService) {
      console.log('❌ No data service available for sync');
      return;
    }

    console.log('🔄 Manual sync: Saving all data to database...');
    setIsSyncing(true);

    try {
      // Save all data types in parallel
      const savePromises = [
        // Current day data
        stableSaveCurrentDay(),
        // Projects
        dataService.saveProjects(projects),
        // Categories
        dataService.saveCategories(categories),
        // Archived days
        dataService.saveArchivedDays(archivedDays)
      ];

      await Promise.all(savePromises);
      setLastSyncTime(new Date());
      setHasUnsavedChanges(false); // Clear unsaved changes flag
      console.log('✅ Manual sync completed successfully');
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [dataService, stableSaveCurrentDay, projects, categories, archivedDays]);

  // Load current day data (for periodic sync)
  const loadCurrentDay = useCallback(async () => {
    if (!dataService || loading) return;

    try {
      setIsSyncing(true);
      console.log('🔄 Checking for updates from other devices...');
      const currentDay = await dataService.getCurrentDay();
      if (currentDay) {
        console.log('📱 Updated data found from other device:', {
          tasksCount: currentDay.tasks.length,
          isDayStarted: currentDay.isDayStarted,
          hasCurrentTask: !!currentDay.currentTask
        });
        setIsDayStarted(currentDay.isDayStarted);
        setDayStartTime(currentDay.dayStartTime);
        setTasks(currentDay.tasks);
        setCurrentTask(currentDay.currentTask);
        setLastSyncTime(new Date());
      }
    } catch (error) {
      console.error('❌ Error loading current day updates:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [dataService, loading]);

  // Setup periodic sync - DISABLED for single device usage
  // useRealtimeSync({
  //   onCurrentDayUpdate: loadCurrentDay,
  //   isAuthenticated,
  //   enabled: !loading
  // });

  // DISABLED: Automatic saves - only save on critical events for single-device usage
  // Critical events that trigger saves:
  // 1. Day end (postDay)
  // 2. Window close (beforeunload)
  // 3. Manual sync button

  // Track changes to mark as unsaved
  useEffect(() => {
    // Mark as having unsaved changes whenever state changes
    // (but not during initial loading)
    if (!loading && dataService) {
      setHasUnsavedChanges(true);
    }
  }, [isDayStarted, dayStartTime, tasks, currentTask, archivedDays, projects, categories, loading, dataService]);

  // Save on window close to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only save if we have unsaved changes
      if (dataService && (isDayStarted || tasks.length > 0)) {
        console.log('💾 Saving before window close...');
        stableSaveCurrentDay();
        // Don't prevent closing, just save
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dataService, isDayStarted, tasks, stableSaveCurrentDay]);

  // Update current time every 30 seconds (instead of every second for better performance)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // 30 seconds instead of 1 second
    return () => clearInterval(timer);
  }, []);

  const startDay = () => {
    const now = new Date();
    setIsDayStarted(true);
    setDayStartTime(now);
    console.log('Day started at:', now);
  };

  const endDay = () => {
    console.log('🔚 Ending day - current state before:', {
      isDayStarted,
      dayStartTime,
      tasksLength: tasks.length,
      currentTask: !!currentTask
    });

    if (currentTask) {
      // End the current task
      const updatedTask = {
        ...currentTask,
        endTime: new Date(),
        duration: new Date().getTime() - currentTask.startTime.getTime()
      };
      setTasks((prev) =>
        prev.map((t) => (t.id === currentTask.id ? updatedTask : t))
      );
      setCurrentTask(null);
    }
    setIsDayStarted(false);
    console.log('🔚 Day ended - saving state...');
    // Save immediately since this is a critical action
    saveImmediately().then(() => {
      console.log('✅ State saved after ending day');
    }).catch((error) => {
      console.error('❌ Error saving state after ending day:', error);
    });
  };

  const startNewTask = (
    title: string,
    description?: string,
    project?: string,
    client?: string,
    category?: string
  ) => {
    const now = new Date();

    // End current task if exists
    if (currentTask) {
      const updatedTask = {
        ...currentTask,
        endTime: now,
        duration: now.getTime() - currentTask.startTime.getTime()
      };
      setTasks((prev) =>
        prev.map((t) => (t.id === currentTask.id ? updatedTask : t))
      );
    }

    // Create new task
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      description,
      startTime: now,
      project,
      client,
      category
    };

    setTasks((prev) => [...prev, newTask]);
    setCurrentTask(newTask);
    console.log('New task started:', title);
    // Save immediately since this is a critical action
    saveImmediately();
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
    );
    if (currentTask?.id === taskId) {
      setCurrentTask((prev) => (prev ? { ...prev, ...updates } : null));
    }
    console.log('Task updated:', taskId, updates);
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    if (currentTask?.id === taskId) {
      setCurrentTask(null);
    }
    console.log('Task deleted:', taskId);
  };

  const postDay = async (notes?: string) => {
    if (!dayStartTime) return;

    const dayRecord: DayRecord = {
      id: Date.now().toString(),
      date: dayStartTime.toDateString(),
      tasks: tasks,
      totalDuration: getTotalDayDuration(),
      startTime: dayStartTime,
      endTime: new Date(),
      notes
    };

    setArchivedDays((prev) => [...prev, dayRecord]);

    // Clear current day data
    setDayStartTime(null);
    setCurrentTask(null);
    setTasks([]);
    setIsDayStarted(false);
    console.log('Day posted to archive');

    // Save immediately since this is a critical action
    if (dataService) {
      try {
        // Save the archived days
        await dataService.saveArchivedDays([...archivedDays, dayRecord]);
        console.log('✅ Archive saved immediately');

        // Save the cleared current day state so refresh shows "Start Day" screen
        await dataService.saveCurrentDay({
          isDayStarted: false,
          dayStartTime: null,
          currentTask: null,
          tasks: []
        });
        console.log('✅ Cleared current day state saved');
      } catch (error) {
        console.error('❌ Error saving after posting day:', error);
      }
    }
  };

  // Project management functions - NO AUTOMATIC SAVING
  const addProject = (project: Omit<Project, 'id'>) => {
    const newProject: Project = {
      ...project,
      id: Date.now().toString()
    };
    setProjects((prev) => [...prev, newProject]);
    console.log('📋 Project added (not saved automatically)');
  };

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, ...updates } : project
      )
    );
    console.log('📋 Project updated (not saved automatically)');
  };

  const deleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    console.log('📋 Project deleted (not saved automatically)');
  };

  const resetProjectsToDefaults = () => {
    const defaultProjects = convertDefaultProjects(DEFAULT_PROJECTS);
    setProjects(defaultProjects);
  };

  // Archive management functions
  const updateArchivedDay = async (
    dayId: string,
    updates: Partial<DayRecord>
  ) => {
    if (!dataService) return;

    try {
      await dataService.updateArchivedDay(dayId, updates);
      setArchivedDays((prev) =>
        prev.map((day) => (day.id === dayId ? { ...day, ...updates } : day))
      );
    } catch (error) {
      console.error('Error updating archived day:', error);
    }
  };

  const deleteArchivedDay = async (dayId: string) => {
    if (!dataService) return;

    try {
      await dataService.deleteArchivedDay(dayId);
      setArchivedDays((prev) => prev.filter((day) => day.id !== dayId));
    } catch (error) {
      console.error('Error deleting archived day:', error);
    }
  };
  const restoreArchivedDay = (dayId: string) => {
    const dayToRestore = archivedDays.find((day) => day.id === dayId);
    if (!dayToRestore) return;

    // Clear current day if any
    setDayStartTime(null);
    setCurrentTask(null);
    setTasks([]);

    // Restore the archived day as current day
    setIsDayStarted(true);
    setDayStartTime(dayToRestore.startTime);
    setTasks(dayToRestore.tasks);

    // Find the last task that doesn't have an end time (if any) and make it current
    const activeTask = dayToRestore.tasks.find((task) => !task.endTime);
    if (activeTask) {
      setCurrentTask(activeTask);
    }

    // Remove from archive
    setArchivedDays((prev) => prev.filter((day) => day.id !== dayId));

    console.log('Day restored from archive');
  };

  // Category management functions - NO AUTOMATIC SAVING
  const addCategory = (category: Omit<TaskCategory, 'id'>) => {
    const newCategory: TaskCategory = {
      ...category,
      id: Date.now().toString()
    };
    setCategories((prev) => [...prev, newCategory]);
    console.log('🏷️ Category added (not saved automatically)');
  };

  const updateCategory = (
    categoryId: string,
    updates: Partial<TaskCategory>
  ) => {
    setCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId ? { ...category, ...updates } : category
      )
    );
    console.log('🏷️ Category updated (not saved automatically)');
  };

  const deleteCategory = (categoryId: string) => {
    setCategories((prev) =>
      prev.filter((category) => category.id !== categoryId)
    );
    console.log('🏷️ Category deleted (not saved automatically)');
  };

  // Time adjustment function (rounds to nearest 15 minutes)
  const adjustTaskTime = (taskId: string, startTime: Date, endTime?: Date) => {
    const roundToNearestQuarter = (date: Date): Date => {
      const minutes = date.getMinutes();
      const roundedMinutes = Math.round(minutes / 15) * 15;
      const newDate = new Date(date);
      newDate.setMinutes(roundedMinutes, 0, 0);
      return newDate;
    };

    const roundedStartTime = roundToNearestQuarter(startTime);
    const roundedEndTime = endTime ? roundToNearestQuarter(endTime) : undefined;

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          const updatedTask = {
            ...task,
            startTime: roundedStartTime,
            endTime: roundedEndTime,
            duration: roundedEndTime
              ? roundedEndTime.getTime() - roundedStartTime.getTime()
              : task.duration
          };
          return updatedTask;
        }
        return task;
      })
    );

    // Update current task if it's the one being adjusted
    if (currentTask?.id === taskId) {
      setCurrentTask((prev) =>
        prev
          ? {
              ...prev,
              startTime: roundedStartTime,
              endTime: roundedEndTime
            }
          : null
      );
    }
  };

  const getTotalDayDuration = () => {
    const completedTasksDuration = tasks
      .filter((task) => task.duration)
      .reduce((total, task) => total + (task.duration || 0), 0);

    const currentTaskDuration = getCurrentTaskDuration();

    return completedTasksDuration + currentTaskDuration;
  };

  const getCurrentTaskDuration = () => {
    if (!currentTask) return 0;
    return currentTime.getTime() - currentTask.startTime.getTime();
  };

  const getTotalHoursForPeriod = (startDate: Date, endDate: Date): number => {
    const filteredDays = archivedDays.filter((day) => {
      const dayDate = new Date(day.startTime);
      return dayDate >= startDate && dayDate <= endDate;
    });

    const totalMs = filteredDays.reduce(
      (total, day) => total + day.totalDuration,
      0
    );
    return Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
  };

  const getRevenueForPeriod = (startDate: Date, endDate: Date): number => {
    const filteredDays = archivedDays.filter((day) => {
      const dayDate = new Date(day.startTime);
      return dayDate >= startDate && dayDate <= endDate;
    });

    let totalRevenue = 0;
    filteredDays.forEach((day) => {
      day.tasks.forEach((task) => {
        if (task.project && task.duration && task.category) {
          // Check if the category is billable
          const category = categories.find((c) => c.name === task.category);
          const isBillable = category?.isBillable !== false; // Default to billable if not specified

          if (isBillable) {
            const project = projects.find((p) => p.name === task.project);
            if (project?.hourlyRate) {
              const hours = task.duration / (1000 * 60 * 60);
              totalRevenue += hours * project.hourlyRate;
            }
          }
        }
      });
    });

    return Math.round(totalRevenue * 100) / 100;
  };

  const getHoursWorkedForDay = (day: DayRecord): number => {
    // Calculate total time worked (sum of all task durations, excluding breaks)
    let totalTaskDuration = 0;
    day.tasks.forEach((task) => {
      if (task.duration) {
        totalTaskDuration += task.duration;
      }
    });

    // Convert milliseconds to hours
    const hours = totalTaskDuration / (1000 * 60 * 60);
    return Math.round(hours * 100) / 100;
  };

  const getRevenueForDay = (day: DayRecord): number => {
    let totalRevenue = 0;
    day.tasks.forEach((task) => {
      if (task.project && task.duration && task.category) {
        // Check if both the project and category are billable
        const project = projects.find((p) => p.name === task.project);
        const category = categories.find((c) => c.name === task.category);

        const projectIsBillable = project?.isBillable !== false; // Default to billable if not specified
        const categoryIsBillable = category?.isBillable !== false; // Default to billable if not specified

        // Task is billable only if BOTH project AND category are billable
        const isBillable = projectIsBillable && categoryIsBillable;

        if (isBillable && project?.hourlyRate) {
          const hours = task.duration / (1000 * 60 * 60);
          totalRevenue += hours * project.hourlyRate;
        }
      }
    });

    return Math.round(totalRevenue * 100) / 100;
  };

  const getBillableHoursForDay = (day: DayRecord): number => {
    let billableTime = 0;
    day.tasks.forEach((task) => {
      if (task.duration && task.category && task.project) {
        // Check if both the project and category are billable
        const project = projects.find((p) => p.name === task.project);
        const category = categories.find((c) => c.name === task.category);

        const projectIsBillable = project?.isBillable !== false; // Default to billable if not specified
        const categoryIsBillable = category?.isBillable !== false; // Default to billable if not specified

        // Task is billable only if BOTH project AND category are billable
        const isBillable = projectIsBillable && categoryIsBillable;

        if (isBillable) {
          billableTime += task.duration;
        }
      }
    });    // Convert milliseconds to hours
    const hours = billableTime / (1000 * 60 * 60);
    return Math.round(hours * 100) / 100;
  };

  const getNonBillableHoursForDay = (day: DayRecord): number => {
    let nonBillableTime = 0;
    day.tasks.forEach((task) => {
      if (task.duration && task.category && task.project) {
        // Check if both the project and category are billable
        const project = projects.find((p) => p.name === task.project);
        const category = categories.find((c) => c.name === task.category);

        const projectIsBillable = project?.isBillable !== false; // Default to billable if not specified
        const categoryIsBillable = category?.isBillable !== false; // Default to billable if not specified

        // Task is billable only if BOTH project AND category are billable
        const isBillable = projectIsBillable && categoryIsBillable;

        if (!isBillable) {
          nonBillableTime += task.duration;
        }
      }
    });

    // Convert milliseconds to hours
    const hours = nonBillableTime / (1000 * 60 * 60);
    return Math.round(hours * 100) / 100;
  };

  const exportToCSV = (startDate?: Date, endDate?: Date): string => {
    let filteredDays = archivedDays;

    if (startDate && endDate) {
      filteredDays = archivedDays.filter((day) => {
        const dayDate = new Date(day.startTime);
        return dayDate >= startDate && dayDate <= endDate;
      });
    }

    // CSV headers matching database schema exactly
    const headers = [
      'id',
      'user_id',
      'title',
      'description',
      'start_time',
      'end_time',
      'duration',
      'project_id',
      'project_name',
      'client',
      'category_id',
      'category_name',
      'day_record_id',
      'is_current',
      'inserted_at',
      'updated_at'
    ];
    const rows = [headers.join(',')];

    filteredDays.forEach((day) => {
      day.tasks.forEach((task) => {
        if (task.duration) {
          const project = projects.find((p) => p.name === task.project);
          const category = categories.find((c) => c.name === task.category);

          // Format timestamps as ISO strings for database compatibility
          const startTimeISO = task.startTime.toISOString();
          const endTimeISO = task.endTime?.toISOString() || '';
          const currentTimeISO = new Date().toISOString();

          const row = [
            `"${task.id}"`,
            `"${user?.id || ''}"`, // user_id from auth context
            `"${task.title}"`,
            `"${task.description || ''}"`,
            `"${startTimeISO}"`,
            `"${endTimeISO}"`,
            task.duration || '', // duration in milliseconds
            `"${project?.id || ''}"`, // project_id
            `"${task.project || ''}"`, // project_name (denormalized)
            `"${task.client || ''}"`,
            `"${category?.id || ''}"`, // category_id
            `"${task.category || ''}"`, // category_name (denormalized)
            `"${day.id}"`, // day_record_id
            'false', // is_current - archived tasks are not current
            `"${currentTimeISO}"`, // inserted_at
            `"${currentTimeISO}"` // updated_at
          ];
          rows.push(row.join(','));
        }
      });
    });

    return rows.join('\n');
  };

  const exportToJSON = (startDate?: Date, endDate?: Date): string => {
    let filteredDays = archivedDays;

    if (startDate && endDate) {
      filteredDays = archivedDays.filter((day) => {
        const dayDate = new Date(day.startTime);
        return dayDate >= startDate && dayDate <= endDate;
      });
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      },
      summary: {
        totalDays: filteredDays.length,
        totalHours: getTotalHoursForPeriod(
          startDate || new Date(0),
          endDate || new Date()
        ),
        totalRevenue: getRevenueForPeriod(
          startDate || new Date(0),
          endDate || new Date()
        )
      },
      days: filteredDays,
      projects: projects
    };

    return JSON.stringify(exportData, null, 2);
  };

  const generateInvoiceData = (
    clientName: string,
    startDate: Date,
    endDate: Date
  ) => {
    const filteredDays = archivedDays.filter((day) => {
      const dayDate = new Date(day.startTime);
      return dayDate >= startDate && dayDate <= endDate;
    });

    const clientTasks = filteredDays.flatMap((day) =>
      day.tasks.filter((task) => task.client === clientName && task.duration)
    );

    const projectSummary: {
      [key: string]: { hours: number; rate: number; amount: number };
    } = {};

    clientTasks.forEach((task) => {
      const projectName = task.project || 'General';
      const project = projects.find((p) => p.name === task.project);
      const hours = (task.duration || 0) / (1000 * 60 * 60);
      const rate = project?.hourlyRate || 0;

      if (!projectSummary[projectName]) {
        projectSummary[projectName] = { hours: 0, rate, amount: 0 };
      }

      projectSummary[projectName].hours += hours;
      projectSummary[projectName].amount += hours * rate;
    });

    const totalHours = Object.values(projectSummary).reduce(
      (sum, proj) => sum + proj.hours,
      0
    );
    const totalAmount = Object.values(projectSummary).reduce(
      (sum, proj) => sum + proj.amount,
      0
    );

    return {
      client: clientName,
      period: { startDate, endDate },
      projects: projectSummary,
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100
      },
      tasks: clientTasks
    };
  };

  const importFromCSV = async (csvContent: string): Promise<{ success: boolean; message: string; importedCount: number }> => {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        return { success: false, message: 'CSV file is empty', importedCount: 0 };
      }

      const headerLine = lines[0];
      const expectedHeaders = [
        'id', 'user_id', 'title', 'description', 'start_time', 'end_time',
        'duration', 'project_id', 'project_name', 'client', 'category_id',
        'category_name', 'day_record_id', 'is_current', 'inserted_at', 'updated_at'
      ];

      // Validate headers
      const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        return {
          success: false,
          message: `CSV missing required headers: ${missingHeaders.join(', ')}`,
          importedCount: 0
        };
      }

      const tasksByDay: { [dayId: string]: { tasks: Task[], dayRecord: Partial<DayRecord> } } = {};
      let importedCount = 0;

      // Process each data line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          // Parse CSV line (handle quoted values)
          const values: string[] = [];
          let current = '';
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim()); // Add last value

          if (values.length !== headers.length) {
            console.warn(`Skipping malformed CSV line ${i + 1}: expected ${headers.length} columns, got ${values.length}`);
            continue;
          }

          // Create task object from CSV data
          const taskData: { [key: string]: string } = {};
          headers.forEach((header, index) => {
            taskData[header] = values[index].replace(/^"|"$/g, ''); // Remove quotes
          });

          // Validate required fields
          if (!taskData.id || !taskData.title || !taskData.start_time) {
            console.warn(`Skipping incomplete task on line ${i + 1}: missing required fields`);
            continue;
          }

          const task: Task = {
            id: taskData.id,
            title: taskData.title,
            description: taskData.description || undefined,
            startTime: new Date(taskData.start_time),
            endTime: taskData.end_time ? new Date(taskData.end_time) : undefined,
            duration: taskData.duration ? parseInt(taskData.duration) : undefined,
            project: taskData.project_name || undefined,
            client: taskData.client || undefined,
            category: taskData.category_name || undefined,
          };

          // Validate dates
          if (isNaN(task.startTime.getTime())) {
            console.warn(`Skipping task with invalid start_time on line ${i + 1}`);
            continue;
          }

          if (task.endTime && isNaN(task.endTime.getTime())) {
            task.endTime = undefined;
          }

          const dayRecordId = taskData.day_record_id;
          if (!dayRecordId) {
            console.warn(`Skipping task without day_record_id on line ${i + 1}`);
            continue;
          }

          // Group tasks by day
          if (!tasksByDay[dayRecordId]) {
            tasksByDay[dayRecordId] = {
              tasks: [],
              dayRecord: {
                id: dayRecordId,
                date: task.startTime.toISOString().split('T')[0],
                startTime: task.startTime,
                endTime: task.endTime || task.startTime,
                totalDuration: 0,
                tasks: []
              }
            };
          }

          tasksByDay[dayRecordId].tasks.push(task);

          // Update day record bounds
          if (task.startTime < (tasksByDay[dayRecordId].dayRecord.startTime || new Date())) {
            tasksByDay[dayRecordId].dayRecord.startTime = task.startTime;
          }
          if (task.endTime && task.endTime > (tasksByDay[dayRecordId].dayRecord.endTime || new Date(0))) {
            tasksByDay[dayRecordId].dayRecord.endTime = task.endTime;
          }

          importedCount++;
        } catch (error) {
          console.warn(`Error parsing line ${i + 1}:`, error);
          continue;
        }
      }

      // Create day records and add to archived days
      const newArchivedDays: DayRecord[] = [];

      for (const [dayId, { tasks, dayRecord }] of Object.entries(tasksByDay)) {
        const totalDuration = tasks.reduce((sum, task) => sum + (task.duration || 0), 0);

        const completeDay: DayRecord = {
          id: dayRecord.id!,
          date: dayRecord.date!,
          tasks: tasks,
          totalDuration: totalDuration,
          startTime: dayRecord.startTime!,
          endTime: dayRecord.endTime!,
          notes: dayRecord.notes
        };

        newArchivedDays.push(completeDay);
      }

      // Merge with existing archived days (avoid duplicates)
      const existingIds = new Set(archivedDays.map(day => day.id));
      const uniqueNewDays = newArchivedDays.filter(day => !existingIds.has(day.id));

      const updatedArchivedDays = [...archivedDays, ...uniqueNewDays];
      setArchivedDays(updatedArchivedDays);

      // Save to storage
      if (dataService) {
        await dataService.saveArchivedDays(updatedArchivedDays);
      }

      return {
        success: true,
        message: `Successfully imported ${importedCount} tasks in ${uniqueNewDays.length} days`,
        importedCount
      };

    } catch (error) {
      console.error('CSV import error:', error);
      return {
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        importedCount: 0
      };
    }
  };

  return (
    <TimeTrackingContext.Provider
      value={{
        isDayStarted,
        dayStartTime,
        currentTask,
        tasks,
        currentTime,
        isSyncing,
        lastSyncTime,
        hasUnsavedChanges,
        refreshFromDatabase: loadCurrentDay,
        forceSyncToDatabase,
        archivedDays,
        projects,
        categories,
        startDay,
        endDay,
        startNewTask,
        updateTask,
        deleteTask,
        postDay,
        addProject,
        updateProject,
        deleteProject,
        resetProjectsToDefaults,
        addCategory,
        updateCategory,
        deleteCategory,
        updateArchivedDay,
        deleteArchivedDay,
        restoreArchivedDay,
        adjustTaskTime,
        exportToCSV,
        exportToJSON,
        importFromCSV,
        generateInvoiceData,
        getTotalDayDuration,
        getCurrentTaskDuration,
        getTotalHoursForPeriod,
        getRevenueForPeriod,
        getHoursWorkedForDay,
        getRevenueForDay,
        getBillableHoursForDay,
        getNonBillableHoursForDay
      }}
    >
      {children}
    </TimeTrackingContext.Provider>
  );
};
