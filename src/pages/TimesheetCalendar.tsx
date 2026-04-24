/**
 * TimesheetCalendar — 回溯式工时日历
 *
 * Phase 2 核心交付件：7 列月度日历矩阵 + 极简填报弹窗
 * 完全基于 React Query hooks，不依赖 TimeTrackingContext
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Clock, Pencil, Trash2, CalendarDays, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SiteNavigationMenu from '@/components/Navigation';
import ProjectSidebar from '@/components/ProjectSidebar';
import ReportTabView from '@/components/ReportTabView';
import { useMonthlyTimesheet, useSubmitManualEntry, useDeleteManualEntry, useDayEntries, useParticipatedProjects, DeleteManualEntryInput } from '@/hooks/useTimesheetData';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { DailyTimesheetEntry, ParticipatedProjectOption } from '@/services/dataService';
import { useLocation } from 'react-router-dom';
import { getHolidayEntry } from '@/config/holidays';
import {
  getRecentTaskOptions,
  addRecentTaskOption,
  filterValidRecentTaskOptions,
} from '@/utils/recentSelections';

// ===== 日历算法 =====

function getCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  // 以周一为起始日（0=Mon ... 6=Sun）
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

  // 上月尾部填充
  for (let i = startDow - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = month - 1 <= 0 ? 12 : month - 1;
    const y = month - 1 <= 0 ? year - 1 : year;
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }

  // 本月
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, isCurrentMonth: true });
  }

  // 下月头部填充到 42 格（6行）
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month + 1 > 12 ? 1 : month + 1;
    const y = month + 1 > 12 ? year + 1 : year;
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }

  return cells;
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isWeekend(year: number, month: number, day: number) {
  const d = new Date(year, month - 1, day).getDay();
  return d === 0 || d === 6;
}

function isToday(year: number, month: number, day: number) {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const SHOW_CALENDAR_INTENT_KEY = 'satime:show-calendar-intent';

// ===== 项目颜色映射 =====
const PROJECT_COLORS = [
  '#53BD8C', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899',
  '#14B8A6', '#F97316', '#6366F1', '#EF4444', '#06B6D4',
];

interface QuickFillProjectOption {
  id: string;
  name: string;
}

interface QuickFillTaskOption {
  id: string;
  label: string;
  groupName: string | null;
}

function getProjectColor(name: string, index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

// ===== 主组件 =====

export default function TimesheetCalendar() {
  const now = new Date();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isQuickFillOpen, setIsQuickFillOpen] = useState(false);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);

  // 视图切换 + 项目筛选
  const [activeView, setActiveView] = useState<'report' | 'calendar'>('report');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const showCalendarView = useCallback(() => {
    setIsDayDetailOpen(false);
    setIsQuickFillOpen(false);
    setActiveView('calendar');
  }, []);

  // URL hash → 视图切换（兼容旧入口）
  useEffect(() => {
    if (location.hash === '#calendar') {
      setActiveView('calendar');
      setIsQuickFillOpen(false);
    }
  }, [location.hash]);

  useEffect(() => {
    const handleShowCalendar = () => {
      showCalendarView();
    };

    window.addEventListener('satime:show-calendar', handleShowCalendar);
    return () => {
      window.removeEventListener('satime:show-calendar', handleShowCalendar);
    };
  }, [showCalendarView]);

  useEffect(() => {
    try {
      const shouldShowCalendar = sessionStorage.getItem(SHOW_CALENDAR_INTENT_KEY) === '1';
      if (!shouldShowCalendar) return;

      sessionStorage.removeItem(SHOW_CALENDAR_INTENT_KEY);
      showCalendarView();
    } catch {
      // Ignore storage failures; direct event dispatch already covers in-page transitions.
    }
  }, [location.key, showCalendarView]);



  // 数据 hooks
  const { data: monthData, isLoading, error } = useMonthlyTimesheet(viewYear, viewMonth);
  const { data: dayEntries } = useDayEntries(selectedDate);
  const { data: participatedProjects = [] } = useParticipatedProjects();
  const submitMutation = useSubmitManualEntry();
  const deleteMutation = useDeleteManualEntry();
  const { data: orgProjects = [] } = useQuery({
    queryKey: ['timesheet', 'quick-fill', 'projects'],
    queryFn: async (): Promise<QuickFillProjectOption[]> => {
      const { data, error } = await supabase
        .schema('time_tracker')
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data ?? []).map((project) => ({
        id: project.id,
        name: project.name,
      }));
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const { data: taskOptions = [] } = useQuery({
    queryKey: ['timesheet', 'quick-fill', 'task-templates'],
    queryFn: async (): Promise<QuickFillTaskOption[]> => {
      const { data, error } = await supabase
        .schema('time_tracker')
        .from('task_templates')
        .select('id, task_name, group_name')
        .eq('is_active', true)
        .order('group_name', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data ?? []).map((task) => ({
        id: task.id,
        label: task.task_name,
        groupName: task.group_name ?? null,
      }));
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  // 按日期索引月数据
  const dayDataMap = useMemo(() => {
    const map = new Map<string, DailyTimesheetEntry>();
    if (monthData) {
      for (const day of monthData) {
        map.set(day.date, day);
      }
    }
    return map;
  }, [monthData]);

  // 项目颜色映射
  const projectColorMap = useMemo(() => {
    const map = new Map<string, string>();
    orgProjects.forEach((p, i) => {
      map.set(p.name, getProjectColor(p.name, i));
    });
    return map;
  }, [orgProjects]);

  // 月份导航
  const goToPrevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const goToToday = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth() + 1);
  };

  // 日历网格
  const calendarCells = useMemo(() => getCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // 月度统计
  const monthStats = useMemo(() => {
    if (!monthData) return { totalHours: 0, daysWorked: 0, avgHours: 0, pendingCount: 0 };
    const totalHours = monthData.reduce((sum, d) => sum + d.totalHours, 0);
    const daysWorked = monthData.length;
    const pendingCount = monthData.reduce((sum, d) =>
      sum + d.entries.filter(e => e.approvalStatus === 'pending').length, 0
    );
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      daysWorked,
      avgHours: daysWorked > 0 ? Math.round((totalHours / daysWorked) * 10) / 10 : 0,
      pendingCount,
    };
  }, [monthData]);

  // 点击日期格：有数据→详情弹窗（可删除）；无数据→快速填报
  const handleCellClick = useCallback((dateKey: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    setSelectedDate(dateKey);
    const hasData = dayDataMap.has(dateKey) && (dayDataMap.get(dateKey)!.entries.length > 0);
    if (hasData) {
      setIsDayDetailOpen(true);
    } else {
      setIsQuickFillOpen(true);
    }
  }, [dayDataMap]);

  // 快捷填报弹窗
  const openQuickFill = useCallback((date?: string) => {
    if (date) setSelectedDate(date);
    setIsDayDetailOpen(false);
    setIsQuickFillOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteNavigationMenu />

      <div className="flex">
        {/* 左侧边栏 */}
        <ProjectSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          selectedProjectId={selectedProjectId}
          onProjectSelect={setSelectedProjectId}
        />

        {/* 主内容区 */}
        {activeView === 'report' ? (
          <ReportTabView
            selectedProjectId={selectedProjectId}
            onStartFill={showCalendarView}
          />
        ) : (
          /* 日历视图 */
          <div className="flex-1 overflow-y-auto">
            <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">

              {/* 页头 */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-[#111]" />
                    工时日历
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    回溯式工时填报，随时补录、修改、追溯
                  </p>
                </div>
              </div>

              {/* 月份切换 + 日历 */}
              <Card className="tc-card overflow-hidden">
                {/* 月份导航条 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                  <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground">
                      {viewYear}年{viewMonth}月
                    </h2>
                    <Button variant="outline" size="sm" onClick={goToToday} className="text-xs h-7">
                      今天
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>

                {/* 星期表头 */}
                <div className="grid grid-cols-7 border-b border-border">
                  {WEEKDAY_LABELS.map((label, i) => (
                    <div
                      key={label}
                      className={`text-center text-xs font-medium py-2 ${
                        i >= 5 ? 'text-muted-foreground/60 bg-muted/20' : 'text-muted-foreground'
                      }`}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* 日历网格 */}
                {isLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#111] border-t-transparent"></div>
                  </div>
                ) : error ? (
                  <div className="h-96 flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <AlertCircle className="w-8 h-8" />
                    <p>加载失败，请刷新重试</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-7">
                    {calendarCells.map((cell, idx) => {
                      const dateKey = toDateKey(cell.year, cell.month, cell.day);
                      const dayData = dayDataMap.get(dateKey);
                      const weekend = isWeekend(cell.year, cell.month, cell.day);
                      const today = isToday(cell.year, cell.month, cell.day);

                      // 功能2: 节假日状态判定
                      const holidayEntry = getHolidayEntry(dateKey);
                      const isHoliday = holidayEntry?.isOffDay === true;
                      const isWorkdayOverride = holidayEntry?.isOffDay === false;
                      const isRestDay = isHoliday || (weekend && !isWorkdayOverride);
                      const holidayName = isHoliday ? holidayEntry!.name : null;

                      return (
                        <CalendarCell
                          key={idx}
                          day={cell.day}
                          isCurrentMonth={cell.isCurrentMonth}
                          isWeekend={weekend}
                          isRestDay={isRestDay}
                          isWorkdayOverride={isWorkdayOverride}
                          holidayName={holidayName}
                          isToday={today}
                          dayData={dayData}
                          projectColorMap={projectColorMap}
                          onClick={() => handleCellClick(dateKey, cell.isCurrentMonth)}
                          onQuickFill={() => openQuickFill(dateKey)}
                        />
                      );
                    })}
                  </div>
                )}
              </Card>

            </main>
          </div>
        )}
      </div>

      {/* 日期详情弹窗 */}
      <DayDetailDialog
        isOpen={isDayDetailOpen}
        onClose={() => setIsDayDetailOpen(false)}
        date={selectedDate}
        dayEntries={dayEntries || []}
        projectColorMap={projectColorMap}
        onAddEntry={() => openQuickFill()}
        onDeleteEntry={(entry) => deleteMutation.mutate(entry)}
      />

      {/* 快速填报弹窗 */}
      <QuickFillDialog
        isOpen={isQuickFillOpen}
        onClose={() => setIsQuickFillOpen(false)}
        date={selectedDate}
        projects={orgProjects}
        participatedProjects={participatedProjects}
        taskOptions={taskOptions}
        userId={user?.id}
        onSubmit={(entry) => submitMutation.mutateAsync(entry)}
        isSubmitting={submitMutation.isPending}
      />
    </div>
  );
}

// ===== 统计卡片 =====

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-amber-200 bg-amber-50/50' : 'border-border bg-card'}`}>
      <div className={`text-xl font-bold ${accent ? 'text-amber-600' : 'text-foreground'}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

// ===== 日历格子 =====

export function CalendarCell({
  day, isCurrentMonth, isWeekend, isRestDay, isWorkdayOverride, holidayName, isToday, dayData, projectColorMap, onClick, onQuickFill
}: {
  day: number;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isRestDay: boolean;
  isWorkdayOverride: boolean;
  holidayName: string | null;
  isToday: boolean;
  dayData?: DailyTimesheetEntry;
  projectColorMap: Map<string, string>;
  onClick: () => void;
  onQuickFill: () => void;
}) {
  const hasData = dayData && dayData.entries.length > 0;
  const overEightHours = dayData && dayData.totalHours > 8;

  // 功能5: 异常判定
  const hasEntries = !!dayData && dayData.entries.length > 0;
  const isOvertime = !!dayData && dayData.totalHours > 8;
  const isRestWork = isRestDay && hasEntries;
  const isAnomaly = isOvertime || isRestWork;

  // 功能5: 异常样式 — 工作日超时用浅红底+红环，休息日异常仅叠红环保留灰底
  const anomalyRing = isAnomaly ? 'ring-2 ring-inset ring-red-400/70' : '';
  const anomalyBg = isAnomaly && !isRestDay ? 'bg-red-50/30' : '';

  return (
    <div
      className={`
        relative min-h-[100px] border-b border-r border-border p-1.5 cursor-pointer
        transition-colors group
        ${!isCurrentMonth ? 'opacity-30 pointer-events-none' : ''}
        ${isRestDay ? 'bg-muted/20' : 'bg-card'}
        ${anomalyBg}
        ${isAnomaly ? anomalyRing : ''}
        ${!isAnomaly && isToday ? 'ring-2 ring-inset ring-[#111]/60' : ''}
        ${isAnomaly && isToday ? 'ring-2 ring-inset ring-red-500' : ''}
        hover:bg-gray-50/40
      `}
      onClick={onClick}
    >
      {/* 日期数字 */}
      <div className="flex items-center justify-between mb-1">
        <span className={`
          text-sm font-medium leading-none
          ${isToday ? 'bg-[#111] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs' : ''}
          ${!isToday && isRestDay ? 'text-muted-foreground/60' : ''}
          ${!isToday && !isRestDay ? 'text-foreground' : ''}
        `}>
          {day}
        </span>
        {/* 调休工作日角标 */}
        {isWorkdayOverride && (
          <span className="text-[9px] font-medium text-orange-500 leading-none">班</span>
        )}
        {/* 悬浮时显示 + 按钮 */}
        {isCurrentMonth && (
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-[#111] text-white flex items-center justify-center hover:bg-[#333]"
            onClick={(e) => { e.stopPropagation(); onQuickFill(); }}
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 节假日名称标签 */}
      {holidayName && !hasData && (
        <div className="text-[9px] text-muted-foreground/70 leading-tight px-0.5 truncate">
          {holidayName}
        </div>
      )}

      {/* 项目胶囊 */}
      {hasData && (
        <div className="space-y-0.5 overflow-hidden">
          {dayData.entries.slice(0, 3).map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-1 text-[10px] leading-tight rounded px-1 py-0.5 truncate"
              style={{ backgroundColor: `${projectColorMap.get(entry.projectName) || '#94A3B8'}18` }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: projectColorMap.get(entry.projectName) || '#94A3B8' }}
              />
              <span className="truncate text-foreground/80">{entry.projectName}</span>
              {entry.isAutoTime ? (
                <span className="rounded bg-amber-500 px-1 py-0.5 text-[9px] font-semibold text-white flex-shrink-0">
                  AUTO
                </span>
              ) : null}
              <span className="ml-auto font-medium text-foreground/60 flex-shrink-0">{entry.hours}h</span>
            </div>
          ))}
          {dayData.entries.length > 3 && (
            <div className="text-[10px] text-muted-foreground px-1">+{dayData.entries.length - 3} 更多</div>
          )}
        </div>
      )}

      {/* 节假日名称（有工时数据时显示在胶囊下方） */}
      {holidayName && hasData && (
        <div className="text-[9px] text-muted-foreground/70 leading-tight px-0.5 mt-0.5 truncate">
          {holidayName}
        </div>
      )}

      {/* 日合计 */}
      {hasData && (
        <div className={`absolute bottom-1 right-1.5 text-[10px] font-semibold ${overEightHours ? 'text-red-500' : 'text-[#111]'}`}>
          {Math.round(dayData.totalHours * 10) / 10}h
        </div>
      )}
    </div>
  );
}

// ===== 日期详情弹窗 =====

export function DayDetailDialog({
  isOpen, onClose, date, dayEntries, projectColorMap, onAddEntry, onDeleteEntry
}: {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  dayEntries: any[];
  projectColorMap: Map<string, string>;
  onAddEntry: () => void;
  onDeleteEntry: (entry: DeleteManualEntryInput) => void;
}) {
  if (!date) return null;

  const formatted = new Date(date + 'T00:00:00').toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });

  const totalHours = dayEntries.reduce((sum: number, t: any) => {
    const h = t.hours ?? ((t.duration || 0) / 3600000);
    return sum + h;
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#111]" />
            {formatted}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {dayEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无工时记录</p>
            </div>
          ) : (
            dayEntries.map((task: any) => {
              const hours = task.hours ?? ((task.duration || 0) / 3600000);
              const isManual = task.entry_type === 'manual';
              const isPending = task.approval_status === 'pending';
              const color = projectColorMap.get(task.project || '') || '#94A3B8';

              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{task.project || '未分类'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isManual ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isManual ? '✏️ 手动' : '⏱ 计时器'}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-foreground">{Math.round(hours * 100) / 100}h</span>
                      {task.approval_status !== 'pending' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          task.approval_status === 'approved'
                            ? 'bg-gray-100 text-[#111]'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {task.approval_status === 'approved' ? '✅ 已审批' : '❌ 已驳回'}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* 操作按钮 — 仅 manual + pending 可删除 */}
                  {isManual && isPending && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-500"
                      onClick={() => onDeleteEntry({
                        taskId: task.id,
                        workDate: date,
                        hours,
                      })}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="flex-row justify-between items-center gap-2 sm:justify-between">
          <div className="text-sm text-muted-foreground">
            合计 <span className="font-semibold text-foreground">{Math.round(totalHours * 100) / 100}h</span>
          </div>
          <Button onClick={onAddEntry} className="tc-btn-primary">
            <Plus className="w-4 h-4 mr-1" /> 添加工时
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== 快速填报弹窗 =====

const QUICK_HOURS = [2, 4, 8];

export function QuickFillDialog({
  isOpen, onClose, date, projects, participatedProjects, taskOptions, userId, onSubmit, isSubmitting
}: {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  projects: QuickFillProjectOption[];
  participatedProjects: ParticipatedProjectOption[];
  taskOptions: QuickFillTaskOption[];
  userId: string | undefined;
  onSubmit: (entry: any) => Promise<unknown>;
  isSubmitting: boolean;
}) {
  const [projectId, setProjectId] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [taskOptionId, setTaskOptionId] = useState('');
  const [hours, setHours] = useState('8');
  const [recentTaskOptions, setRecentTaskOptions] = useState<ReturnType<typeof getRecentTaskOptions>>([]);

  // 功能1: 参与过的项目 — 有效项目/任务 ID 集合
  const validProjectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);
  const validTaskIds = useMemo(() => new Set(taskOptions.map((t) => t.id)), [taskOptions]);

  const validParticipatedProjects = useMemo(() => {
    return participatedProjects.filter((project) => validProjectIds.has(project.projectId));
  }, [participatedProjects, validProjectIds]);

  useEffect(() => {
    setRecentTaskOptions(filterValidRecentTaskOptions(getRecentTaskOptions(userId), validTaskIds));
  }, [isOpen, userId, validTaskIds]);

  // 功能1: 参与过的项目 — 默认选中优先参与过项目
  useEffect(() => {
    if (!projectId && projects.length > 0) {
      const firstParticipated = validParticipatedProjects[0];
      setProjectId(firstParticipated ? firstParticipated.projectId : projects[0].id);
    }
  }, [projectId, projects, validParticipatedProjects]);

  useEffect(() => {
    if (!taskOptionId && taskOptions.length > 0) {
      const firstRecent = recentTaskOptions[0];
      setTaskOptionId(firstRecent ? firstRecent.taskOptionId : taskOptions[0].id);
    }
  }, [taskOptionId, taskOptions, recentTaskOptions]);

  // 功能1: 项目搜索 — 搜索时不显示最近分组
  const isSearching = projectSearch.trim().length > 0;

  const filteredProjects = useMemo(() => {
    const keyword = projectSearch.trim().toLowerCase();
    if (!keyword) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(keyword));
  }, [projectSearch, projects]);

  useEffect(() => {
    if (!filteredProjects.some((project) => project.id === projectId)) {
      setProjectId(filteredProjects[0]?.id || '');
    }
  }, [filteredProjects, projectId]);

  // 功能1: 全部项目中去除已在参与过项目中的项
  const participatedProjectIds = useMemo(() => {
    return new Set(validParticipatedProjects.map((project) => project.projectId));
  }, [validParticipatedProjects]);
  const nonParticipatedProjects = useMemo(() => {
    if (isSearching) return filteredProjects;
    return filteredProjects.filter((p) => !participatedProjectIds.has(p.id));
  }, [filteredProjects, participatedProjectIds, isSearching]);

  const recentTaskIds = useMemo(() => new Set(recentTaskOptions.map((r) => r.taskOptionId)), [recentTaskOptions]);
  const nonRecentTasks = useMemo(() => {
    return taskOptions.filter((t) => !recentTaskIds.has(t.id));
  }, [taskOptions, recentTaskIds]);

  const handleSubmit = async () => {
    if (!projectId || !hours || !date) return;
    const selectedProject = projects.find((project) => project.id === projectId);
    if (!selectedProject) return;

    const selectedTaskOption = taskOptions.find((option) => option.id === taskOptionId);
    const taskLabel = selectedTaskOption?.label || '工时填报';
    const taskDescription = selectedTaskOption?.groupName
      ? `${selectedTaskOption.groupName} / ${taskLabel}`
      : taskLabel;

    try {
      await onSubmit({
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        categoryId: selectedTaskOption?.id,
        categoryName: taskLabel,
        workDate: date,
        hours: parseFloat(hours),
        description: taskDescription,
      });

      if (selectedTaskOption) {
        addRecentTaskOption(userId, {
          taskOptionId: selectedTaskOption.id,
          taskLabel: selectedTaskOption.label,
          taskGroupName: selectedTaskOption.groupName,
        });
      }

      setRecentTaskOptions(filterValidRecentTaskOptions(getRecentTaskOptions(userId), validTaskIds));
      setHours('8');
      onClose();
    } catch {
      // Errors are handled by the submit mutation/toast path.
    }
  };

  const formatted = date ? new Date(date + 'T00:00:00').toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  }) : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-[#111]" />
            填报工时 — {formatted}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 项目选择 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">项目 *</Label>
            <Input
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              placeholder="搜索项目"
              className="h-9"
            />
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="请选择项目" />
              </SelectTrigger>
              <SelectContent>
                {filteredProjects.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">没有匹配的项目</div>
                )}
                {!isSearching && validParticipatedProjects.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">参与过的项目</div>
                    {validParticipatedProjects.map((project) => (
                      <SelectItem key={`participated-${project.projectId}`} value={project.projectId}>
                        {project.projectName}
                      </SelectItem>
                    ))}
                    {nonParticipatedProjects.length > 0 && (
                      <div className="px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-t border-border mt-1 pt-1.5">全部项目</div>
                    )}
                  </>
                )}
                {(isSearching ? filteredProjects : (validParticipatedProjects.length > 0 ? nonParticipatedProjects : filteredProjects)).map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 工作内容选择 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">工作内容</Label>
            <Select value={taskOptionId} onValueChange={setTaskOptionId}>
              <SelectTrigger>
                <SelectValue placeholder="请选择工作内容" />
              </SelectTrigger>
              <SelectContent>
                {/* 功能1: 最近使用分组 */}
                {recentTaskOptions.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">最近使用</div>
                    {recentTaskOptions.map((rt) => (
                      <SelectItem key={`recent-${rt.taskOptionId}`} value={rt.taskOptionId}>
                        {rt.taskGroupName ? `${rt.taskGroupName} / ${rt.taskLabel}` : rt.taskLabel}
                      </SelectItem>
                    ))}
                    <div className="px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-t border-border mt-1 pt-1.5">全部工作内容</div>
                  </>
                )}
                {nonRecentTasks.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.groupName ? `${option.groupName} / ${option.label}` : option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 功能3: 快捷输入键 + 自定义输入 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">工时 (小时) *</Label>
            <div className="flex items-center gap-1.5 mb-1.5">
              {QUICK_HOURS.map((qh) => (
                <button
                  key={qh}
                  type="button"
                  onClick={() => setHours(String(qh))}
                  className={`
                    h-8 px-3 rounded-lg text-sm font-medium transition-colors
                    ${Number(hours) === qh
                      ? 'bg-[#111] text-white border border-[#111]'
                      : 'border border-border bg-card text-foreground hover:bg-muted/50'
                    }
                  `}
                >
                  {qh}
                </button>
              ))}
              <span className="text-xs text-muted-foreground ml-1">快捷</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="自定义..."
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground font-medium">h</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            onClick={handleSubmit}
            disabled={!projectId || !hours || parseFloat(hours) <= 0 || isSubmitting}
            className="tc-btn-primary"
          >
            {isSubmitting ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1.5" /> 提交中...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-1.5" /> 确认提交</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
