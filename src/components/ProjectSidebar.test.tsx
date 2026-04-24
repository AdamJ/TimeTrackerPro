import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ProjectSidebar from './ProjectSidebar';

vi.mock('@/lib/embed', () => ({
  isSaTimeEmbedded: () => false,
}));

vi.mock('@/hooks/useAdminSidebarData', () => ({
  useAdminSidebarData: () => ({
    isLoading: false,
    data: {
      organizationName: '测试组织',
      members: [],
      activeProjects: [
        { id: 'p1', name: 'Alpha', status: 'active', color: '#22C55E' },
        { id: 'p2', name: 'Beta', status: 'active', color: '#3B82F6' },
        { id: 'p3', name: 'Gamma', status: 'active', color: '#EF4444' },
      ],
      archivedProjects: [
        { id: 'p4', name: 'Archived', status: 'archived', color: '#999999' },
      ],
    },
  }),
}));

vi.mock('@/hooks/useTimesheetData', () => ({
  useParticipatedProjects: () => ({
    data: [
      { projectId: 'p2', projectName: 'Beta', usedAt: '2026-04-24T12:00:00.000Z' },
    ],
  }),
}));

describe('ProjectSidebar project grouping', () => {
  it('splits projects into participated and other project groups', () => {
    render(
      <ProjectSidebar
        activeView="calendar"
        onViewChange={vi.fn()}
        selectedProjectId={null}
        onProjectSelect={vi.fn()}
      />
    );

    const participatedGroup = screen.getByTestId('participated-projects');
    const otherGroup = screen.getByTestId('other-projects');

    expect(screen.getByText('参与过的项目')).toBeInTheDocument();
    expect(screen.getByText('其他项目')).toBeInTheDocument();
    expect(screen.queryByText('归档的项目')).not.toBeInTheDocument();

    expect(within(participatedGroup).getByText('Beta')).toBeInTheDocument();
    expect(within(participatedGroup).queryByText('Alpha')).not.toBeInTheDocument();
    expect(within(participatedGroup).queryByText('Gamma')).not.toBeInTheDocument();

    expect(within(otherGroup).getByText('Alpha')).toBeInTheDocument();
    expect(within(otherGroup).getByText('Gamma')).toBeInTheDocument();
    expect(within(otherGroup).queryByText('Beta')).not.toBeInTheDocument();
  });

  it('collapses and expands each project group from the group header button', () => {
    render(
      <ProjectSidebar
        activeView="calendar"
        onViewChange={vi.fn()}
        selectedProjectId={null}
        onProjectSelect={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /其他项目/i }));
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /其他项目/i }));
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /参与过的项目/i }));
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });
});
