import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_CATEGORIES, TaskCategory } from '@/config/categories';
import { DEFAULT_PROJECTS, ProjectCategory } from '@/config/projects';

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

  // Archive state
  archivedDays: DayRecord[];

  // Projects and clients
  projects: Project[];

  // Categories
  categories: TaskCategory[];

  // Actions
  startDay: () => void;
  endDay: () => void;
  startNewTask: (title: string, description?: string, project?: string, client?: string, category?: string) => void;
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

  generateInvoiceData: (clientName: string, startDate: Date, endDate: Date) => InvoiceData;
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

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined);

export const useTimeTracking = () => {
  const context = useContext(TimeTrackingContext);
  if (!context) {
    throw new Error('useTimeTracking must be used within TimeTrackingProvider');
  }
  return context;
};

const STORAGE_KEYS = {
  CURRENT_DAY: 'timetracker_current_day',
  ARCHIVED_DAYS: 'timetracker_archived_days',
  PROJECTS: 'timetracker_projects',
  CATEGORIES: 'timetracker_categories'
};

// Convert ProjectCategory to Project by adding an id
const convertDefaultProjects = (defaultProjects: ProjectCategory[]): Project[] => {
  return defaultProjects.map((project, index) => ({
    ...project,
    id: `default-${index}-${project.name.toLowerCase().replace(/\s+/g, '-')}`
  }));
};

export const TimeTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDayStarted, setIsDayStarted] = useState(false);
  const [dayStartTime, setDayStartTime] = useState<Date | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [archivedDays, setArchivedDays] = useState<DayRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>(convertDefaultProjects(DEFAULT_PROJECTS));
  const [categories, setCategories] = useState<TaskCategory[]>(DEFAULT_CATEGORIES);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedCurrentDay = localStorage.getItem(STORAGE_KEYS.CURRENT_DAY);
      if (savedCurrentDay) {
        const data = JSON.parse(savedCurrentDay);
        setIsDayStarted(data.isDayStarted);
        setDayStartTime(data.dayStartTime ? new Date(data.dayStartTime) : null);
        setTasks(data.tasks.map((task: Task) => ({
          ...task,
          startTime: new Date(task.startTime),
          endTime: task.endTime ? new Date(task.endTime) : undefined
        })));
        setCurrentTask(data.currentTask ? {
          ...data.currentTask,
          startTime: new Date(data.currentTask.startTime),
          endTime: data.currentTask.endTime ? new Date(data.currentTask.endTime) : undefined
        } : null);
      }

      const savedArchivedDays = localStorage.getItem(STORAGE_KEYS.ARCHIVED_DAYS);
      if (savedArchivedDays) {
        const data = JSON.parse(savedArchivedDays);
        setArchivedDays(data.map((day: DayRecord) => ({
          ...day,
          startTime: new Date(day.startTime),
          endTime: new Date(day.endTime),
          tasks: day.tasks.map((task: Task) => ({
            ...task,
            startTime: new Date(task.startTime),
            endTime: task.endTime ? new Date(task.endTime) : undefined
          }))
        })));
      }

      const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (savedProjects) {
        const parsedProjects = JSON.parse(savedProjects);
        // Merge default projects with saved projects, avoiding duplicates
        const defaultProjects = convertDefaultProjects(DEFAULT_PROJECTS);
        const mergedProjects = [...defaultProjects];

        // Add saved projects that don't conflict with default ones
        parsedProjects.forEach((savedProject: Project) => {
          const existsInDefaults = defaultProjects.some(
            defaultProject => defaultProject.name === savedProject.name && defaultProject.client === savedProject.client
          );
          if (!existsInDefaults) {
            mergedProjects.push(savedProject);
          }
        });

        setProjects(mergedProjects);
      } else {
        // If no saved projects, use defaults
        setProjects(convertDefaultProjects(DEFAULT_PROJECTS));
      }

      const savedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (savedCategories) {
        setCategories(JSON.parse(savedCategories));
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
  }, []);

  // Save current day data to localStorage
  useEffect(() => {
    const currentDayData = {
      isDayStarted,
      dayStartTime,
      currentTask,
      tasks
    };
    localStorage.setItem(STORAGE_KEYS.CURRENT_DAY, JSON.stringify(currentDayData));
  }, [isDayStarted, dayStartTime, currentTask, tasks]);

  // Save archived days to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ARCHIVED_DAYS, JSON.stringify(archivedDays));
  }, [archivedDays]);

  // Save projects to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  }, [projects]);

  // Save categories to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }, [categories]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
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
      setTasks(prev => prev.map(t => t.id === currentTask.id ? updatedTask : t));
      setCurrentTask(null);
    }
    setIsDayStarted(false);
    console.log('Day ended');
  };

  const startNewTask = (title: string, description?: string, project?: string, client?: string, category?: string) => {
    const now = new Date();

    // End current task if exists
    if (currentTask) {
      const updatedTask = {
        ...currentTask,
        endTime: now,
        duration: now.getTime() - currentTask.startTime.getTime()
      };
      setTasks(prev => prev.map(t => t.id === currentTask.id ? updatedTask : t));
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

    setTasks(prev => [...prev, newTask]);
    setCurrentTask(newTask);
    console.log('New task started:', title);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    ));
    if (currentTask?.id === taskId) {
      setCurrentTask(prev => prev ? { ...prev, ...updates } : null);
    }
    console.log('Task updated:', taskId, updates);
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    if (currentTask?.id === taskId) {
      setCurrentTask(null);
    }
    console.log('Task deleted:', taskId);
  };

  const postDay = (notes?: string) => {
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

    setArchivedDays(prev => [...prev, dayRecord]);

    // Clear current day data
    setDayStartTime(null);
    setCurrentTask(null);
    setTasks([]);
    console.log('Day posted to archive');
  };

  // Project management functions
  const addProject = (project: Omit<Project, 'id'>) => {
    const newProject: Project = {
      ...project,
      id: Date.now().toString()
    };
    setProjects(prev => [...prev, newProject]);
  };

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(project =>
      project.id === projectId ? { ...project, ...updates } : project
    ));
  };

  const deleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(project => project.id !== projectId));
  };

  const resetProjectsToDefaults = () => {
    const defaultProjects = convertDefaultProjects(DEFAULT_PROJECTS);
    setProjects(defaultProjects);
  };

  // Archive management functions
  const updateArchivedDay = (dayId: string, updates: Partial<DayRecord>) => {
    setArchivedDays(prev => prev.map(day =>
      day.id === dayId ? { ...day, ...updates } : day
    ));
  };

  const deleteArchivedDay = (dayId: string) => {
    setArchivedDays(prev => prev.filter(day => day.id !== dayId));
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

    console.log('Day restored from archive');
  };

  // Category management functions
  const addCategory = (category: Omit<TaskCategory, 'id'>) => {
    const newCategory: TaskCategory = {
      ...category,
      id: Date.now().toString()
    };
    setCategories(prev => [...prev, newCategory]);
  };

  const updateCategory = (categoryId: string, updates: Partial<TaskCategory>) => {
    setCategories(prev => prev.map(category =>
      category.id === categoryId ? { ...category, ...updates } : category
    ));
  };

  const deleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(category => category.id !== categoryId));
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

    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updatedTask = {
          ...task,
          startTime: roundedStartTime,
          endTime: roundedEndTime,
          duration: roundedEndTime ? roundedEndTime.getTime() - roundedStartTime.getTime() : task.duration
        };
        return updatedTask;
      }
      return task;
    }));

    // Update current task if it's the one being adjusted
    if (currentTask?.id === taskId) {
      setCurrentTask(prev => prev ? {
        ...prev,
        startTime: roundedStartTime,
        endTime: roundedEndTime
      } : null);
    }
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

  const getTotalHoursForPeriod = (startDate: Date, endDate: Date): number => {
    const filteredDays = archivedDays.filter(day => {
      const dayDate = new Date(day.startTime);
      return dayDate >= startDate && dayDate <= endDate;
    });

    const totalMs = filteredDays.reduce((total, day) => total + day.totalDuration, 0);
    return Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
  };

  const getRevenueForPeriod = (startDate: Date, endDate: Date): number => {
    const filteredDays = archivedDays.filter(day => {
      const dayDate = new Date(day.startTime);
      return dayDate >= startDate && dayDate <= endDate;
    });

    let totalRevenue = 0;
    filteredDays.forEach(day => {
      day.tasks.forEach(task => {
        if (task.project && task.duration) {
          const project = projects.find(p => p.name === task.project);
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
      filteredDays = archivedDays.filter(day => {
        const dayDate = new Date(day.startTime);
        return dayDate >= startDate && dayDate <= endDate;
      });
    }

    const headers = ['Date', 'Project', 'Client', 'Task', 'Duration (Hours)', 'Start Time', 'End Time', 'Hourly Rate', 'Amount'];
    const rows = [headers.join(',')];

    filteredDays.forEach(day => {
      day.tasks.forEach(task => {
        if (task.duration) {
          const project = projects.find(p => p.name === task.project);
          const hours = Math.round((task.duration / (1000 * 60 * 60)) * 100) / 100;
          const amount = project?.hourlyRate ? Math.round(hours * project.hourlyRate * 100) / 100 : '';

          const row = [
            day.date,
            task.project || '',
            task.client || '',
            `"${task.title}"`,
            hours,
            task.startTime.toLocaleTimeString(),
            task.endTime?.toLocaleTimeString() || '',
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
      filteredDays = archivedDays.filter(day => {
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
        totalHours: getTotalHoursForPeriod(startDate || new Date(0), endDate || new Date()),
        totalRevenue: getRevenueForPeriod(startDate || new Date(0), endDate || new Date())
      },
      days: filteredDays,
      projects: projects
    };

    return JSON.stringify(exportData, null, 2);
  };

  const generateInvoiceData = (clientName: string, startDate: Date, endDate: Date) => {
    const filteredDays = archivedDays.filter(day => {
      const dayDate = new Date(day.startTime);
      return dayDate >= startDate && dayDate <= endDate;
    });

    const clientTasks = filteredDays.flatMap(day =>
      day.tasks.filter(task => task.client === clientName && task.duration)
    );

    const projectSummary: { [key: string]: { hours: number; rate: number; amount: number } } = {};

    clientTasks.forEach(task => {
      const projectName = task.project || 'General';
      const project = projects.find(p => p.name === task.project);
      const hours = (task.duration || 0) / (1000 * 60 * 60);
      const rate = project?.hourlyRate || 0;

      if (!projectSummary[projectName]) {
        projectSummary[projectName] = { hours: 0, rate, amount: 0 };
      }

      projectSummary[projectName].hours += hours;
      projectSummary[projectName].amount += hours * rate;
    });

    const totalHours = Object.values(projectSummary).reduce((sum, proj) => sum + proj.hours, 0);
    const totalAmount = Object.values(projectSummary).reduce((sum, proj) => sum + proj.amount, 0);

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
    <TimeTrackingContext.Provider value={{
      isDayStarted,
      dayStartTime,
      currentTask,
      tasks,
      currentTime,
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
    }}>
      {children}
    </TimeTrackingContext.Provider>
  );
};
