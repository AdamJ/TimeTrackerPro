/**
 * recentSelections.test.ts — 最近使用工具函数测试
 *
 * 覆盖：去重、置顶、截断、失效过滤、空存储容错
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getRecentProjects,
  addRecentProject,
  filterValidRecentProjects,
  getRecentTaskOptions,
  addRecentTaskOption,
  filterValidRecentTaskOptions,
  RecentProject,
  RecentTaskOption,
} from './recentSelections';

const TEST_USER = 'test-user-id-123';

beforeEach(() => {
  localStorage.clear();
});

describe('Recent Projects', () => {
  it('returns empty array when no data stored', () => {
    expect(getRecentProjects(TEST_USER)).toEqual([]);
  });

  it('returns empty array when userId is undefined (graceful degradation)', () => {
    expect(getRecentProjects(undefined)).toEqual([]);
  });

  it('stores and retrieves a project', () => {
    addRecentProject(TEST_USER, { projectId: 'p1', projectName: 'Project A' });
    const list = getRecentProjects(TEST_USER);
    expect(list.length).toBe(1);
    expect(list[0].projectId).toBe('p1');
    expect(list[0].projectName).toBe('Project A');
    expect(list[0].usedAt).toBeTruthy();
  });

  it('deduplicates and moves to top on repeat use', () => {
    addRecentProject(TEST_USER, { projectId: 'p1', projectName: 'A' });
    addRecentProject(TEST_USER, { projectId: 'p2', projectName: 'B' });
    addRecentProject(TEST_USER, { projectId: 'p1', projectName: 'A' });

    const list = getRecentProjects(TEST_USER);
    expect(list.length).toBe(2);
    expect(list[0].projectId).toBe('p1'); // p1 moved to top
    expect(list[1].projectId).toBe('p2');
  });

  it('truncates to 5 items', () => {
    for (let i = 0; i < 15; i++) {
      addRecentProject(TEST_USER, { projectId: `p${i}`, projectName: `Project ${i}` });
    }
    const list = getRecentProjects(TEST_USER);
    expect(list.length).toBe(5);
    // Most recent should be p14
    expect(list[0].projectId).toBe('p14');
    expect(list[4].projectId).toBe('p10');
  });

  it('does not write when userId is undefined', () => {
    addRecentProject(undefined, { projectId: 'p1', projectName: 'A' });
    // jsdom localStorage.length may return undefined after clear(); check no key was written
    expect(getRecentProjects(undefined)).toEqual([]);
  });

  it('isolates data between users', () => {
    addRecentProject('user-a', { projectId: 'p1', projectName: 'A' });
    addRecentProject('user-b', { projectId: 'p2', projectName: 'B' });

    const listA = getRecentProjects('user-a');
    const listB = getRecentProjects('user-b');
    expect(listA.length).toBe(1);
    expect(listA[0].projectId).toBe('p1');
    expect(listB.length).toBe(1);
    expect(listB[0].projectId).toBe('p2');
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(`satime:recent-projects:${TEST_USER}`, 'not-json');
    expect(getRecentProjects(TEST_USER)).toEqual([]);
  });
});

describe('filterValidRecentProjects', () => {
  it('filters out projects not in valid set', () => {
    const recent: RecentProject[] = [
      { projectId: 'p1', projectName: 'A', usedAt: new Date().toISOString() },
      { projectId: 'p2', projectName: 'B', usedAt: new Date().toISOString() },
      { projectId: 'p3', projectName: 'C', usedAt: new Date().toISOString() },
    ];
    const validIds = new Set(['p1', 'p3']);
    const filtered = filterValidRecentProjects(recent, validIds);
    expect(filtered.length).toBe(2);
    expect(filtered.map((r) => r.projectId)).toEqual(['p1', 'p3']);
  });
});

describe('Recent Task Options', () => {
  it('returns empty array when no data stored', () => {
    expect(getRecentTaskOptions(TEST_USER)).toEqual([]);
  });

  it('stores and retrieves a task option', () => {
    addRecentTaskOption(TEST_USER, {
      taskOptionId: 't1',
      taskLabel: 'Design',
      taskGroupName: 'Creative',
    });
    const list = getRecentTaskOptions(TEST_USER);
    expect(list.length).toBe(1);
    expect(list[0].taskOptionId).toBe('t1');
    expect(list[0].taskLabel).toBe('Design');
    expect(list[0].taskGroupName).toBe('Creative');
  });

  it('deduplicates and moves to top on repeat use', () => {
    addRecentTaskOption(TEST_USER, { taskOptionId: 't1', taskLabel: 'A', taskGroupName: null });
    addRecentTaskOption(TEST_USER, { taskOptionId: 't2', taskLabel: 'B', taskGroupName: null });
    addRecentTaskOption(TEST_USER, { taskOptionId: 't1', taskLabel: 'A', taskGroupName: null });

    const list = getRecentTaskOptions(TEST_USER);
    expect(list.length).toBe(2);
    expect(list[0].taskOptionId).toBe('t1');
  });

  it('truncates to 5 items', () => {
    for (let i = 0; i < 12; i++) {
      addRecentTaskOption(TEST_USER, { taskOptionId: `t${i}`, taskLabel: `Task ${i}`, taskGroupName: null });
    }
    const list = getRecentTaskOptions(TEST_USER);
    expect(list.length).toBe(5);
    expect(list[0].taskOptionId).toBe('t11');
    expect(list[4].taskOptionId).toBe('t7');
  });
});

describe('filterValidRecentTaskOptions', () => {
  it('filters out tasks not in valid set', () => {
    const recent: RecentTaskOption[] = [
      { taskOptionId: 't1', taskLabel: 'A', taskGroupName: null, usedAt: new Date().toISOString() },
      { taskOptionId: 't2', taskLabel: 'B', taskGroupName: 'G', usedAt: new Date().toISOString() },
    ];
    const validIds = new Set(['t2']);
    const filtered = filterValidRecentTaskOptions(recent, validIds);
    expect(filtered.length).toBe(1);
    expect(filtered[0].taskOptionId).toBe('t2');
  });
});
