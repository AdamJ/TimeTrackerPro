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
  // generateInvoiceData: (clientName: string, startDate: Date, endDate: Date) => any;

  // Calculated values
  getTotalDayDuration: () => number;
  getCurrentTaskDuration: () => number;
  getTotalHoursForPeriod: (startDate: Date, endDate: Date) => number;
  getRevenueForPeriod: (startDate: Date, endDate: Date) => number;
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
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [dataService, setDataService] = useState<DataService | null>(null);
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

  // Initialize data service when auth state changes
  useEffect(() => {
    if (!authLoading) {
      const service = createDataService(isAuthenticated);
      setDataService(service);
    }
  }, [isAuthenticated, authLoading]);

  // Load data when data service is available
  useEffect(() => {
    const loadData = async () => {
      if (!dataService) return;

      setLoading(true);
      try {
        // Load current day
        console.log('🔄 Loading current day from database...');
        const currentDay = await dataService.getCurrentDay();
        if (currentDay) {
          console.log('📱 Current day loaded from database:', {
            tasksCount: currentDay.tasks.length,
            isDayStarted: currentDay.isDayStarted,
            hasCurrentTask: !!currentDay.currentTask
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
        }

        // If switching from localStorage to Supabase, migrate data
        if (isAuthenticated && dataService) {
          await dataService.migrateFromLocalStorage();
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dataService, isAuthenticated]);

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
        hasCurrentTask: !!state.currentTask
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
    console.log('Day ended');
    // Save immediately since this is a critical action
    saveImmediately();
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
        await dataService.saveArchivedDays([...archivedDays, dayRecord]);
        console.log('✅ Archive saved immediately');
      } catch (error) {
        console.error('❌ Error saving archive immediately:', error);
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
        if (task.project && task.duration) {
          const project = projects.find((p) => p.name === task.project);
          if (project?.hourlyRate) {
            const hours = task.duration / (1000 * 60 * 60);
            totalRevenue += hours * project.hourlyRate;
          }
        }
      });
    });

    return Math.round(totalRevenue * 100) / 100;
  };

  const exportToCSV = (startDate?: Date, endDate?: Date): string => {
    let filteredDays = archivedDays;

    if (startDate && endDate) {
      filteredDays = archivedDays.filter((day) => {
        const dayDate = new Date(day.startTime);
        return dayDate >= startDate && dayDate <= endDate;
      });
    }

    const headers = [
      'Date',
      'Project',
      'Client',
      'Task',
      'Description',
      'Duration (Hours)',
      'Start Time',
      'End Time',
      'Hourly Rate',
      'Amount'
    ];
    const rows = [headers.join(',')];

    filteredDays.forEach((day) => {
      day.tasks.forEach((task) => {
        if (task.duration) {
          const project = projects.find((p) => p.name === task.project);
          const hours =
            Math.round((task.duration / (1000 * 60 * 60)) * 100) / 100;
          const amount = project?.hourlyRate
            ? Math.round(hours * project.hourlyRate * 100) / 100
            : '';

          const row = [
            day.date,
            task.project || '',
            task.client || '',
            `"${task.title}"`,
            `"${task.description}"`,
            hours,
            task.startTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }),
            task.endTime?.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) || '',
            project?.hourlyRate || '',
            amount
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
        generateInvoiceData,
        getTotalDayDuration,
        getCurrentTaskDuration,
        getTotalHoursForPeriod,
        getRevenueForPeriod
      }}
    >
      {children}
    </TimeTrackingContext.Provider>
  );
};
