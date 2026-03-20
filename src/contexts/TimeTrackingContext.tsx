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
import { toast } from '@/hooks/use-toast';
import { SYNC_REQUIRED_EVENT } from '@/contexts/OfflineContext';
import {
  getHoursWorkedForDay as calcHoursWorkedForDay,
  getRevenueForDay as calcRevenueForDay,
  getBillableHoursForDay as calcBillableHoursForDay,
  getNonBillableHoursForDay as calcNonBillableHoursForDay,
  getTotalHoursForPeriod as calcTotalHoursForPeriod,
  getRevenueForPeriod as calcRevenueForPeriod
} from '@/utils/calculationUtils';
import {
  exportToCSV as utilExportToCSV,
  exportToJSON as utilExportToJSON,
  generateInvoiceData as utilGenerateInvoiceData,
  parseCSVImport
} from '@/utils/exportUtils';

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
  insertedAt?: Date; // When task was first created in database
  updatedAt?: Date; // When task was last modified in database
}

export interface DayRecord {
  id: string;
  date: string;
  tasks: Task[];
  totalDuration: number;
  startTime: Date;
  endTime: Date;
  notes?: string;
  insertedAt?: Date; // When day was first archived in database
  updatedAt?: Date; // When day was last modified in database
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
  tasks: (Task & { dayId: string; dayDate: string; dailySummary: string })[];
  dailySummaries: { [dayId: string]: { date: string; summary: string } };
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
  startDay: (startDateTime?: Date) => void;
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
  importFromCSV: (
    csvContent: string
  ) => Promise<{ success: boolean; message: string; importedCount: number }>;
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
  const [previousAuthState, setPreviousAuthState] = useState<boolean | null>(
    null
  );
  const [isDayStarted, setIsDayStarted] = useState(false);
  const [dayStartTime, setDayStartTime] = useState<Date | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [archivedDays, setArchivedDays] = useState<DayRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>(
    convertDefaultProjects(DEFAULT_PROJECTS)
  );
  const [categories, setCategories] = useState<TaskCategory[]>([]);
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
        try {
          // Use the current (Supabase) service to sync data to localStorage before switching
          await dataService.migrateToLocalStorage();
        } catch (error) {
          console.error(
            '❌ Error syncing data to localStorage on logout:',
            error
          );
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
        const currentDay = await dataService.getCurrentDay();
        if (currentDay) {
          setIsDayStarted(currentDay.isDayStarted);
          setDayStartTime(currentDay.dayStartTime);
          setTasks(currentDay.tasks);
          setCurrentTask(currentDay.currentTask);
        } else {
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
              defaultProject =>
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
      await dataService.saveCurrentDay(state);
      setLastSyncTime(new Date());
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
      return;
    }

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
      const currentDay = await dataService.getCurrentDay();
      if (currentDay) {
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

  // Save on window close to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only save if we have unsaved changes
      if (dataService && (isDayStarted || tasks.length > 0)) {
        stableSaveCurrentDay();
        // Don't prevent closing, just save
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dataService, isDayStarted, tasks, stableSaveCurrentDay]);

  // Sync all data to the backend when the app comes back online
  useEffect(() => {
    const handleSyncRequired = () => {
      if (!isAuthenticated) return;
      forceSyncToDatabase();
    };

    window.addEventListener(SYNC_REQUIRED_EVENT, handleSyncRequired);
    return () => window.removeEventListener(SYNC_REQUIRED_EVENT, handleSyncRequired);
  }, [isAuthenticated, forceSyncToDatabase]);

  // Update current time every 30 seconds (instead of every second for better performance)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // 30 seconds instead of 1 second
    return () => clearInterval(timer);
  }, []);

  const startDay = (startDateTime?: Date) => {
    const now = startDateTime || new Date();

    // Round to nearest 15 minutes
    const minutes = now.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const roundedTime = new Date(now);
    roundedTime.setMinutes(roundedMinutes, 0, 0);

    setIsDayStarted(true);
    setDayStartTime(roundedTime);
    setHasUnsavedChanges(true);
  };

  const endDay = () => {

    if (currentTask) {
      // End the current task
      const updatedTask = {
        ...currentTask,
        endTime: new Date(),
        duration: new Date().getTime() - currentTask.startTime.getTime()
      };
      setTasks(prev =>
        prev.map(t => (t.id === currentTask.id ? updatedTask : t))
      );
      setCurrentTask(null);
    }
    setIsDayStarted(false);
    setHasUnsavedChanges(true);
    // Save immediately since this is a critical action
    saveImmediately()
      .then(() => {
      })
      .catch(error => {
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
      setTasks(prev =>
        prev.map(t => (t.id === currentTask.id ? updatedTask : t))
      );
    }

    // Determine start time: use dayStartTime for first task, otherwise use current time
    const taskStartTime =
      tasks.length === 0 && dayStartTime ? dayStartTime : now;

    // Create new task
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      description,
      startTime: taskStartTime,
      project,
      client,
      category
    };

    setTasks(prev => [...prev, newTask]);
    setCurrentTask(newTask);
    setHasUnsavedChanges(true);
    // Save immediately since this is a critical action
    saveImmediately();
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev =>
      prev.map(task => (task.id === taskId ? { ...task, ...updates } : task))
    );
    if (currentTask?.id === taskId) {
      setCurrentTask(prev => (prev ? { ...prev, ...updates } : null));
    }
    setHasUnsavedChanges(true);
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    if (currentTask?.id === taskId) {
      setCurrentTask(null);
    }
    setHasUnsavedChanges(true);
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

    // Validate we have tasks to archive
    if (tasks.length === 0) {
      console.warn('⚠️ Archiving day with no tasks');
    }

    // Update state optimistically
    setArchivedDays(prev => [...prev, dayRecord]);

    // Clear current day data
    setDayStartTime(null);
    setCurrentTask(null);
    setTasks([]);
    setIsDayStarted(false);

    // Save immediately since this is a critical action
    if (dataService) {
      try {
        // Save the archived days with enhanced error handling
        await dataService.saveArchivedDays([...archivedDays, dayRecord]);

        // Save the cleared current day state so refresh shows "Start Day" screen
        await dataService.saveCurrentDay({
          isDayStarted: false,
          dayStartTime: null,
          currentTask: null,
          tasks: []
        });

        setHasUnsavedChanges(false);

        // Show success notification to user
        toast({
          title: 'Day Archived Successfully',
          description: `${dayRecord.tasks.length} task(s) archived for ${dayRecord.date}`,
          duration: 5000
        });
      } catch (error) {
        console.error('❌ CRITICAL ERROR saving archived day:', error);
        console.error('📋 Failed to archive day data:', {
          dayId: dayRecord.id,
          date: dayRecord.date,
          tasksCount: dayRecord.tasks.length,
          taskTitles: dayRecord.tasks.map(t => t.title)
        });

        // Rollback optimistic update since save failed
        setArchivedDays(prev => prev.filter(day => day.id !== dayRecord.id));

        // Restore the current day state since archiving failed
        setDayStartTime(dayRecord.startTime);
        setTasks(dayRecord.tasks);
        setIsDayStarted(true);

        // Restore current task if there was one
        const lastTask = dayRecord.tasks[dayRecord.tasks.length - 1];
        if (lastTask && !lastTask.endTime) {
          setCurrentTask(lastTask);
        }

        // Show error notification to user
        toast({
          title: 'Archive Failed',
          description: `Failed to archive day data: ${error instanceof Error ? error.message : 'Unknown error'}. Your current day has been restored. Please try archiving again.`,
          variant: 'destructive',
          duration: 7000
        });
      }
    }
  };

  // Project management functions - NO AUTOMATIC SAVING
  const addProject = (project: Omit<Project, 'id'>) => {
    const newProject: Project = {
      ...project,
      id: Date.now().toString()
    };
    setProjects(prev => [...prev, newProject]);
    setHasUnsavedChanges(true);
  };

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    setProjects(prev =>
      prev.map(project =>
        project.id === projectId ? { ...project, ...updates } : project
      )
    );
    setHasUnsavedChanges(true);
  };

  const deleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(project => project.id !== projectId));
    setHasUnsavedChanges(true);
  };

  const resetProjectsToDefaults = () => {
    const defaultProjects = convertDefaultProjects(DEFAULT_PROJECTS);
    setProjects(defaultProjects);
    setHasUnsavedChanges(true);
  };

  // Archive management functions
  const updateArchivedDay = async (
    dayId: string,
    updates: Partial<DayRecord>
  ) => {
    if (!dataService) return;

    try {

      // Optimistic update - update local state immediately for responsive UI
      setArchivedDays(prev =>
        prev.map(day => (day.id === dayId ? { ...day, ...updates } : day))
      );

      // Then persist to database
      await dataService.updateArchivedDay(dayId, updates);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('❌ Error updating archived day:', error);

      // On error, refresh from database to restore consistent state
      const refreshedDays = await dataService.getArchivedDays();
      setArchivedDays(refreshedDays);

      throw error; // Re-throw so the UI can handle it
    }
  };

  const deleteArchivedDay = async (dayId: string) => {
    if (!dataService) return;

    try {
      await dataService.deleteArchivedDay(dayId);
      setArchivedDays(prev => prev.filter(day => day.id !== dayId));
    } catch (error) {
      console.error('Error deleting archived day:', error);
    }
  };
  const restoreArchivedDay = (dayId: string) => {
    const dayToRestore = archivedDays.find(day => day.id === dayId);
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
    const activeTask = dayToRestore.tasks.find(task => !task.endTime);
    if (activeTask) {
      setCurrentTask(activeTask);
    }

    // Remove from archive
    setArchivedDays(prev => prev.filter(day => day.id !== dayId));

    setHasUnsavedChanges(true);
  };

  // Category management functions - NO AUTOMATIC SAVING
  const addCategory = (category: Omit<TaskCategory, 'id'>) => {
    const newCategory: TaskCategory = {
      ...category,
      id: Date.now().toString()
    };
    setCategories(prev => [...prev, newCategory]);
    setHasUnsavedChanges(true);
  };

  const updateCategory = (
    categoryId: string,
    updates: Partial<TaskCategory>
  ) => {
    setCategories(prev =>
      prev.map(category =>
        category.id === categoryId ? { ...category, ...updates } : category
      )
    );
    setHasUnsavedChanges(true);
  };

  const deleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(category => category.id !== categoryId));
    setHasUnsavedChanges(true);
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

    setTasks(prev =>
      prev.map(task => {
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
      setCurrentTask(prev =>
        prev
          ? {
              ...prev,
              startTime: roundedStartTime,
              endTime: roundedEndTime
            }
          : null
      );
    }
    setHasUnsavedChanges(true);
  };

  const getTotalDayDuration = () => {
    const completedTasksDuration = tasks
      .filter(task => task.duration)
      .reduce((total, task) => total + (task.duration || 0), 0);

    const currentTaskDuration = getCurrentTaskDuration();

    return completedTasksDuration + currentTaskDuration;
  };

  const getCurrentTaskDuration = () => {
    if (!currentTask) return 0;
    return currentTime.getTime() - currentTask.startTime.getTime();
  };

  const getTotalHoursForPeriod = (startDate: Date, endDate: Date): number =>
    calcTotalHoursForPeriod(archivedDays, startDate, endDate);

  const getRevenueForPeriod = (startDate: Date, endDate: Date): number =>
    calcRevenueForPeriod(archivedDays, projects, categories, startDate, endDate);

  const getHoursWorkedForDay = (day: DayRecord): number =>
    calcHoursWorkedForDay(day);

  const getRevenueForDay = (day: DayRecord): number =>
    calcRevenueForDay(day, projects, categories);

  const getBillableHoursForDay = (day: DayRecord): number =>
    calcBillableHoursForDay(day, projects, categories);

  const getNonBillableHoursForDay = (day: DayRecord): number =>
    calcNonBillableHoursForDay(day, projects, categories);

  const exportToCSV = (startDate?: Date, endDate?: Date): string =>
    utilExportToCSV(archivedDays, projects, categories, user?.id || '', startDate, endDate);

  const exportToJSON = (startDate?: Date, endDate?: Date): string =>
    utilExportToJSON(archivedDays, projects, categories, startDate, endDate);

  const generateInvoiceData = (
    clientName: string,
    startDate: Date,
    endDate: Date
  ): InvoiceData =>
    utilGenerateInvoiceData(archivedDays, projects, categories, clientName, startDate, endDate);

  const importFromCSV = async (
    csvContent: string
  ): Promise<{ success: boolean; message: string; importedCount: number }> => {
    try {
      const result = parseCSVImport(csvContent, categories);
      if (!result.success) {
        return { success: false, message: result.message, importedCount: 0 };
      }

      // Merge with existing archived days (avoid duplicates)
      const existingIds = new Set(archivedDays.map(day => day.id));
      const uniqueNewDays = result.newArchivedDays.filter(
        day => !existingIds.has(day.id)
      );

      const updatedArchivedDays = [...archivedDays, ...uniqueNewDays];
      setArchivedDays(updatedArchivedDays);

      if (dataService) {
        await dataService.saveArchivedDays(updatedArchivedDays);
      }

      return {
        success: true,
        message: `Successfully imported ${result.importedCount} tasks in ${uniqueNewDays.length} days`,
        importedCount: result.importedCount
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
