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
import { toast } from '@/hooks/use-toast';
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
import { parseTaskChecklist } from '@/utils/checklistUtils';
import { SCHEMA_VERSION } from '@/services/localStorageService';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { useHaptics } from '@/hooks/useHaptics';

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
  archived?: boolean;
}

export interface Client {
  id: string;
  name: string;
  archived: boolean;
  createdAt: string; // ISO string
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;    // ISO string
  completedAt?: string; // ISO string — set when toggled to done, cleared when toggled back
}

export type PlannedTaskStatus = "todo" | "in_progress" | "done" | "blocked";

export interface PlannedTask {
  id: string;
  title: string;
  description?: string;
  status: PlannedTaskStatus;
  project?: string;
  client?: string;
  category?: string;
  priority: number;        // integer sort order within column; lower = higher; default 0
  linkedTaskId?: string;   // id of the timed Task created via "Pull to Day" (display only)
  createdAt: string;       // ISO string
  updatedAt: string;       // ISO string
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

  // Todo items
  todoItems: TodoItem[];
  addTodoItem: (text: string) => void;
  toggleTodoItem: (id: string) => void;
  deleteTodoItem: (id: string) => void;
  clearCompletedTodos: () => void;

  // Projects and clients
  projects: Project[];
  clients: Client[];

  // Categories
  categories: TaskCategory[];

  // Stale day detection
  isDayStale: boolean;

  // Actions
  startDay: (startDateTime?: Date) => void;
  endDay: (endDateTime?: Date) => void;
  discardDay: () => void;
  startNewTask: (
    title: string,
    description?: string,
    project?: string,
    client?: string,
    category?: string
  ) => string;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  postDay: (notes?: string) => void;

  // Project management
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  resetProjectsToDefaults: () => void;
  archiveProject: (projectId: string) => void;
  restoreProject: (projectId: string) => void;

  // Client management
  addClient: (name: string) => void;
  archiveClient: (clientId: string) => string | null;
  restoreClient: (clientId: string) => void;

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
  addBackdatedDay: (day: DayRecord) => Promise<void>;

  // Export functions
  exportToCSV: (startDate?: Date, endDate?: Date) => string;
  exportToJSON: (startDate?: Date, endDate?: Date) => string;
  importFromCSV: (
    csvContent: string
  ) => Promise<{ success: boolean; message: string; importedCount: number }>;
  // generateInvoiceData: (clientName: string, startDate: Date, endDate: Date) => any;

  // Planned tasks (kanban board)
  plannedTasks: PlannedTask[];
  addPlannedTask: (data: Omit<PlannedTask, "id" | "createdAt" | "updatedAt" | "status">) => void;
  updatePlannedTask: (id: string, updates: Partial<PlannedTask>) => void;
  deletePlannedTask: (id: string) => void;
  movePlannedTask: (id: string, status: PlannedTaskStatus) => void;
  pullPlannedTaskToDay: (id: string) => void;

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
  CATEGORIES: 'timetracker_categories',
  CLIENTS: 'timetracker_clients'
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
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dayEndTime, setDayEndTime] = useState<Date | null>(null);
  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>([]);

  const { successNotify, errorNotify, lightImpact, mediumImpact } = useHaptics();

  // Debounce refs to manage timeouts
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTaskTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStateRef = useRef<string>(''); // Track last saved state to prevent duplicate saves
  const currentAuthStateRef = useRef<boolean>(false); // Track current auth state without triggering re-renders

  // Ref-based access to dataService for todo save effect (avoids adding dataService
  // to todo callback deps, which would invalidate them on every auth change).
  const dataServiceRef = useRef<DataService | null>(null);
  // Guards against saving todos/planned tasks during the initial data load.
  const todoLoadedRef = useRef(false);
  const plannedLoadedRef = useRef(false);
  // Tracks current plannedTasks for use in callbacks without closing over state.
  const plannedTasksRef = useRef<PlannedTask[]>([]);

  // Initialize data service when auth state changes
  useEffect(() => {
    if (!authLoading) {
      const service = createDataService(isAuthenticated);
      setDataService(service);
      dataServiceRef.current = service;
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
        }

        // Load archived days
        const archived = await dataService.getArchivedDays();
        setArchivedDays(archived);

        // Load projects
        const loadedProjects = await dataService.getProjects();
        let resolvedProjects: Project[];
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

          resolvedProjects = mergedProjects;
        } else {
          resolvedProjects = convertDefaultProjects(DEFAULT_PROJECTS);
        }

        // Normalize the archived flag for projects saved before it existed.
        // Keeps legacy data working without a storage migration.
        resolvedProjects = resolvedProjects.map(project => ({
          ...project,
          archived: project.archived ?? false
        }));
        setProjects(resolvedProjects);

        // Load clients. On first run (empty), seed from the unique client
        // name strings already referenced by projects so existing data stays
        // visible. This shim runs once and persists silently.
        const loadedClients = await dataService.getClients();
        if (loadedClients.length > 0) {
          setClients(loadedClients);
        } else {
          const uniqueNames = Array.from(
            new Set(
              resolvedProjects
                .map(project => project.client?.trim())
                .filter((name): name is string => !!name)
            )
          );
          const seededClients: Client[] = uniqueNames.map((name, index) => ({
            id: `seed-${index}-${Date.now()}`,
            name,
            archived: false,
            createdAt: new Date().toISOString()
          }));
          setClients(seededClients);
          await dataService.saveClients(seededClients);
        }

        // Load categories
        const loadedCategories = await dataService.getCategories();
        if (loadedCategories.length > 0) {
          setCategories(loadedCategories);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }

        // Load todos
        const loadedTodos = await dataService.getTodos();
        setTodoItems(loadedTodos);

        // Load planned tasks
        const loadedPlannedTasks = await dataService.getPlannedTasks();
        setPlannedTasks(loadedPlannedTasks);

        // If switching from localStorage to Supabase, migrate data
        if (currentAuthStateRef.current && dataService) {
          await dataService.migrateFromLocalStorage();
        }

        // Allow todo/planned-task save effects to fire for user-initiated changes
        todoLoadedRef.current = true;
        plannedLoadedRef.current = true;
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dataService]);

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
      // Save all data types in parallel; use allSettled so a single failure
      // doesn't silently leave other saves in an unknown state.
      const results = await Promise.allSettled([
        stableSaveCurrentDay(),
        dataService.saveProjects(projects),
        dataService.saveClients(clients),
        dataService.saveCategories(categories),
        dataService.saveArchivedDays(archivedDays),
        dataService.saveTodos(todoItems),
        dataService.savePlannedTasks(plannedTasks)
      ]);

      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        console.error(
          "❌ Manual sync partially failed:",
          failed.map((f) => (f as PromiseRejectedResult).reason)
        );
        errorNotify();
        // Do not mark sync as successful when any save failed
        return;
      }

      setLastSyncTime(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      errorNotify();
    } finally {
      setIsSyncing(false);
    }
  }, [dataService, stableSaveCurrentDay, projects, clients, categories, archivedDays, todoItems, plannedTasks, errorNotify]);

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

  // Save on window close to prevent data loss.
  // Uses latestStateRef to avoid stale-closure races (e.g. hard-refresh immediately
  // after archiving, before React re-renders and re-registers this handler).
  useEffect(() => {
    const handleBeforeUnload = (_event: BeforeUnloadEvent) => {
      if (!dataService) return;
      const state = latestStateRef.current;
      if (!state.isDayStarted && state.tasks.length === 0) return;
      // Async saves cannot be reliably awaited during beforeunload, so write the
      // current state synchronously to localStorage as a guaranteed crash backup.
      // Supabase-mode users will have this local copy available for recovery on next load.
      try {
        localStorage.setItem(
          STORAGE_KEYS.CURRENT_DAY,
          JSON.stringify({ ...state, _v: SCHEMA_VERSION })
        );
      } catch {
        // localStorage unavailable (quota exceeded, private mode); best effort only.
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dataService]);

  // On iOS/Capacitor, useAppLifecycle fires at the Swift layer (appStateChange)
  // before WKWebView is frozen — more reliable than beforeunload or visibilitychange.
  // On web, it falls back to visibilitychange automatically.
  // Uses latestStateRef to avoid the same stale-closure race as beforeunload.
  const handleBackground = useCallback(() => {
    const state = latestStateRef.current;
    if (!state.isDayStarted && state.tasks.length === 0) return;
    try {
      localStorage.setItem(
        STORAGE_KEYS.CURRENT_DAY,
        JSON.stringify({ ...state, _v: SCHEMA_VERSION })
      );
    } catch {
      // best effort
    }
  }, []);

  useAppLifecycle(handleBackground);

  // Sync to backend when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (!isAuthenticated) return;
      forceSyncToDatabase();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isAuthenticated, forceSyncToDatabase]);

  // Update current time every 30 seconds (instead of every second for better performance)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // 30 seconds instead of 1 second
    return () => clearInterval(timer);
  }, []);

  const isDayStale =
    isDayStarted &&
    !!dayStartTime &&
    dayStartTime.toDateString() !== new Date().toDateString();

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

    if (dataService) {
      dataService.saveCurrentDay({ isDayStarted: true, dayStartTime: roundedTime, currentTask: null, tasks })
        .then(() => setLastSyncTime(new Date()))
        .catch(error => console.error("❌ Error saving after starting day:", error));
    }
  };

  const endDay = (endDateTime?: Date) => {
    const effectiveEndTime = endDateTime ?? new Date();
    let finalTasks = tasks;
    if (currentTask) {
      const endedTask = {
        ...currentTask,
        endTime: effectiveEndTime,
        duration: effectiveEndTime.getTime() - currentTask.startTime.getTime()
      };
      finalTasks = tasks.map(t => (t.id === currentTask.id ? endedTask : t));
      setTasks(finalTasks);
      setCurrentTask(null);
    }
    setDayEndTime(effectiveEndTime);
    setIsDayStarted(false);
    setHasUnsavedChanges(true);
    // Save with freshly computed state to avoid reading from stale latestStateRef
    if (dataService) {
      dataService.saveCurrentDay({ isDayStarted: false, dayStartTime, currentTask: null, tasks: finalTasks })
        .then(() => setLastSyncTime(new Date()))
        .catch(error => {
          console.error("❌ Error saving state after ending day:", error);
          toast({
            title: "Save Failed",
            description: "Your day was ended but the data could not be saved. Please use Manual Sync to retry.",
            variant: "destructive",
            duration: 7000
          });
        });
    }
  };

  const discardDay = () => {
    setIsDayStarted(false);
    setDayStartTime(null);
    setCurrentTask(null);
    setTasks([]);
    setHasUnsavedChanges(true);
    if (dataService) {
      dataService.saveCurrentDay({ isDayStarted: false, dayStartTime: null, currentTask: null, tasks: [] })
        .catch(error => console.error("❌ Error saving state after discarding day:", error));
    }
  };

  const startNewTask = (
    title: string,
    description?: string,
    project?: string,
    client?: string,
    category?: string
  ): string => {
    const now = new Date();

    // End current task if exists and compute the updated task list synchronously
    let baseTasks = tasks;
    if (currentTask) {
      const endedTask = {
        ...currentTask,
        endTime: now,
        duration: now.getTime() - currentTask.startTime.getTime()
      };
      baseTasks = tasks.map(t => (t.id === currentTask.id ? endedTask : t));
      setTasks(baseTasks);
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

    const updatedTasks = [...baseTasks, newTask];
    setTasks(updatedTasks);
    setCurrentTask(newTask);
    setHasUnsavedChanges(true);
    successNotify();
    // Save with freshly computed state to avoid reading from stale latestStateRef
    if (dataService) {
      dataService.saveCurrentDay({ isDayStarted, dayStartTime, currentTask: newTask, tasks: updatedTasks })
        .then(() => setLastSyncTime(new Date()))
        .catch(error => console.error("❌ Error saving after starting task:", error));
    }
    return newTask.id;
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const updatedTasks = tasks.map(task => (task.id === taskId ? { ...task, ...updates } : task));
    const updatedCurrentTask = currentTask?.id === taskId ? { ...currentTask, ...updates } : currentTask;
    setTasks(updatedTasks);
    if (currentTask?.id === taskId) {
      setCurrentTask(updatedCurrentTask ?? null);
    }
    setHasUnsavedChanges(true);
    if (dataService) {
      dataService.saveCurrentDay({ isDayStarted, dayStartTime, currentTask: updatedCurrentTask ?? null, tasks: updatedTasks })
        .then(() => setLastSyncTime(new Date()))
        .catch(error => console.error("❌ Error saving after updating task:", error));
    }
  };

  const deleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    const updatedCurrentTask = currentTask?.id === taskId ? null : currentTask;
    setTasks(updatedTasks);
    if (currentTask?.id === taskId) {
      setCurrentTask(null);
    }
    setHasUnsavedChanges(true);
    if (dataService) {
      dataService.saveCurrentDay({ isDayStarted, dayStartTime, currentTask: updatedCurrentTask, tasks: updatedTasks })
        .then(() => setLastSyncTime(new Date()))
        .catch(error => console.error("❌ Error saving after deleting task:", error));
    }
  };

  const postDay = async (notes?: string) => {
    if (!dayStartTime) return;

    // Collect incomplete checklist items from task descriptions so they carry
    // over to the next day as standalone to-do items.
    const nowMs = Date.now();
    const carriedOverItems: TodoItem[] = tasks.flatMap((task, taskIdx) =>
      parseTaskChecklist(task.description ?? "")
        .filter(entry => !entry.completed)
        .map((entry, entryIdx) => ({
          id: `todo-${nowMs}-${taskIdx}-${entryIdx}-${Math.random().toString(36).slice(2, 7)}`,
          text: entry.text,
          completed: false,
          createdAt: new Date().toISOString()
        }))
    );
    const carriedOverIds = new Set(carriedOverItems.map(item => item.id));

    const dayRecord: DayRecord = {
      id: Date.now().toString(),
      date: dayStartTime.toDateString(),
      tasks: tasks,
      totalDuration: getTotalDayDuration(),
      startTime: dayStartTime,
      endTime: dayEndTime ?? new Date(),
      notes
    };

    // Validate we have tasks to archive
    if (tasks.length === 0) {
      console.warn('⚠️ Archiving day with no tasks');
    }

    // Update state optimistically
    setArchivedDays(prev => [...prev, dayRecord]);

    // Carry over incomplete checklist items as to-dos (always update state for consistency)
    const updatedTodos = [...todoItems, ...carriedOverItems];
    setTodoItems(updatedTodos);

    // Clear current day data
    setDayStartTime(null);
    setDayEndTime(null);
    setCurrentTask(null);
    setTasks([]);
    setIsDayStarted(false);

    // Immediately sync the ref so beforeunload/handleBackground can't race and
    // overwrite localStorage with the old (pre-archive) state before React re-renders.
    latestStateRef.current = { isDayStarted: false, dayStartTime: null, currentTask: null, tasks: [] };

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

        // Persist carried-over to-do items
        if (carriedOverItems.length > 0) {
          await dataService.saveTodos(updatedTodos);
        }

        setHasUnsavedChanges(false);
        successNotify();

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

        // Rollback carried-over to-do items using IDs to avoid stale-closure issues
        if (carriedOverItems.length > 0) {
          setTodoItems(prev => prev.filter(item => !carriedOverIds.has(item.id)));
        }

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

  const archiveProject = (projectId: string) => {
    setProjects(prev =>
      prev.map(project =>
        project.id === projectId ? { ...project, archived: true } : project
      )
    );
    setHasUnsavedChanges(true);
  };

  const restoreProject = (projectId: string) => {
    setProjects(prev =>
      prev.map(project =>
        project.id === projectId ? { ...project, archived: false } : project
      )
    );
    setHasUnsavedChanges(true);
  };

  // Client management functions - NO AUTOMATIC SAVING
  const addClient = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newClient: Client = {
      id: Date.now().toString(),
      name: trimmed,
      archived: false,
      createdAt: new Date().toISOString()
    };
    setClients(prev => [...prev, newClient]);
    setHasUnsavedChanges(true);
  };

  // Returns null on success, or an error message naming the active projects
  // that block archiving (a client cannot be archived while it still owns
  // non-archived projects).
  const archiveClient = (clientId: string): string | null => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return "Client not found.";

    const blockingProjects = projects.filter(
      project => project.client === client.name && project.archived !== true
    );

    if (blockingProjects.length > 0) {
      const names = blockingProjects.map(project => project.name).join(", ");
      const count = blockingProjects.length;
      const noun = count === 1 ? "project" : "projects";
      const action = count === 1 ? "that project" : "those projects";
      return `${client.name} has ${count} active ${noun}: ${names}. Archive ${action} before archiving this client.`;
    }

    setClients(prev =>
      prev.map(c => (c.id === clientId ? { ...c, archived: true } : c))
    );
    setHasUnsavedChanges(true);
    return null;
  };

  const restoreClient = (clientId: string) => {
    setClients(prev =>
      prev.map(c => (c.id === clientId ? { ...c, archived: false } : c))
    );
    setHasUnsavedChanges(true);
  };

  // Archive management functions
  const updateArchivedDay = async (
    dayId: string,
    updates: Partial<DayRecord>
  ) => {
    if (!dataService) return;

    // Capture original for targeted rollback on error
    const originalDay = archivedDays.find(d => d.id === dayId);

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

      // Roll back only the affected day rather than re-fetching the entire archive
      if (originalDay) {
        setArchivedDays(prev =>
          prev.map(day => (day.id === dayId ? originalDay : day))
        );
      } else {
        const refreshedDays = await dataService.getArchivedDays();
        setArchivedDays(refreshedDays);
      }

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

  const addBackdatedDay = async (day: DayRecord) => {
    const updatedDays = [...archivedDays, day];
    setArchivedDays(updatedDays);

    if (dataService) {
      try {
        await dataService.saveArchivedDays(updatedDays);
        setHasUnsavedChanges(false);
        successNotify();
        toast({
          title: "Entry Added",
          description: `${day.tasks.length} task(s) saved for ${day.date}`,
          duration: 5000
        });
      } catch (error) {
        setArchivedDays(prev => prev.filter(d => d.id !== day.id));
        errorNotify();
        toast({
          title: "Save Failed",
          description: "Could not save the backdated entry. Please try again.",
          variant: "destructive",
          duration: 7000
        });
        throw error;
      }
    }
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

  // Persist todos whenever todoItems changes due to a user action.
  // Uses refs so this effect doesn't recreate todo callbacks on every change.
  useEffect(() => {
    if (!todoLoadedRef.current || !dataServiceRef.current) return;
    dataServiceRef.current.saveTodos(todoItems);
  }, [todoItems]);

  // Keep ref in sync so planned task callbacks can read current state without closing over it.
  useEffect(() => {
    plannedTasksRef.current = plannedTasks;
  }, [plannedTasks]);

  // Stable callbacks — no todoItems in deps. Functional updates ensure each
  // callback always operates on the latest state without closing over it.
  const addTodoItem = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newItem: TodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: trimmed,
      completed: false,
      createdAt: new Date().toISOString()
    };
    setTodoItems(prev => [...prev, newItem]);
  }, []);

  const toggleTodoItem = useCallback((id: string) => {
    setTodoItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const nowCompleted = !item.completed;
      return { ...item, completed: nowCompleted, completedAt: nowCompleted ? new Date().toISOString() : undefined };
    }));
  }, []);

  const deleteTodoItem = useCallback((id: string) => {
    setTodoItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearCompletedTodos = useCallback(() => {
    setTodoItems(prev => prev.filter(item => !item.completed));
  }, []);

  // === PLANNED TASKS ===

  const addPlannedTask = useCallback((data: Omit<PlannedTask, "id" | "createdAt" | "updatedAt" | "status">) => {
    const now = new Date().toISOString();
    const newTask: PlannedTask = {
      ...data,
      id: `planned-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: "todo",
      createdAt: now,
      updatedAt: now
    };
    setPlannedTasks(prev => [...prev, newTask]);
    if (plannedLoadedRef.current) void dataServiceRef.current?.upsertPlannedTask(newTask);
    successNotify();
  }, [successNotify]);

  const updatePlannedTask = useCallback((id: string, updates: Partial<PlannedTask>) => {
    const now = new Date().toISOString();
    setPlannedTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: now } : t));
    if (plannedLoadedRef.current) {
      const current = plannedTasksRef.current.find(t => t.id === id);
      if (current) void dataServiceRef.current?.upsertPlannedTask({ ...current, ...updates, updatedAt: now });
    }
  }, []);

  const deletePlannedTask = useCallback((id: string) => {
    setPlannedTasks(prev => prev.filter(t => t.id !== id));
    if (plannedLoadedRef.current) void dataServiceRef.current?.deletePlannedTask(id);
    mediumImpact();
  }, [mediumImpact]);

  const movePlannedTask = useCallback((id: string, status: PlannedTaskStatus) => {
    const now = new Date().toISOString();
    setPlannedTasks(prev => prev.map(t => t.id === id ? { ...t, status, updatedAt: now } : t));
    if (plannedLoadedRef.current) {
      const current = plannedTasksRef.current.find(t => t.id === id);
      if (current) void dataServiceRef.current?.upsertPlannedTask({ ...current, status, updatedAt: now });
    }
    lightImpact();
  }, [lightImpact]);

  const pullPlannedTaskToDay = (id: string) => {
    if (!isDayStarted) {
      toast({ title: "Start your work day first", description: "Go to the Dashboard and start your day before pulling tasks." });
      return;
    }
    if (isDayStale) {
      toast({ title: "Resolve your previous day first", description: "Your previous work day is still open. Please end or discard it." });
      return;
    }
    const task = plannedTasksRef.current.find(t => t.id === id);
    if (!task) return;
    const newTaskId = startNewTask(task.title, task.description, task.project, task.client, task.category);
    const now = new Date().toISOString();
    const updated: PlannedTask = { ...task, status: "in_progress" as PlannedTaskStatus, linkedTaskId: newTaskId, updatedAt: now };
    setPlannedTasks(prev => prev.map(t => t.id === id ? updated : t));
    if (plannedLoadedRef.current) void dataServiceRef.current?.upsertPlannedTask(updated);
    toast({ title: `Task started: ${task.title}` });
  };

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
        isDayStale,
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
        todoItems,
        addTodoItem,
        toggleTodoItem,
        deleteTodoItem,
        clearCompletedTodos,
        projects,
        clients,
        categories,
        startDay,
        endDay,
        discardDay,
        startNewTask,
        updateTask,
        deleteTask,
        postDay,
        plannedTasks,
        addPlannedTask,
        updatePlannedTask,
        deletePlannedTask,
        movePlannedTask,
        pullPlannedTaskToDay,
        addProject,
        updateProject,
        deleteProject,
        resetProjectsToDefaults,
        archiveProject,
        restoreProject,
        addClient,
        archiveClient,
        restoreClient,
        addCategory,
        updateCategory,
        deleteCategory,
        updateArchivedDay,
        deleteArchivedDay,
        restoreArchivedDay,
        addBackdatedDay,
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
