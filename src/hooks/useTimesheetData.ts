/**
 * useTimesheetData — 工时日历数据 Hooks
 *
 * 基于 React Query 的统一数据获取层，替代 TimeTrackingContext 中的
 * archivedDays 内存缓存。所有日历和首页图表通过这些 hooks 获取数据。
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { createDataService, ManualTimeEntry, DailyTimesheetEntry } from '@/services/dataService';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

export interface DeleteManualEntryInput {
	taskId: string;
	workDate: string;
	hours?: number;
}

/**
 * 获取指定月份的日历工时数据
 * 自动按月缓存，翻月时独立请求，30 秒内复用缓存
 */
export function useMonthlyTimesheet(year: number, month: number) {
	const { isAuthenticated } = useAuth();

	return useQuery({
		queryKey: queryKeys.timesheet.monthly(year, month),
		queryFn: () => {
			const ds = createDataService(isAuthenticated);
			return ds.getMonthlyTimesheet(year, month);
		},
		enabled: !!year && !!month,
	});
}

/**
 * 获取指定日期的详细工时记录
 */
export function useDayEntries(date: string | null) {
	const { isAuthenticated } = useAuth();

	return useQuery({
		queryKey: queryKeys.timesheet.day(date || ''),
		queryFn: () => {
			const ds = createDataService(isAuthenticated);
			return ds.getDayEntries(date!);
		},
		enabled: !!date,
	});
}

/**
 * 获取当前用户参与过的项目
 * 参与依据：当前用户曾经成功写入过该项目工时。
 */
export function useParticipatedProjects() {
	const { isAuthenticated } = useAuth();

	return useQuery({
		queryKey: queryKeys.timesheet.participatedProjects(),
		queryFn: () => {
			const ds = createDataService(isAuthenticated);
			return ds.getParticipatedProjects();
		},
		enabled: isAuthenticated,
		staleTime: 60_000,
	});
}

/**
 * 提交手动工时记录（乐观更新 + 自动失效缓存）
 */
export function useSubmitManualEntry() {
	const { isAuthenticated } = useAuth();
	const qc = useQueryClient();

	return useMutation({
		mutationFn: (entry: ManualTimeEntry) => {
			const ds = createDataService(isAuthenticated);
			return ds.submitManualEntry(entry);
		},
		onMutate: async (entry) => {
			// 乐观更新：立即在日历上显示新条目
			const d = new Date(entry.workDate);
			const key = queryKeys.timesheet.monthly(d.getFullYear(), d.getMonth() + 1);

			await qc.cancelQueries({ queryKey: key });
			const previous = qc.getQueryData<DailyTimesheetEntry[]>(key);

			if (previous) {
				const updated = [...previous];
				const dayIdx = updated.findIndex(day => day.date === entry.workDate);
				const newEntry = {
					projectName: entry.projectName,
					projectId: entry.projectId,
					hours: entry.hours,
					entryType: 'manual' as const,
					approvalStatus: 'pending' as const,
					taskId: `optimistic-${Date.now()}`,
					description: entry.description,
				};

				if (dayIdx >= 0) {
					updated[dayIdx] = {
						...updated[dayIdx],
						entries: [...updated[dayIdx].entries, newEntry],
						totalHours: updated[dayIdx].totalHours + entry.hours,
					};
				} else {
					updated.push({
						date: entry.workDate,
						totalHours: entry.hours,
						entries: [newEntry],
					});
				}

				qc.setQueryData(key, updated);
			}

			return { previous, key };
		},
		onError: (error, _entry, context) => {
			// 回滚乐观更新
			if (context?.previous) {
				qc.setQueryData(context.key, context.previous);
			}
			toast({
				title: '填报失败',
				description: error instanceof Error ? error.message : '网络异常，请重试',
				variant: 'destructive',
			});
		},
		onSuccess: (_data, variables) => {
			// 精确失效受影响的缓存
			const d = new Date(variables.workDate);
			qc.invalidateQueries({
				queryKey: queryKeys.timesheet.monthly(d.getFullYear(), d.getMonth() + 1),
			});
			qc.invalidateQueries({ queryKey: queryKeys.timesheet.day(variables.workDate) });
			qc.invalidateQueries({ queryKey: queryKeys.timesheet.participatedProjects() });
			qc.invalidateQueries({ queryKey: queryKeys.approval.pending() });

			toast({
				title: '填报成功',
				description: `${variables.workDate} 已录入 ${variables.hours}h`,
			});
		},
	});
}

/**
 * 更新手动工时记录
 */
export function useUpdateManualEntry() {
	const { isAuthenticated } = useAuth();
	const qc = useQueryClient();

	return useMutation({
		mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<ManualTimeEntry> }) => {
			const ds = createDataService(isAuthenticated);
			return ds.updateManualEntry(taskId, updates);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.timesheet.all() });
			qc.invalidateQueries({ queryKey: queryKeys.timesheet.participatedProjects() });
			qc.invalidateQueries({ queryKey: queryKeys.approval.pending() });
			toast({ title: '更新成功' });
		},
		onError: () => {
			toast({ title: '更新失败', variant: 'destructive' });
		},
	});
}

/**
 * 删除手动工时记录
 */
export function useDeleteManualEntry() {
	const { isAuthenticated } = useAuth();
	const qc = useQueryClient();

	return useMutation({
		mutationFn: ({ taskId }: DeleteManualEntryInput) => {
			const ds = createDataService(isAuthenticated);
			return ds.deleteManualEntry(taskId);
		},
		onMutate: async (input) => {
			const workDateValue = new Date(`${input.workDate}T00:00:00`);
			const monthKey = queryKeys.timesheet.monthly(workDateValue.getFullYear(), workDateValue.getMonth() + 1);
			const dayKey = queryKeys.timesheet.day(input.workDate);

			await qc.cancelQueries({ queryKey: dayKey });
			await qc.cancelQueries({ queryKey: monthKey });

			const previousDay = qc.getQueryData<any[]>(dayKey);
			const previousMonth = qc.getQueryData<DailyTimesheetEntry[]>(monthKey);

			if (previousDay) {
				qc.setQueryData(dayKey, previousDay.filter((task) => task.id !== input.taskId));
			}

			if (previousMonth) {
				qc.setQueryData(
					monthKey,
					previousMonth
						.map((day) => {
							if (day.date !== input.workDate) return day;

							const nextEntries = day.entries.filter((entry) => entry.taskId !== input.taskId);
							const removedEntry = day.entries.find((entry) => entry.taskId === input.taskId);
							const removedHours = removedEntry?.hours ?? input.hours ?? 0;
							const nextTotalHours = Math.max(0, day.totalHours - removedHours);

							return {
								...day,
								entries: nextEntries,
								totalHours: Math.round(nextTotalHours * 10) / 10,
							};
						})
						.filter((day) => day.entries.length > 0)
				);
			}

			return { previousDay, previousMonth, dayKey, monthKey };
		},
		onSuccess: (_data, input) => {
			qc.invalidateQueries({ queryKey: queryKeys.timesheet.day(input.workDate) });
			const workDateValue = new Date(`${input.workDate}T00:00:00`);
			qc.invalidateQueries({
				queryKey: queryKeys.timesheet.monthly(workDateValue.getFullYear(), workDateValue.getMonth() + 1),
			});
			qc.invalidateQueries({ queryKey: queryKeys.timesheet.participatedProjects() });
			qc.invalidateQueries({ queryKey: queryKeys.approval.pending() });
			toast({ title: '已删除' });
		},
		onError: (_error, _input, context) => {
			if (context?.previousDay) {
				qc.setQueryData(context.dayKey, context.previousDay);
			}
			if (context?.previousMonth) {
				qc.setQueryData(context.monthKey, context.previousMonth);
			}
			toast({ title: '删除失败', description: '仅可删除待审批的手动记录', variant: 'destructive' });
		},
	});
}

/**
 * 获取待审批任务列表
 */
export function usePendingApprovalTasks() {
	const { isAuthenticated } = useAuth();

	return useQuery({
		queryKey: queryKeys.approval.pending(),
		queryFn: () => {
			const ds = createDataService(isAuthenticated);
			return ds.getPendingApprovalTasks();
		},
		enabled: isAuthenticated,
	});
}

/**
 * 批量审批
 */
export function useBatchApprove() {
	const { isAuthenticated } = useAuth();
	const qc = useQueryClient();

	return useMutation({
		mutationFn: (taskIds: string[]) => {
			const ds = createDataService(isAuthenticated);
			return ds.batchApproveTasks(taskIds);
		},
		onSuccess: (_data, _variables) => {
			qc.invalidateQueries({ queryKey: queryKeys.approval.pending() });
			qc.invalidateQueries({ queryKey: queryKeys.timesheet.all() });
			qc.invalidateQueries({ queryKey: queryKeys.dashboard.health() });
		},
	});
}

/**
 * 获取项目健康度统计（Dashboard 用）
 */
export function useProjectHealthStats() {
	const { isAuthenticated } = useAuth();

	return useQuery({
		queryKey: queryKeys.dashboard.health(),
		queryFn: () => {
			const ds = createDataService(isAuthenticated);
			return ds.getProjectHealthStats();
		},
		enabled: isAuthenticated,
		staleTime: 60_000, // Dashboard 数据 1 分钟刷新一次即可
	});
}
