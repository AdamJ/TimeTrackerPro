import { createClient, User } from '@supabase/supabase-js';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars not found. Supabase sync will be disabled.');
}

export const supabase = createClient(
  SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY ?? ''
);

// User caching to reduce authentication calls
let cachedUser: User | null = null;
let lastUserCheck: Date | null = null;
const USER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const getCachedUser = async (): Promise<User> => {
  const now = new Date();

  // Check if we have a cached user that's still valid
  if (cachedUser && lastUserCheck && (now.getTime() - lastUserCheck.getTime()) < USER_CACHE_DURATION) {
    return cachedUser;
  }

  // Fetch fresh user data
  const { data: { user }, error } = await supabase.auth.getUser();
  trackAuthCall('getUser', 'getCachedUser');

  if (error || !user) {
    cachedUser = null;
    lastUserCheck = null;
    throw new Error('User not authenticated');
  }

  // Cache the user
  cachedUser = user;
  lastUserCheck = now;

  return user;
};

// Clear user cache (call when user logs out or auth state changes)
export const clearUserCache = () => {
  cachedUser = null;
  lastUserCheck = null;
  // Also clear data caches
  clearDataCaches();
};

// Force refresh user cache (call when needed)
export const refreshUserCache = async (): Promise<User> => {
  clearUserCache();
  return await getCachedUser();
};

// Data caching for projects and categories
import { TaskCategory } from '@/config/categories';

interface Project {
  id: string;
  name: string;
  client: string;
  hourlyRate?: number;
  color?: string;
}

interface Client {
  id: string;
  name: string;
  archived: boolean;
  createdAt: string;
}

// Each cache entry is tagged with the user.id it was populated for. A get
// whose userId doesn't match the stored owner is treated as a miss, so a
// future code path that reads the cache without going through the
// auth-gated flow that clears it on sign-in/out can't serve user A's data
// to user B.
interface CacheEntry<T> {
  userId: string;
  data: T;
  checkedAt: Date;
}

let cachedProjects: CacheEntry<Project[]> | null = null;
let cachedCategories: CacheEntry<TaskCategory[]> | null = null;
let cachedClients: CacheEntry<Client[]> | null = null;
const DATA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const readCache = <T>(entry: CacheEntry<T> | null, userId: string): T | null => {
  if (entry && entry.userId === userId &&
      (Date.now() - entry.checkedAt.getTime()) < DATA_CACHE_DURATION) {
    return entry.data;
  }
  return null;
};

export const getCachedProjects = (userId: string): Project[] | null => readCache(cachedProjects, userId);

export const setCachedProjects = (projects: Project[], userId: string) => {
  cachedProjects = { userId, data: projects, checkedAt: new Date() };
};

export const getCachedCategories = (userId: string): TaskCategory[] | null => readCache(cachedCategories, userId);

export const setCachedCategories = (categories: TaskCategory[], userId: string) => {
  cachedCategories = { userId, data: categories, checkedAt: new Date() };
};

export const getCachedClients = (userId: string): Client[] | null => readCache(cachedClients, userId);

export const setCachedClients = (clients: Client[], userId: string) => {
  cachedClients = { userId, data: clients, checkedAt: new Date() };
};

export const clearDataCaches = () => {
  cachedProjects = null;
  cachedCategories = null;
  cachedClients = null;
};

// Database call monitoring with enhanced tracking
let dbCallCount = 0;
let authCallCount = 0;
let dbCallLog: Array<{timestamp: Date, operation: string, table?: string, source?: string}> = [];

// Enable verbose database logging only in development mode when explicitly enabled
const ENABLE_DB_LOGGING = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DB_LOGS === 'true';

export const trackDbCall = (operation: string, table?: string, source?: string) => {
  dbCallCount++;
  const timestamp = new Date();
  const logEntry = {
    timestamp,
    operation,
    table,
    source: source || (ENABLE_DB_LOGGING ? new Error().stack?.split('\n')[2]?.trim() : undefined)
  };

  dbCallLog.push(logEntry);

  // Keep only the last 100 calls to prevent memory leaks
  if (dbCallLog.length > 100) {
    dbCallLog = dbCallLog.slice(-100);
  }

};

export const trackAuthCall = (operation: string, source?: string) => {
  authCallCount++;
  const timestamp = new Date();
  const logEntry = {
    timestamp,
    operation,
    source: source || (ENABLE_DB_LOGGING ? new Error().stack?.split('\n')[2]?.trim() : undefined)
  };
  dbCallLog.push(logEntry);
  if (dbCallLog.length > 100) {
    dbCallLog = dbCallLog.slice(-100);
  }
};

export const getDbCallStats = () => {
  const now = Date.now();
  const last5Minutes = new Date(now - 5 * 60 * 1000);
  const last1Minute = new Date(now - 1 * 60 * 1000);
  const recentCalls = dbCallLog.filter(call => call.timestamp > last5Minutes);
  const veryRecentCalls = dbCallLog.filter(call => call.timestamp > last1Minute);

  // Group by operation and table
  const callsByType = dbCallLog.reduce((acc, call) => {
    const key = `${call.operation}${call.table ? `:${call.table}` : ''}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalDbCalls: dbCallCount,
    totalAuthCalls: authCallCount,
    last5Minutes: recentCalls.length,
    lastMinute: veryRecentCalls.length,
    callsPerMinute: Math.round((veryRecentCalls.length / 1) * 10) / 10,
    callsByType,
    lastCalls: dbCallLog.slice(-15).map(call => ({
      operation: call.operation,
      table: call.table,
      timestamp: call.timestamp.toLocaleTimeString(),
      source: call.source?.substring(0, 80) + '...' // Truncate long stack traces
    }))
  };
};

// Reset stats (useful for testing)
export const resetDbCallStats = () => {
  dbCallCount = 0;
  authCallCount = 0;
  dbCallLog = [];
};

// Make these functions available globally for debugging (development only)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as Window & typeof globalThis & {
    getDbCallStats: typeof getDbCallStats;
    resetDbCallStats: typeof resetDbCallStats;
    clearDbCallLog: typeof resetDbCallStats;
  }).getDbCallStats = getDbCallStats;
  (window as Window & typeof globalThis & {
    getDbCallStats: typeof getDbCallStats;
    resetDbCallStats: typeof resetDbCallStats;
    clearDbCallLog: typeof resetDbCallStats;
  }).resetDbCallStats = resetDbCallStats;
  (window as Window & typeof globalThis & {
    getDbCallStats: typeof getDbCallStats;
    resetDbCallStats: typeof resetDbCallStats;
    clearDbCallLog: typeof resetDbCallStats;
  }).clearDbCallLog = resetDbCallStats;
}
