/**
 * recentSelections.ts — 最近使用工具函数
 *
 * 双 LRU 列表：最近项目、最近任务模板
 * 存储在 localStorage，按用户维度隔离
 * 每类最多保留 5 条
 */

// ===== 类型定义 =====

export type RecentProject = {
  projectId: string;
  projectName: string;
  usedAt: string; // ISO string
};

export type RecentTaskOption = {
  taskOptionId: string;
  taskLabel: string;
  taskGroupName: string | null;
  usedAt: string; // ISO string
};

const MAX_RECENT = 5;

// ===== 通用存取 =====

function getStorageKey(prefix: string, userId: string | undefined): string | null {
  if (!userId) return null;
  return `${prefix}:${userId}`;
}

function readList<T>(key: string | null): T[] {
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string | null, list: T[]): void {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // localStorage 写入失败时静默降级
  }
}

// ===== 最近项目 =====

const PROJECT_PREFIX = 'satime:recent-projects';

export function getRecentProjects(userId: string | undefined): RecentProject[] {
  const key = getStorageKey(PROJECT_PREFIX, userId);
  return readList<RecentProject>(key);
}

/**
 * 记录一次项目使用。去重、置顶、截断至 MAX_RECENT。
 */
export function addRecentProject(userId: string | undefined, project: Omit<RecentProject, 'usedAt'>): void {
  const key = getStorageKey(PROJECT_PREFIX, userId);
  if (!key) return;

  const list = readList<RecentProject>(key);
  const filtered = list.filter((item) => item.projectId !== project.projectId);
  const newEntry: RecentProject = {
    ...project,
    usedAt: new Date().toISOString(),
  };
  const updated = [newEntry, ...filtered].slice(0, MAX_RECENT);
  writeList(key, updated);
}

/**
 * 过滤掉已不在有效列表中的项目（被停用/删除）。
 */
export function filterValidRecentProjects(
  recent: RecentProject[],
  validIds: Set<string>
): RecentProject[] {
  return recent.filter((item) => validIds.has(item.projectId));
}

// ===== 最近任务模板 =====

const TASK_PREFIX = 'satime:recent-task-options';

export function getRecentTaskOptions(userId: string | undefined): RecentTaskOption[] {
  const key = getStorageKey(TASK_PREFIX, userId);
  return readList<RecentTaskOption>(key);
}

/**
 * 记录一次任务模板使用。去重、置顶、截断至 MAX_RECENT。
 */
export function addRecentTaskOption(userId: string | undefined, task: Omit<RecentTaskOption, 'usedAt'>): void {
  const key = getStorageKey(TASK_PREFIX, userId);
  if (!key) return;

  const list = readList<RecentTaskOption>(key);
  const filtered = list.filter((item) => item.taskOptionId !== task.taskOptionId);
  const newEntry: RecentTaskOption = {
    ...task,
    usedAt: new Date().toISOString(),
  };
  const updated = [newEntry, ...filtered].slice(0, MAX_RECENT);
  writeList(key, updated);
}

/**
 * 过滤掉已不在有效列表中的任务模板（被停用/删除）。
 */
export function filterValidRecentTaskOptions(
  recent: RecentTaskOption[],
  validIds: Set<string>
): RecentTaskOption[] {
  return recent.filter((item) => validIds.has(item.taskOptionId));
}
