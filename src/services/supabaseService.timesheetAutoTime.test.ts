import { describe, expect, it } from "vitest";
import { SupabaseService } from "@/services/supabaseService";

describe("SupabaseService monthly timesheet auto-time mapping", () => {
	it("marks nas_auto tasks as auto-time entries in monthly timesheet data", () => {
		const service = new SupabaseService();
		const result = (service as any).buildMonthlyTimesheetEntries([
			{
				id: "task-1",
				work_date: "2026-04-21",
				duration_minutes: 120,
				project_id: "project-a",
				entry_source: "nas_auto",
				approval_status: "pending",
				task_name: "A",
				notes: null,
				start_time: null,
				end_time: null,
				project: { name: "项目A" },
			},
			{
				id: "task-2",
				work_date: "2026-04-21",
				duration_minutes: 60,
				project_id: "project-b",
				entry_source: "manual",
				approval_status: "approved",
				task_name: "B",
				notes: null,
				start_time: null,
				end_time: null,
				project: { name: "项目B" },
			},
		]);

		expect(result).toHaveLength(1);
		expect(result[0].entries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					taskId: "task-1",
					projectName: "项目A",
					isAutoTime: true,
					hours: 2,
				}),
				expect.objectContaining({
					taskId: "task-2",
					projectName: "项目B",
					isAutoTime: false,
					hours: 1,
				}),
			]),
		);
	});

	it("builds participated projects from all submitted or updated time entries without truncating", () => {
		const service = new SupabaseService();
		const rows = Array.from({ length: 8 }, (_, index) => ({
			project_id: `project-${index + 1}`,
			created_at: `2026-04-${String(index + 1).padStart(2, "0")}T09:00:00.000Z`,
			updated_at: null,
			project: { name: `项目${index + 1}` },
		}));

		const result = (service as any).buildParticipatedProjects([
			...rows,
			{
				project_id: "project-3",
				created_at: "2026-04-01T08:00:00.000Z",
				updated_at: "2026-04-24T12:00:00.000Z",
				project: { name: "项目3 新名称" },
			},
			{
				project_id: null,
				created_at: "2026-04-25T08:00:00.000Z",
				updated_at: null,
				project: { name: "未分配项目" },
			},
		]);

		expect(result).toHaveLength(8);
		expect(result[0]).toEqual({
			projectId: "project-3",
			projectName: "项目3 新名称",
			usedAt: "2026-04-24T12:00:00.000Z",
		});
		expect(result.map((project: any) => project.projectId)).toEqual([
			"project-3",
			"project-8",
			"project-7",
			"project-6",
			"project-5",
			"project-4",
			"project-2",
			"project-1",
		]);
	});
});
