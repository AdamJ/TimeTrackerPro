/**
 * ProjectSidebar — 左侧项目导航边栏
 *
 * 显示当前项目、视图切换（报表/日历）、项目列表
 */

import React, { useMemo, useState } from 'react';
import { BarChart3, FolderOpen, ChevronDown } from 'lucide-react';
import { useAdminSidebarData } from '@/hooks/useAdminSidebarData';
import { useParticipatedProjects } from '@/hooks/useTimesheetData';
import { isSaTimeEmbedded } from '@/lib/embed';

interface ProjectSidebarProps {
  activeView: 'report' | 'calendar';
  onViewChange: (view: 'report' | 'calendar') => void;
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
}

export default function ProjectSidebar({
  activeView,
  onViewChange,
  selectedProjectId,
  onProjectSelect,
}: ProjectSidebarProps) {
  const embedded = isSaTimeEmbedded();
  const { data, isLoading } = useAdminSidebarData();
  const { data: participatedProjects = [] } = useParticipatedProjects();
  const [isParticipatedOpen, setIsParticipatedOpen] = useState(true);
  const [isOtherOpen, setIsOtherOpen] = useState(true);
  const activeProjects = data?.activeProjects ?? [];

  const activeProjectMap = useMemo(() => {
    return new Map(activeProjects.map((project) => [project.id, project]));
  }, [activeProjects]);

  const participatedSidebarProjects = useMemo(() => {
    return participatedProjects
      .map((project) => activeProjectMap.get(project.projectId))
      .filter((project): project is NonNullable<typeof project> => Boolean(project));
  }, [activeProjectMap, participatedProjects]);

  const participatedProjectIds = useMemo(() => {
    return new Set(participatedSidebarProjects.map((project) => project.id));
  }, [participatedSidebarProjects]);

  const otherProjects = useMemo(() => {
    return activeProjects.filter((project) => !participatedProjectIds.has(project.id));
  }, [activeProjects, participatedProjectIds]);

  return (
    <aside
      className={`flex w-[220px] flex-shrink-0 flex-col overflow-hidden border-r border-[#2a2a2a] bg-[#111111] text-gray-200 ${
        embedded ? 'h-screen' : 'h-[calc(100vh-56px)]'
      }`}
    >
      {/* 导航菜单 */}
      <nav className="space-y-0.5 border-b border-[#2a2a2a] px-2 pt-2 pb-3">
        <SidebarItem
          icon={<BarChart3 className="w-4 h-4" />}
          label="我的报表"
          active={activeView === 'report'}
          onClick={() => onViewChange('report')}
        />
      </nav>

      {/* 项目列表 */}
      <div className="flex min-h-0 flex-1 flex-col px-2 pt-2">
        <div className="px-2 pb-2 text-[10px] font-medium uppercase tracking-wider text-gray-500">
          项目列表
        </div>

        <div className="admin-sidebar-scrollbar min-h-0 flex-1 overflow-y-scroll pb-4">
          {/* 参与过的项目 */}
          <div className="mb-1" data-testid="participated-projects">
            <button
              type="button"
              aria-expanded={isParticipatedOpen}
              onClick={() => setIsParticipatedOpen((open) => !open)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-400 transition-colors hover:text-white"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${isParticipatedOpen ? '' : '-rotate-90'}`} />
              <FolderOpen className="w-3.5 h-3.5" />
              <span>参与过的项目</span>
            </button>
            {isParticipatedOpen && (
              <div className="pl-4 space-y-0.5">
                {isLoading && (
                  <div className="px-2 py-1.5 text-xs text-gray-500">正在加载项目...</div>
                )}
                {!isLoading && participatedSidebarProjects.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-gray-500">暂无参与过项目</div>
                )}
                {participatedSidebarProjects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      onProjectSelect(proj.id === selectedProjectId ? null : proj.id);
                      onViewChange('report');
                    }}
                    className={`
                      w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors
                      ${selectedProjectId === proj.id
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: proj.color }}
                    />
                    <span className="truncate">{proj.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 其他项目 */}
          <div data-testid="other-projects">
            <button
              type="button"
              aria-expanded={isOtherOpen}
              onClick={() => setIsOtherOpen((open) => !open)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-400 transition-colors hover:text-white"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${isOtherOpen ? '' : '-rotate-90'}`} />
              <FolderOpen className="w-3.5 h-3.5" />
              <span>其他项目</span>
            </button>
            {isOtherOpen && (
              <div className="pl-4 space-y-0.5">
                {!isLoading && otherProjects.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-gray-500">暂无其他项目</div>
                )}
                {otherProjects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      onProjectSelect(proj.id === selectedProjectId ? null : proj.id);
                      onViewChange('report');
                    }}
                    className={`
                      w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors
                      ${selectedProjectId === proj.id
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: proj.color }}
                    />
                    <span className="truncate">{proj.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

// ===== 边栏导航项 =====

function SidebarItem({ icon, label, active, onClick }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
        ${active
          ? 'bg-white/10 text-white'
          : 'text-gray-300 hover:bg-white/5 hover:text-white'
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}
