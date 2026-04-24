import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

export const queryKeys = {
  timesheet: {
    all: () => ['timesheet'] as const,
    monthly: (year: number, month: number) => ['timesheet', 'monthly', year, month] as const,
    day: (date: string) => ['timesheet', 'day', date] as const,
    participatedProjects: () => ['timesheet', 'participated-projects'] as const,
  },
  projects: {
    all: () => ['projects'] as const,
  },
  categories: {
    all: () => ['categories'] as const,
  },
  approval: {
    pending: () => ['approval', 'pending'] as const,
  },
  dashboard: {
    health: () => ['dashboard', 'health'] as const,
  },
  admin: {
    settings: () => ['admin', 'settings'] as const,
  },
  memberReport: {
    all: () => ['member-report'] as const,
  },
  projectReport: {
    all: () => ['project-report'] as const,
  },
  projectDetail: {
    current: (projectId: string) => ['project-detail', projectId] as const,
  },
  projectMembers: {
    current: (projectId: string) => ['project-members', projectId] as const,
  },
  orgReport: {
    all: () => ['org-report'] as const,
  },
  orgLog: {
    all: () => ['org-log'] as const,
  },
  orgAccess: {
    current: (userId: string | null) => ['org-access', userId] as const,
  },
};
