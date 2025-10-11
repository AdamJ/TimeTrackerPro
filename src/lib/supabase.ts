import { createClient, User } from '@supabase/supabase-js';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars not found. Supabase sync will be disabled.');
} else {
  console.log('✅ Supabase configured:', {
    url: SUPABASE_URL,
    hasKey: !!SUPABASE_ANON_KEY
  });
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
    console.log('👤 Using cached user:', cachedUser.id);
    return cachedUser;
  }

  // Fetch fresh user data
  console.log('🔄 Fetching fresh user data...');
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
  console.log('✅ User cached:', user.id);

  return user;
};

// Clear user cache (call when user logs out or auth state changes)
export const clearUserCache = () => {
  console.log('🗑️ Clearing user cache');
  cachedUser = null;
  lastUserCheck = null;
  // Also clear data caches
  clearDataCaches();
};

// Force refresh user cache (call when needed)
export const refreshUserCache = async (): Promise<User> => {
  console.log('🔄 Force refreshing user cache...');
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

let cachedProjects: Project[] | null = null;
let cachedCategories: TaskCategory[] | null = null;
let lastProjectsCheck: Date | null = null;
let lastCategoriesCheck: Date | null = null;
const DATA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCachedProjects = async (): Promise<Project[] | null> => {
  const now = new Date();

  // Check if cache is still valid
  if (cachedProjects && lastProjectsCheck &&
      (now.getTime() - lastProjectsCheck.getTime()) < DATA_CACHE_DURATION) {
    console.log('📋 Using cached projects:', cachedProjects.length);
    return cachedProjects;
  }

  return null; // Cache miss
};

export const setCachedProjects = (projects: Project[]) => {
  cachedProjects = projects;
  lastProjectsCheck = new Date();
  console.log('📋 Projects cached:', projects.length);
};

export const getCachedCategories = async (): Promise<TaskCategory[] | null> => {
  const now = new Date();

  // Check if cache is still valid
  if (cachedCategories && lastCategoriesCheck &&
      (now.getTime() - lastCategoriesCheck.getTime()) < DATA_CACHE_DURATION) {
    console.log('🏷️ Using cached categories:', cachedCategories.length);
    return cachedCategories;
  }

  return null; // Cache miss
};

export const setCachedCategories = (categories: TaskCategory[]) => {
  cachedCategories = categories;
  lastCategoriesCheck = new Date();
  console.log('🏷️ Categories cached:', categories.length);
};

export const clearDataCaches = () => {
  console.log('🗑️ Clearing data caches');
  cachedProjects = null;
  cachedCategories = null;
  lastProjectsCheck = null;
  lastCategoriesCheck = null;
};

// Database call monitoring with enhanced tracking
let dbCallCount = 0;
let authCallCount = 0;
let dbCallLog: Array<{timestamp: Date, operation: string, table?: string, source?: string}> = [];

export const trackDbCall = (operation: string, table?: string, source?: string) => {
  dbCallCount++;
  const timestamp = new Date();
  const logEntry = {
    timestamp,
    operation,
    table,
    source: source || new Error().stack?.split('\n')[2]?.trim() // Capture call stack for debugging
  };

  dbCallLog.push(logEntry);

  // Keep only the last 100 calls to prevent memory leaks
  if (dbCallLog.length > 100) {
    dbCallLog = dbCallLog.slice(-100);
  }

  console.log(`📊 DB Call #${dbCallCount}: ${operation}${table ? ` on ${table}` : ''}${source ? ` from ${source}` : ''} at ${timestamp.toLocaleTimeString()}`);
};

export const trackAuthCall = (operation: string, source?: string) => {
  authCallCount++;
  const timestamp = new Date();
  console.log(`🔐 Auth Call #${authCallCount}: ${operation}${source ? ` from ${source}` : ''} at ${timestamp.toLocaleTimeString()}`);
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
  console.log('📊 DB and Auth call stats reset');
};

// Make these functions available globally for debugging
if (typeof window !== 'undefined') {
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
