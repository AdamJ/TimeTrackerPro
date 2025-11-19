import { Task, DayRecord, Project } from '@/contexts/TimeTrackingContext';
import { TaskCategory } from '@/config/categories';
import { getElectronAPI } from '@/utils/platform';
import {
  DataService,
  CurrentDayData,
  STORAGE_KEYS,
} from './dataService';

/**
 * Native file system storage service for Electron
 * Stores data as JSON files in user-selected directory
 */
export class NativeFileStorageService implements DataService {
  private dataDir: string | null = null;
  private initialized = false;
  private readonly electronAPI = getElectronAPI();

  constructor() {
    if (!this.electronAPI) {
      throw new Error('NativeFileStorageService can only be used in Electron environment');
    }
  }

  /**
   * Initialize the storage service
   * Loads the data directory from settings or uses default
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Try to load saved data directory path from settings
      const settingsPath = await this.getSettingsPath();
      const settings = await this.readJsonFile<{ dataDir: string }>(settingsPath);

      if (settings?.dataDir) {
        this.dataDir = settings.dataDir;
      } else {
        // Use default data directory
        this.dataDir = await this.electronAPI!.fs.getDefaultDataDir();
      }

      // Ensure directory exists
      await this.electronAPI!.fs.ensureDir(this.dataDir);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize native file storage:', error);
      throw error;
    }
  }

  /**
   * Get the path to the settings file
   */
  private async getSettingsPath(): Promise<string> {
    const defaultDir = await this.electronAPI!.fs.getDefaultDataDir();
    return `${defaultDir}/settings.json`;
  }

  /**
   * Get the full path for a data file
   */
  private async getFilePath(fileName: string): Promise<string> {
    await this.initialize();
    return `${this.dataDir}/${fileName}`;
  }

  /**
   * Read a JSON file from the file system
   */
  private async readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
      const result = await this.electronAPI!.fs.readFile(filePath);
      if (result.success && result.data) {
        return JSON.parse(result.data);
      }
      return null;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Write a JSON file to the file system
   */
  private async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      const result = await this.electronAPI!.fs.writeFile(filePath, jsonData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to write file');
      }
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Set custom data directory (for user selection)
   */
  async setDataDirectory(dirPath: string): Promise<void> {
    this.dataDir = dirPath;

    // Ensure directory exists
    await this.electronAPI!.fs.ensureDir(dirPath);

    // Save to settings
    const settingsPath = await this.getSettingsPath();
    await this.writeJsonFile(settingsPath, { dataDir: dirPath });

    this.initialized = true;
  }

  /**
   * Get current data directory
   */
  async getDataDirectory(): Promise<string> {
    await this.initialize();
    return this.dataDir!;
  }

  /**
   * Allow user to select a custom data directory
   */
  async selectDataDirectory(): Promise<boolean> {
    const result = await this.electronAPI!.fs.selectDirectory();

    if (result.success && result.path) {
      await this.setDataDirectory(result.path);
      return true;
    }

    return false;
  }

  // DataService interface implementation

  async saveCurrentDay(data: CurrentDayData): Promise<void> {
    const filePath = await this.getFilePath('current_day.json');
    await this.writeJsonFile(filePath, data);
  }

  async getCurrentDay(): Promise<CurrentDayData | null> {
    const filePath = await this.getFilePath('current_day.json');
    const data = await this.readJsonFile<CurrentDayData>(filePath);

    if (!data) return null;

    // Convert date strings back to Date objects
    return {
      ...data,
      dayStartTime: data.dayStartTime ? new Date(data.dayStartTime) : null,
      tasks: data.tasks.map((task: Task) => ({
        ...task,
        startTime: new Date(task.startTime),
        endTime: task.endTime ? new Date(task.endTime) : undefined,
      })),
      currentTask: data.currentTask
        ? {
            ...data.currentTask,
            startTime: new Date(data.currentTask.startTime),
            endTime: data.currentTask.endTime
              ? new Date(data.currentTask.endTime)
              : undefined,
          }
        : null,
    };
  }

  async saveArchivedDays(days: DayRecord[]): Promise<void> {
    const filePath = await this.getFilePath('archived_days.json');
    await this.writeJsonFile(filePath, days);
  }

  async getArchivedDays(): Promise<DayRecord[]> {
    const filePath = await this.getFilePath('archived_days.json');
    const data = await this.readJsonFile<DayRecord[]>(filePath);

    if (!data) return [];

    // Convert date strings back to Date objects
    return data.map((day: DayRecord) => ({
      ...day,
      startTime: new Date(day.startTime),
      endTime: new Date(day.endTime),
      tasks: day.tasks.map((task: Task) => ({
        ...task,
        startTime: new Date(task.startTime),
        endTime: task.endTime ? new Date(task.endTime) : undefined,
      })),
    }));
  }

  async updateArchivedDay(dayId: string, updates: Partial<DayRecord>): Promise<void> {
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
    const filePath = await this.getFilePath('projects.json');
    await this.writeJsonFile(filePath, projects);
  }

  async getProjects(): Promise<Project[]> {
    const filePath = await this.getFilePath('projects.json');
    const data = await this.readJsonFile<Project[]>(filePath);
    return data || [];
  }

  async saveCategories(categories: TaskCategory[]): Promise<void> {
    const filePath = await this.getFilePath('categories.json');
    await this.writeJsonFile(filePath, categories);
  }

  async getCategories(): Promise<TaskCategory[]> {
    const filePath = await this.getFilePath('categories.json');
    const data = await this.readJsonFile<TaskCategory[]>(filePath);
    return data || [];
  }

  /**
   * Migrate data from localStorage to native file system
   */
  async migrateFromLocalStorage(): Promise<void> {
    try {
      console.log('Migrating data from localStorage to native file system...');

      // Migrate current day
      const currentDayStr = localStorage.getItem(STORAGE_KEYS.CURRENT_DAY);
      if (currentDayStr) {
        const currentDay = JSON.parse(currentDayStr);
        await this.saveCurrentDay(currentDay);
        console.log('Migrated current day data');
      }

      // Migrate archived days
      const archivedDaysStr = localStorage.getItem(STORAGE_KEYS.ARCHIVED_DAYS);
      if (archivedDaysStr) {
        const archivedDays = JSON.parse(archivedDaysStr);
        await this.saveArchivedDays(archivedDays);
        console.log('Migrated archived days data');
      }

      // Migrate projects
      const projectsStr = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (projectsStr) {
        const projects = JSON.parse(projectsStr);
        await this.saveProjects(projects);
        console.log('Migrated projects data');
      }

      // Migrate categories
      const categoriesStr = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (categoriesStr) {
        const categories = JSON.parse(categoriesStr);
        await this.saveCategories(categories);
        console.log('Migrated categories data');
      }

      console.log('Migration from localStorage completed successfully');
    } catch (error) {
      console.error('Error migrating from localStorage:', error);
      throw error;
    }
  }

  /**
   * Migrate data from native file system back to localStorage
   * Useful for switching between desktop and web versions
   */
  async migrateToLocalStorage(): Promise<void> {
    try {
      console.log('Migrating data from native file system to localStorage...');

      // Migrate current day
      const currentDay = await this.getCurrentDay();
      if (currentDay) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_DAY, JSON.stringify(currentDay));
        console.log('Migrated current day to localStorage');
      }

      // Migrate archived days
      const archivedDays = await this.getArchivedDays();
      if (archivedDays.length > 0) {
        localStorage.setItem(STORAGE_KEYS.ARCHIVED_DAYS, JSON.stringify(archivedDays));
        console.log('Migrated archived days to localStorage');
      }

      // Migrate projects
      const projects = await this.getProjects();
      if (projects.length > 0) {
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
        console.log('Migrated projects to localStorage');
      }

      // Migrate categories
      const categories = await this.getCategories();
      if (categories.length > 0) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
        console.log('Migrated categories to localStorage');
      }

      console.log('Migration to localStorage completed successfully');
    } catch (error) {
      console.error('Error migrating to localStorage:', error);
      throw error;
    }
  }

  /**
   * Create a backup of all data
   */
  async createBackup(backupPath: string): Promise<void> {
    const data = {
      currentDay: await this.getCurrentDay(),
      archivedDays: await this.getArchivedDays(),
      projects: await this.getProjects(),
      categories: await this.getCategories(),
      backupDate: new Date().toISOString(),
    };

    await this.writeJsonFile(backupPath, data);
    console.log('Backup created successfully at:', backupPath);
  }

  /**
   * Restore from a backup file
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    const backup = await this.readJsonFile<{
      currentDay: CurrentDayData;
      archivedDays: DayRecord[];
      projects: Project[];
      categories: TaskCategory[];
    }>(backupPath);

    if (!backup) {
      throw new Error('Invalid backup file');
    }

    if (backup.currentDay) await this.saveCurrentDay(backup.currentDay);
    if (backup.archivedDays) await this.saveArchivedDays(backup.archivedDays);
    if (backup.projects) await this.saveProjects(backup.projects);
    if (backup.categories) await this.saveCategories(backup.categories);

    console.log('Data restored successfully from backup');
  }
}

/**
 * Create a new native file storage service instance
 */
export function createNativeFileStorage(): NativeFileStorageService {
  return new NativeFileStorageService();
}
