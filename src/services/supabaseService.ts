import {
	supabase,
	trackDbCall,
	getCachedUser,
	getCachedProjects,
	setCachedProjects,
	getCachedCategories,
	setCachedCategories,
	clearDataCaches,
	trackAuthCall
} from "@/lib/supabase";
import { Task, DayRecord, Project, TodoItem } from "@/contexts/TimeTrackingContext";
import { TaskCategory } from "@/config/categories";
import {
	DataService,
	CurrentDayData,
	DailyTimesheetEntry,
	ManualTimeEntry,
	ParticipatedProjectOption,
	ProjectHealthStat,
	AdminSettingsBundle,
	AdminMemberSettingsRecord,
	MemberReportRecord,
	ProjectReportRecord,
	ProjectDetailRecord,
	ProjectMembersBundle,
	OrgReportBundle,
	OrgActivityLogRecord,
	AdminProjectSettingsRecord,
	AdminTaskTemplateRecord,
	SaveAdminMemberInput,
	SaveAdminOrganizationInput,
	SaveAdminProjectInput,
	SaveAdminTaskTemplateInput,
	SyncAdminProjectsResult,
} from "@/services/dataService";
import { LocalStorageService } from "@/services/localStorageService";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROJECT_MEMBER_COLORS = ['#53BD8C', '#F97316', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6', '#F59E0B'];

export class SupabaseService implements DataService {
	// Schema detection with permanent caching
	private hasNewSchema: boolean | null = null;
	private static schemaChecked: boolean = false;
	private static globalSchemaResult: boolean | null = null;
	private projectSourceFieldsAvailable: boolean | null = null;

	/**
	 * Resolves the authenticated user and validates their ID.
	 * Throws descriptively if the user is unauthenticated or the ID is empty,
	 * ensuring every DB method fails fast before touching the database.
	 */
	private async requireUser(): Promise<{ id: string }> {
		const cachedUser = await getCachedUser(); // throws if unauthenticated
		if (!cachedUser.id) {
			throw new Error("Authenticated user has no ID — cannot perform database operation");
		}
		return cachedUser;
	}

	private tt() {
		return supabase.schema('time_tracker');
	}

	private extractProjectName(project: any): string {
		if (Array.isArray(project)) {
			return project[0]?.name || '未分类';
		}

		return project?.name || '未分类';
	}

	private buildMonthlyTimesheetEntries(taskRows: any[]): DailyTimesheetEntry[] {
		const dayMap = new Map<string, DailyTimesheetEntry>();

		for (const row of taskRows || []) {
			const effectiveDate = row.work_date
				|| (row.start_time ? new Date(row.start_time).toISOString().slice(0, 10) : null);
			if (!effectiveDate) continue;

			if (!dayMap.has(effectiveDate)) {
				dayMap.set(effectiveDate, { date: effectiveDate, totalHours: 0, entries: [] });
			}
			const day = dayMap.get(effectiveDate)!;

			const effectiveHours = row.duration_minutes != null
				? Math.round((Number(row.duration_minutes) / 60) * 100) / 100
				: 0;

			day.entries.push({
				projectName: this.extractProjectName(row.project),
				projectId: row.project_id || undefined,
				hours: effectiveHours,
				entryType: row.start_time || row.end_time ? 'timer' : 'manual',
				approvalStatus: row.approval_status || 'pending',
				taskId: row.id,
				description: row.notes || row.task_name || undefined,
				isAutoTime: row.entry_source === 'nas_auto',
			});
			day.totalHours += effectiveHours;
		}

		return Array.from(dayMap.values());
	}

	private buildParticipatedProjects(taskRows: any[]): ParticipatedProjectOption[] {
		const projectMap = new Map<string, ParticipatedProjectOption>();

		for (const row of taskRows || []) {
			const relatedProject = Array.isArray(row.project) ? row.project[0] : row.project;
			const projectId = row.project_id || relatedProject?.id;
			if (!projectId) continue;

			const usedAt = row.updated_at || row.created_at;
			if (!usedAt) continue;

			const current = projectMap.get(projectId);
			if (current && new Date(current.usedAt).getTime() >= new Date(usedAt).getTime()) {
				continue;
			}

			projectMap.set(projectId, {
				projectId,
				projectName: this.extractProjectName(row.project),
				usedAt,
			});
		}

		return Array.from(projectMap.values()).sort((a, b) => {
			return new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime();
		});
	}

	private async requireActiveOrgMembership(userId?: string): Promise<{ orgId: string; role: string | null }> {
		const resolvedUserId = userId || (await this.requireUser()).id;
		const tt = this.tt();
		const { data, error } = await tt
			.from('org_members')
			.select('org_id, role')
			.eq('user_id', resolvedUserId)
			.eq('employment_status', 'active')
			.order('created_at', { ascending: true })
			.limit(1)
			.maybeSingle();
		trackDbCall('select', 'time_tracker.org_members', 'requireActiveOrgMembership');

		if (error) throw error;
		if (!data?.org_id) {
			throw new Error('Current user is not an active organization member');
		}

		return {
			orgId: data.org_id,
			role: data.role || null,
		};
	}

	private canManageProjectsRole(role: string | null): boolean {
		return ['owner', 'admin', 'project_manager'].includes(role || '');
	}

	private normalizeProjectName(value: string | null | undefined): string {
		return String(value || '').trim();
	}

	private getProjectMemberColor(seed: string): string {
		let hash = 0;
		for (let i = 0; i < seed.length; i += 1) {
			hash = seed.charCodeAt(i) + ((hash << 5) - hash);
		}
		return PROJECT_MEMBER_COLORS[Math.abs(hash) % PROJECT_MEMBER_COLORS.length];
	}

	private mapProjectStatus(value: string | null | undefined): AdminProjectSettingsRecord['status'] {
		if (value === 'completed' || value === 'archived') {
			return value;
		}
		return 'active';
	}

	private async hasProjectSourceFields(): Promise<boolean> {
		if (this.projectSourceFieldsAvailable !== null) {
			return this.projectSourceFieldsAvailable;
		}

		const { error } = await this.tt()
			.from('projects')
			.select('id, source_system')
			.limit(1);
		trackDbCall('select', 'time_tracker.projects', 'hasProjectSourceFields');

		if (!error) {
			this.projectSourceFieldsAvailable = true;
			return true;
		}

		const details = [error.message, error.details, error.hint]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		if (details.includes('source_system')) {
			this.projectSourceFieldsAvailable = false;
			return false;
		}

		throw error;
	}

	private parseSyncAdminProjectsResult(data: any): SyncAdminProjectsResult | null {
		const result = Array.isArray(data) ? data[0] : data;
		if (!result || typeof result !== 'object') {
			return null;
		}

		return {
			sourceTotal: Number(result.source_total ?? result.sourceTotal ?? 0),
			inserted: Number(result.inserted ?? 0),
			updated: Number(result.updated ?? 0),
			skipped: Number(result.skipped ?? 0),
		};
	}

	private async trySyncAdminProjectsViaRpc(orgId: string): Promise<SyncAdminProjectsResult | null> {
		const rpcClient = this.tt() as typeof supabase & {
			rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
		};
		const { data, error } = await rpcClient.rpc('sync_sa_app_project_names', {
			target_org_id: orgId,
		});
		trackDbCall('rpc', 'time_tracker.sync_sa_app_project_names', 'syncAdminProjectsFromSource.rpc');

		if (!error) {
			return this.parseSyncAdminProjectsResult(data);
		}

		const details = [error.message, error.details, error.hint]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		if (
			details.includes('sync_sa_app_project_names') &&
			(details.includes('does not exist') || details.includes('schema cache'))
		) {
			return null;
		}

		throw error;
	}

	private async logProjectSync(
		orgId: string,
		actorUserId: string,
		result: SyncAdminProjectsResult
	): Promise<void> {
		const { error } = await this.tt()
			.from('org_activity_logs')
			.insert({
				org_id: orgId,
				actor_user_id: actorUserId,
				action_type: 'sync_sa_app_projects',
				target_type: 'project',
				description: `同步 SA-AI-APP 项目名称：新增 ${result.inserted}，更新 ${result.updated}，跳过 ${result.skipped}`,
				metadata: {
					source: 'sa_ai_app',
					source_total: result.sourceTotal,
					inserted: result.inserted,
					updated: result.updated,
					skipped: result.skipped,
				},
			});
		trackDbCall('insert', 'time_tracker.org_activity_logs', 'syncAdminProjectsFromSource.log');

		if (error) {
			console.warn('Failed to write project sync log', error);
		}
	}

	private async resolveManualEntryProject(
		orgId: string,
		projectId?: string,
		projectName?: string
	): Promise<{ id: string; name: string }> {
		const tt = this.tt();

		if (projectId && UUID_PATTERN.test(projectId)) {
			const { data, error } = await tt
				.from('projects')
				.select('id, name')
				.eq('org_id', orgId)
				.eq('id', projectId)
				.eq('status', 'active')
				.maybeSingle();
			trackDbCall('select', 'time_tracker.projects', 'resolveManualEntryProject.byId');

			if (error) throw error;
			if (data?.id) {
				return { id: data.id, name: data.name };
			}
		}

		if (projectName) {
			const { data, error } = await tt
				.from('projects')
				.select('id, name')
				.eq('org_id', orgId)
				.eq('name', projectName)
				.eq('status', 'active')
				.maybeSingle();
			trackDbCall('select', 'time_tracker.projects', 'resolveManualEntryProject.byName');

			if (error) throw error;
			if (data?.id) {
				return { id: data.id, name: data.name };
			}
		}

		const { data, error } = await tt
			.from('projects')
			.select('id, name')
			.eq('org_id', orgId)
			.eq('status', 'active')
			.order('name', { ascending: true })
			.limit(1)
			.maybeSingle();
		trackDbCall('select', 'time_tracker.projects', 'resolveManualEntryProject.fallback');

		if (error) throw error;
		if (!data?.id) {
			throw new Error('No active project is available for manual entry');
		}

		return { id: data.id, name: data.name };
	}

	async getProjectHealthStats(): Promise<any[]> {
		await this.requireUser();
		const { data, error } = await supabase
			.from("project_health_stats")
			.select("*");
		if (error && error.code !== '42P01') {
			console.warn("⚠️ Error loading project_health_stats or view missing:", error);
			return [];
		}
		return data || [];
	}

	async batchApproveTasks(taskIds: string[]): Promise<void> {
		const user = await this.requireUser();
		const { error } = await supabase
			.from("tasks")
			.update({
				approval_status: 'approved',
				approved_at: new Date().toISOString(),
				approved_by: user.id
			})
			.in('id', taskIds);
		if (error) {
			console.error("❌ Error batch approving tasks:", error);
			throw error;
		}
	}

	private async checkNewSchema(): Promise<boolean> {
		// Use global cache first (survives across service instances)
		if (SupabaseService.schemaChecked && SupabaseService.globalSchemaResult !== null) {
			this.hasNewSchema = SupabaseService.globalSchemaResult;
			return this.hasNewSchema;
		}

		// Use instance cache
		if (this.hasNewSchema !== null) {
			return this.hasNewSchema;
		}

		try {
			// Check if we have a valid authenticated user first
			const {
				data: { user },
				error: userError
			} = await supabase.auth.getUser();
			trackAuthCall("getUser", "SupabaseService.checkNewSchema");

			if (userError || !user) {
				console.warn("User not authenticated, cannot check schema");
				this.hasNewSchema = false;
				SupabaseService.globalSchemaResult = false;
				SupabaseService.schemaChecked = true;
				return false;
			}

			// Try to query the current_day table to see if the new schema exists
			const { error } = await supabase
				.from("current_day")
				.select("user_id")
				.eq("user_id", user.id)
				.limit(1);
			trackDbCall("select", "current_day", "SupabaseService.checkNewSchema");

			if (error) {
				console.warn("New schema not detected:", error.message);
				this.hasNewSchema = false;
				SupabaseService.globalSchemaResult = false;
				SupabaseService.schemaChecked = true;
				return false;
			}

			this.hasNewSchema = true;
			SupabaseService.globalSchemaResult = true;
			SupabaseService.schemaChecked = true;
			return true;
		} catch (error) {
			console.warn("Error checking schema, assuming new schema exists:", error);
			this.hasNewSchema = true;
			SupabaseService.globalSchemaResult = true;
			SupabaseService.schemaChecked = true;
			return true;
		}
	}

	async saveCurrentDay(data: CurrentDayData): Promise<void> {

		const user = await this.requireUser();

		const categories = (await getCachedCategories()) || [];
		const projects = (await getCachedProjects()) || [];

		try {
			// 1. Save current day state
			const { error: currentDayError } = await supabase
				.from("current_day")
				.upsert({
					user_id: user.id,
					is_day_started: data.isDayStarted,
					day_start_time: data.dayStartTime?.toISOString(),
					current_task_id: data.currentTask?.id || null
				});
			trackDbCall("upsert", "current_day");

			if (currentDayError) {
				console.error("❌ Error saving current day state:", currentDayError);
				throw currentDayError;
			}

			// 2. Handle tasks efficiently
			if (data.tasks.length === 0) {
				const { error: deleteError } = await supabase
					.from("tasks")
					.delete()
					.eq("user_id", user.id)
					.eq("is_current", true);
				trackDbCall("delete", "tasks");

				if (deleteError) {
					console.error("❌ Error deleting all current tasks:", deleteError);
					throw deleteError;
				}
			} else {
				// Get existing task IDs to minimize database operations
				const { data: existingTasks } = await supabase
					.from("tasks")
					.select("id")
					.eq("user_id", user.id)
					.eq("is_current", true);
				trackDbCall("select", "tasks");

				const existingTaskIds = new Set(existingTasks?.map(t => t.id) || []);
				const newTaskIds = new Set(data.tasks.map(t => t.id));

				// 3. Delete obsolete tasks
				const tasksToDelete = Array.from(existingTaskIds).filter(id => !newTaskIds.has(id));
				if (tasksToDelete.length > 0) {
					const { error: deleteError } = await supabase
						.from("tasks")
						.delete()
						.eq("user_id", user.id)
						.eq("is_current", true)
						.in("id", tasksToDelete);
					trackDbCall("delete", "tasks");

					if (deleteError) {
						console.error("❌ Error deleting obsolete tasks:", deleteError);
						throw deleteError;
					}
				}

				// 4. Upsert current tasks (single batch operation)
				const tasksToUpsert = data.tasks.map((task) => {
					const category = categories.find(c => c.id === task.category);
					const project = projects.find(p => p.name === task.project);

					return {
						id: task.id,
						user_id: user.id,
						title: task.title,
						description: task.description || null,
						start_time: task.startTime.toISOString(),
						end_time: task.endTime?.toISOString() || null,
						duration: task.duration || null,
						project_id: project?.id || null,
						project_name: task.project || null,
						client: task.client || null,
						category_id: task.category || null,
						category_name: category?.name || null,
						day_record_id: null,
						is_current: true
					};
				});

				const { error: tasksError } = await supabase
					.from("tasks")
					.upsert(tasksToUpsert, { onConflict: "id" });
				trackDbCall("upsert", "tasks");

				if (tasksError) {
					console.error("❌ Error upserting tasks:", tasksError);
					throw tasksError;
				}

			}

		} catch (error) {
			console.error("❌ Error in saveCurrentDay:", error);
			throw error;
		}
	}

	async getCurrentDay(): Promise<CurrentDayData | null> {

		const user = await this.requireUser();

		const { data: currentDayData, error: currentDayError } = await supabase
			.from("current_day")
			.select("*")
			.eq("user_id", user.id)
			.single();

		if (currentDayError && currentDayError.code !== "PGRST116") {
			console.error("❌ Error loading current day state:", currentDayError);
			throw currentDayError;
		}

		const { data: tasksData, error: tasksError } = await supabase
			.from("tasks")
			.select("*")
			.eq("user_id", user.id)
			.eq("is_current", true)
			.order("start_time", { ascending: true });

		if (tasksError) {
			console.error("❌ Error loading current tasks:", tasksError);
			throw tasksError;
		}

		if (!currentDayData && (!tasksData || tasksData.length === 0)) {
			return null;
		}

		const tasks: Task[] = (tasksData || []).map((task) => ({
			id: task.id,
			title: task.title,
			description: task.description || undefined,
			startTime: new Date(task.start_time),
			endTime: task.end_time ? new Date(task.end_time) : undefined,
			duration: task.duration || undefined,
			project: task.project_name || undefined,
			client: task.client || undefined,
			category: task.category_id || undefined,
			insertedAt: task.inserted_at ? new Date(task.inserted_at) : undefined,
			updatedAt: task.updated_at ? new Date(task.updated_at) : undefined
		}));

		const currentTask = currentDayData?.current_task_id
			? tasks.find((task) => task.id === currentDayData.current_task_id) || null
			: null;

		const result = {
			isDayStarted: currentDayData?.is_day_started || false,
			dayStartTime: currentDayData?.day_start_time
				? new Date(currentDayData.day_start_time)
				: null,
			tasks,
			currentTask
		};

		return result;
	}

	async saveArchivedDays(days: DayRecord[]): Promise<void> {

		const user = await this.requireUser();

		const categories = (await getCachedCategories()) || [];
		const projects = (await getCachedProjects()) || [];

		if (days.length === 0) {
			await supabase.from("tasks").delete().eq("user_id", user.id).eq("is_current", false);
			await supabase.from("archived_days").delete().eq("user_id", user.id);
			return;
		}

		const archivedDaysToUpsert = days.map((day) => ({
			id: day.id,
			user_id: user.id,
			date: day.date,
			total_duration: day.totalDuration,
			start_time: day.startTime.toISOString(),
			end_time: day.endTime.toISOString(),
			notes: day.notes
		}));

		const allTasks = days.flatMap((day) =>
			day.tasks.map((task) => {
				const category = categories.find(c => c.id === task.category);
				const project = projects.find(p => p.name === task.project);

				return {
					id: task.id,
					user_id: user.id,
					title: task.title,
					description: task.description || null,
					start_time: task.startTime.toISOString(),
					end_time: task.endTime?.toISOString() || null,
					duration: task.duration || null,
					project_id: project?.id || null,
					project_name: task.project || null,
					client: task.client || null,
					category_id: task.category || null,
					category_name: category?.name || null,
					day_record_id: day.id,
					is_current: false
				};
			})
		);

		try {
			// Step 1: Get existing data to determine what to delete
			const { data: existingDays } = await supabase
				.from("archived_days")
				.select("id")
				.eq("user_id", user.id);
			trackDbCall("select", "archived_days");

			const { data: existingTasks } = await supabase
				.from("tasks")
				.select("id")
				.eq("user_id", user.id)
				.eq("is_current", false);
			trackDbCall("select", "tasks");

			const existingDayIds = new Set(existingDays?.map(d => d.id) || []);
			const newDayIds = new Set(days.map(d => d.id));
			const existingTaskIds = new Set(existingTasks?.map(t => t.id) || []);
			const newTaskIds = new Set(allTasks.map(t => t.id));

			// Step 2: Delete archived days that no longer exist in local state
			const daysToDelete = Array.from(existingDayIds).filter(id => !newDayIds.has(id));
			if (daysToDelete.length > 0) {
				const { error: deleteDaysError } = await supabase
					.from("archived_days")
					.delete()
					.eq("user_id", user.id)
					.in("id", daysToDelete);
				trackDbCall("delete", "archived_days");

				if (deleteDaysError) {
					console.error("❌ Error deleting obsolete days:", deleteDaysError);
					throw deleteDaysError;
				}
			}

			// Step 3: Delete archived tasks that no longer exist in local state
			const tasksToDelete = Array.from(existingTaskIds).filter(id => !newTaskIds.has(id));
			if (tasksToDelete.length > 0) {
				const { error: deleteTasksError } = await supabase
					.from("tasks")
					.delete()
					.eq("user_id", user.id)
					.eq("is_current", false)
					.in("id", tasksToDelete);
				trackDbCall("delete", "tasks");

				if (deleteTasksError) {
					console.error("❌ Error deleting obsolete tasks:", deleteTasksError);
					throw deleteTasksError;
				}
			}

			// Step 4: Upsert archived days
			const { error: daysError } = await supabase
				.from("archived_days")
				.upsert(archivedDaysToUpsert, { onConflict: "id" });
			trackDbCall("upsert", "archived_days");

			if (daysError) {
				console.error("❌ Error upserting archived days:", daysError);
				throw daysError;
			}

			// Step 5: Upsert archived tasks
			if (allTasks.length > 0) {

				const { error: tasksError } = await supabase
					.from("tasks")
					.upsert(allTasks, { onConflict: "id" });
				trackDbCall("upsert", "tasks");

				if (tasksError) {
					console.error("❌ Error upserting archived tasks:", tasksError);
					console.error("❌ Failed task data sample:", allTasks[0]);
					throw tasksError;
				}

			}

			await this.verifyArchivedDataIntegrity(days);
		} catch (error) {
			console.error("💥 Archiving save failed:", error);
			console.error("🚨 Data that failed to save:", {
				daysCount: archivedDaysToUpsert.length,
				tasksCount: allTasks.length,
				firstDay: archivedDaysToUpsert[0]?.date,
				error: error
			});
			throw error;
		}
	}

	private async verifyArchivedDataIntegrity(expectedDays: DayRecord[]): Promise<void> {
		try {
			const user = await this.requireUser();

			const { data: savedDays, error: daysError } = await supabase
				.from("archived_days")
				.select("id")
				.eq("user_id", user.id);

			if (daysError) {
				console.warn("⚠️ Could not verify archived days:", daysError);
				return;
			}

			const { data: savedTasks, error: tasksError } = await supabase
				.from("tasks")
				.select("id")
				.eq("user_id", user.id)
				.eq("is_current", false);

			if (tasksError) {
				console.warn("⚠️ Could not verify archived tasks:", tasksError);
				return;
			}

			const expectedTasksCount = expectedDays.reduce((sum, day) => sum + day.tasks.length, 0);

			if (savedDays?.length !== expectedDays.length) {
				console.error("❌ Archive verification failed: Day count mismatch");
			}

			if (savedTasks?.length !== expectedTasksCount) {
				console.error("❌ Archive verification failed: Task count mismatch");
				throw new Error(
					`Archive verification failed: Expected ${expectedTasksCount} tasks, found ${savedTasks?.length}`
			);
	}

		} catch (error) {
			console.error("❌ Archive verification failed:", error);
			throw error;
		}
	}

	async getArchivedDays(): Promise<DayRecord[]> {

		const user = await this.requireUser();

		const { data: daysData, error: daysError } = await supabase
			.from("archived_days")
			.select("*")
			.eq("user_id", user.id)
			.order("start_time", { ascending: false });

		if (daysError) {
			console.error("❌ Error loading archived days:", daysError);
			throw daysError;
		}

		if (!daysData || daysData.length === 0) {
			return [];
		}

		const { data: tasksData, error: tasksError } = await supabase
			.from("tasks")
			.select("*")
			.eq("user_id", user.id)
			.eq("is_current", false)
			.order("start_time", { ascending: true });

		if (tasksError) {
			console.error("❌ Error loading archived tasks:", tasksError);
			throw tasksError;
		}

		const tasksByDay: Record<string, Task[]> = {};
		(tasksData || []).forEach((task) => {
			if (!task.day_record_id) return;

			if (!tasksByDay[task.day_record_id]) {
				tasksByDay[task.day_record_id] = [];
			}

			tasksByDay[task.day_record_id].push({
				id: task.id,
				title: task.title,
				description: task.description || undefined,
				startTime: new Date(task.start_time),
				endTime: task.end_time ? new Date(task.end_time) : undefined,
				duration: task.duration || undefined,
				project: task.project_name || undefined,
				client: task.client || undefined,
				category: task.category_id || undefined,
				insertedAt: task.inserted_at ? new Date(task.inserted_at) : undefined,
				updatedAt: task.updated_at ? new Date(task.updated_at) : undefined
			});
		});

		const result = daysData.map((day) => ({
			id: day.id,
			date: day.date,
			tasks: tasksByDay[day.id] || [],
			totalDuration: day.total_duration,
			startTime: new Date(day.start_time),
			endTime: new Date(day.end_time),
			notes: day.notes,
			insertedAt: day.inserted_at ? new Date(day.inserted_at) : undefined,
			updatedAt: day.updated_at ? new Date(day.updated_at) : undefined
		}));

		return result;
	}

	async updateArchivedDay(dayId: string, updates: Partial<DayRecord>): Promise<void> {
		const user = await this.requireUser();

		const categories = await getCachedCategories();
		const projects = await getCachedProjects();

		const updateData: Record<string, unknown> = {};

		if (updates.date) updateData.date = updates.date;
		if (updates.totalDuration !== undefined) updateData.total_duration = updates.totalDuration;
		if (updates.startTime) updateData.start_time = updates.startTime.toISOString();
		if (updates.endTime) updateData.end_time = updates.endTime.toISOString();
		if (updates.notes !== undefined) updateData.notes = updates.notes;

		const { error: dayError } = await supabase
			.from("archived_days")
			.update(updateData)
			.eq("id", dayId)
			.eq("user_id", user.id);
		trackDbCall("update", "archived_days");

		if (dayError) throw dayError;

		if (updates.tasks) {
			const { data: existingTasks } = await supabase
				.from("tasks")
				.select("id")
				.eq("day_record_id", dayId)
				.eq("user_id", user.id)
				.eq("is_current", false);
			trackDbCall("select", "tasks");

			const existingTaskIds = new Set(existingTasks?.map(t => t.id) || []);
			const newTaskIds = new Set(updates.tasks.map(t => t.id));

			const tasksToDelete = Array.from(existingTaskIds).filter(id => !newTaskIds.has(id));
			if (tasksToDelete.length > 0) {
				const { error: deleteError } = await supabase
					.from("tasks")
					.delete()
					.eq("day_record_id", dayId)
					.eq("user_id", user.id)
					.eq("is_current", false)
					.in("id", tasksToDelete);
				trackDbCall("delete", "tasks");

				if (deleteError) throw deleteError;
			}

			if (updates.tasks.length > 0) {
				const tasksToUpsert = updates.tasks.map((task) => {
					const category = categories.find(c => c.id === task.category);
					const project = projects.find(p => p.name === task.project);

					return {
						id: task.id,
						user_id: user.id,
						title: task.title,
						description: task.description || null,
						start_time: task.startTime.toISOString(),
						end_time: task.endTime?.toISOString() || null,
						duration: task.duration || null,
						project_id: project?.id || null,
						project_name: task.project || null,
						client: task.client || null,
						category_id: task.category || null,
						category_name: category?.name || null,
						day_record_id: dayId,
						is_current: false
					};
				});

				const { error: tasksError } = await supabase
					.from("tasks")
					.upsert(tasksToUpsert, { onConflict: "id" });
				trackDbCall("upsert", "tasks");

				if (tasksError) throw tasksError;
			}
		}
	}

	async deleteArchivedDay(dayId: string): Promise<void> {
		const user = await this.requireUser();

		// Delete tasks first (foreign key dependency)
		await supabase
			.from("tasks")
			.delete()
			.eq("day_record_id", dayId)
			.eq("user_id", user.id);

		const { error } = await supabase
			.from("archived_days")
			.delete()
			.eq("id", dayId)
			.eq("user_id", user.id);

		if (error) throw error;
	}

	async saveProjects(projects: Project[]): Promise<void> {

		const user = await this.requireUser();

		if (projects.length === 0) {
			await supabase.from("projects").delete().eq("user_id", user.id);
			trackDbCall("delete", "projects");
			clearDataCaches();
			return;
		}

		const { data: existingProjects } = await supabase
			.from("projects")
			.select("id")
			.eq("user_id", user.id);
		trackDbCall("select", "projects");

		const existingProjectIds = new Set(existingProjects?.map(p => p.id) || []);
		const newProjectIds = new Set(projects.map(p => p.id));

		const projectsToDelete = Array.from(existingProjectIds).filter(
			id => !newProjectIds.has(id)
		);
		if (projectsToDelete.length > 0) {
			const { error: deleteError } = await supabase
				.from("projects")
				.delete()
				.eq("user_id", user.id)
				.in("id", projectsToDelete);
			trackDbCall("delete", "projects");

			if (deleteError) {
				console.error("❌ Error deleting obsolete projects:", deleteError);
				throw deleteError;
			}
		}

		const projectsToUpsert = projects.map((project) => ({
			id: project.id,
			user_id: user.id,
			name: project.name,
			client: project.client,
			hourly_rate: project.hourlyRate || null,
			color: project.color || null,
			is_billable: project.isBillable !== false
		}));

		const { error } = await supabase
			.from("projects")
			.upsert(projectsToUpsert, { onConflict: "id" });
		trackDbCall("upsert", "projects");

		if (error) {
			console.error("❌ Error upserting projects:", error);
			throw error;
		}

		setCachedProjects(projects);
	}

	async getProjects(): Promise<Project[]> {

		const cachedResult = await getCachedProjects();
		if (cachedResult) {
			return cachedResult;
		}

		const user = await this.requireUser();

		const { data, error } = await supabase
			.from("projects")
			.select("*")
			.eq("user_id", user.id)
			.order("name", { ascending: true });

		if (error) {
			console.error("❌ Error loading projects:", error);
			throw error;
		}

		const result = (data || []).map((project) => ({
			id: project.id,
			name: project.name,
			client: project.client,
			hourlyRate: project.hourly_rate || undefined,
			color: project.color || undefined,
			isBillable: project.is_billable !== false
		}));

		setCachedProjects(result);
		return result;
	}

	async saveCategories(categories: TaskCategory[]): Promise<void> {

		const user = await this.requireUser();

		if (categories.length === 0) {
			await supabase.from("categories").delete().eq("user_id", user.id);
			trackDbCall("delete", "categories");
			clearDataCaches();
			return;
		}

		const { data: existingCategories } = await supabase
			.from("categories")
			.select("id")
			.eq("user_id", user.id);
		trackDbCall("select", "categories");

		const existingCategoryIds = new Set(existingCategories?.map(c => c.id) || []);
		const newCategoryIds = new Set(categories.map(c => c.id));

		const categoriesToDelete = Array.from(existingCategoryIds).filter(
			id => !newCategoryIds.has(id)
		);
		if (categoriesToDelete.length > 0) {
			const { error: deleteError } = await supabase
				.from("categories")
				.delete()
				.eq("user_id", user.id)
				.in("id", categoriesToDelete);
			trackDbCall("delete", "categories");

			if (deleteError) {
				console.error("❌ Error deleting obsolete categories:", deleteError);
				throw deleteError;
			}
		}

		const categoriesToUpsert = categories.map((category) => ({
			id: category.id,
			user_id: user.id,
			name: category.name,
			color: category.color || null,
			icon: null,
			is_billable: category.isBillable !== false
		}));

		const { error } = await supabase
			.from("categories")
			.upsert(categoriesToUpsert, { onConflict: "id" });
		trackDbCall("upsert", "categories");

		if (error) {
			console.error("❌ Error upserting categories:", error);
			throw error;
		}

		setCachedCategories(categories);
	}

	async getCategories(): Promise<TaskCategory[]> {

		const cachedResult = await getCachedCategories();
		if (cachedResult) {
			return cachedResult;
		}

		const user = await this.requireUser();

		const { data, error } = await supabase
			.from("categories")
			.select("*")
			.eq("user_id", user.id)
			.order("name", { ascending: true });

		if (error) {
			console.error("❌ Error loading categories:", error);
			throw error;
		}

		const result = (data || []).map((category) => ({
			id: category.id,
			name: category.name,
			color: category.color || "#8B5CF6",
			isBillable: category.is_billable !== false
		}));

		setCachedCategories(result);
		return result;
	}

	async saveTodos(todos: TodoItem[]): Promise<void> {
		const user = await this.requireUser();

		if (todos.length === 0) {
			await supabase.from("todo_items").delete().eq("user_id", user.id);
			trackDbCall("delete", "todo_items");
			return;
		}

		const { data: existingTodos } = await supabase
			.from("todo_items")
			.select("id")
			.eq("user_id", user.id);
		trackDbCall("select", "todo_items");

		const existingIds = new Set(existingTodos?.map((t: { id: string }) => t.id) || []);
		const newIds = new Set(todos.map((t) => t.id));

		const toDelete = Array.from(existingIds).filter((id) => !newIds.has(id));
		if (toDelete.length > 0) {
			const { error: deleteError } = await supabase
				.from("todo_items")
				.delete()
				.eq("user_id", user.id)
				.in("id", toDelete);
			trackDbCall("delete", "todo_items");
			if (deleteError) throw deleteError;
		}

		const toUpsert = todos.map((item) => ({
			id: item.id,
			user_id: user.id,
			text: item.text,
			completed: item.completed,
			created_at: item.createdAt,
			completed_at: item.completedAt ?? null
		}));

		const { error } = await supabase
			.from("todo_items")
			.upsert(toUpsert, { onConflict: "id" });
		trackDbCall("upsert", "todo_items");
		if (error) throw error;
	}

	async getTodos(): Promise<TodoItem[]> {
		const user = await this.requireUser();

		const { data, error } = await supabase
			.from("todo_items")
			.select("*")
			.eq("user_id", user.id)
			.order("created_at", { ascending: true });
		trackDbCall("select", "todo_items");

		if (error) {
			console.error("❌ Error loading todos:", error);
			throw error;
		}

		return (data || []).map((row: {
			id: string;
			text: string;
			completed: boolean;
			created_at: string;
			completed_at: string | null;
		}) => ({
			id: row.id,
			text: row.text,
			completed: row.completed,
			createdAt: row.created_at,
			completedAt: row.completed_at ?? undefined
		}));
	}

	async migrateFromLocalStorage(): Promise<void> {
		try {
			const localService = new LocalStorageService();

			const projects = await localService.getProjects();
			const categories = await localService.getCategories();
			const currentDay = await localService.getCurrentDay();
			const archivedDays = await localService.getArchivedDays();
			const todos = await localService.getTodos();

			const hasProjects = projects.length > 0;
			const hasCategories = categories.length > 0;
			const hasCurrentDay =
				currentDay && (currentDay.tasks.length > 0 || currentDay.isDayStarted);
			const hasArchivedDays = archivedDays.length > 0;
			const hasTodos = todos.length > 0;

			if (!hasProjects && !hasCategories && !hasCurrentDay && !hasArchivedDays && !hasTodos) {
				return;
			}

			const existingCurrentDay = await this.getCurrentDay();
			const existingArchivedDays = await this.getArchivedDays();
			const existingProjects = await this.getProjects();

			const hasExistingData =
				(existingCurrentDay &&
					(existingCurrentDay.tasks.length > 0 || existingCurrentDay.isDayStarted)) ||
				existingArchivedDays.length > 0 ||
				existingProjects.length > 0;

			if (hasExistingData) {

				const shouldMigrateCurrentDay =
					hasCurrentDay &&
					(!existingCurrentDay ||
						(currentDay?.tasks.length ?? 0) > existingCurrentDay.tasks.length);

				const shouldMigrateArchived =
					hasArchivedDays && archivedDays.length > existingArchivedDays.length;

				if (shouldMigrateCurrentDay) {
					if (currentDay) {
						await this.saveCurrentDay(currentDay);
					} else {
						console.warn("⚠️ Tried to migrate current day, but currentDay is null or undefined.");
					}
				}

				if (shouldMigrateArchived) {
					await this.saveArchivedDays(archivedDays);
				}

				if (hasProjects) {
					await this.saveProjects(projects);
				}

				const existingCategories = await this.getCategories();
				if (hasCategories && existingCategories.length === 0) {
					await this.saveCategories(categories);
				}

				if (hasTodos) {
					await this.saveTodos(todos);
				}
			} else {

				if (hasProjects) await this.saveProjects(projects);
				if (hasCategories) await this.saveCategories(categories);
				if (hasCurrentDay) await this.saveCurrentDay(currentDay);
				if (hasArchivedDays) await this.saveArchivedDays(archivedDays);
				if (hasTodos) await this.saveTodos(todos);
			}

		} catch (error) {
			console.error("❌ Error migrating data from localStorage:", error);
		}
	}

	async migrateToLocalStorage(): Promise<void> {
		try {
			const localService = new LocalStorageService();

			const currentDay = await this.getCurrentDay();
			const archivedDays = await this.getArchivedDays();
			const projects = await this.getProjects();
			const categories = await this.getCategories();
			const todos = await this.getTodos();

			if (currentDay) {
				await localService.saveCurrentDay(currentDay);
			}

			if (archivedDays.length > 0) {
				await localService.saveArchivedDays(archivedDays);
			}

			if (projects.length > 0) {
				await localService.saveProjects(projects);
			}

			if (categories.length > 0) {
				await localService.saveCategories(categories);
			}

			if (todos.length > 0) {
				await localService.saveTodos(todos);
			}

		} catch (error) {
			console.error("❌ Error migrating data to localStorage:", error);
		}
	}

	// ===== v2.0 新增：回溯式工时填报 =====

	async getMonthlyTimesheet(year: number, month: number): Promise<DailyTimesheetEntry[]> {
		const user = await this.requireUser();
		const membership = await this.requireActiveOrgMembership(user.id);
		const tt = this.tt();

		const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
		const lastDay = new Date(year, month, 0).getDate();
		const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

		const { data, error } = await tt
			.from('tasks')
			.select('id, task_name, notes, approval_status, start_time, end_time, work_date, duration_minutes, project_id, entry_source, project:projects(name)')
			.eq('org_id', membership.orgId)
			.eq('user_id', user.id)
			.gte('work_date', startDate)
			.lte('work_date', endDate)
			.order('work_date', { ascending: true })
			.order('created_at', { ascending: true });
		trackDbCall('select', 'time_tracker.tasks', 'getMonthlyTimesheet');

		if (error) throw error;

		return this.buildMonthlyTimesheetEntries(
			(data || []).filter((row) => {
				const effectiveDate = row.work_date
					|| (row.start_time ? new Date(row.start_time).toISOString().slice(0, 10) : null);
				return Boolean(effectiveDate && effectiveDate >= startDate && effectiveDate <= endDate);
			})
		);
		}

	async getParticipatedProjects(): Promise<ParticipatedProjectOption[]> {
		const user = await this.requireUser();
		const membership = await this.requireActiveOrgMembership(user.id);
		const tt = this.tt();

		const { data, error } = await tt
			.from('tasks')
			.select('project_id, created_at, updated_at, project:projects(id, name)')
			.eq('org_id', membership.orgId)
			.eq('user_id', user.id)
			.not('project_id', 'is', null)
			.order('updated_at', { ascending: false, nullsFirst: false })
			.order('created_at', { ascending: false });
		trackDbCall('select', 'time_tracker.tasks', 'getParticipatedProjects');

		if (error) throw error;

		return this.buildParticipatedProjects(data || []);
	}

	async submitManualEntry(entry: ManualTimeEntry): Promise<Task> {
		const user = await this.requireUser();
		const membership = await this.requireActiveOrgMembership(user.id);
		const project = await this.resolveManualEntryProject(membership.orgId, entry.projectId, entry.projectName);
		const tt = this.tt();

		const row = {
			org_id: membership.orgId,
			user_id: user.id,
			project_id: project.id,
			task_template_id: entry.categoryId && UUID_PATTERN.test(entry.categoryId) ? entry.categoryId : null,
			task_name: entry.categoryName || entry.description || `${project.name} 工时`,
			work_date: entry.workDate,
			start_time: null,
			end_time: null,
			duration_minutes: Math.round(entry.hours * 60),
			notes: entry.description || null,
			approval_status: 'pending',
		};

		const { data, error } = await tt
			.from('tasks')
			.insert(row)
			.select()
			.single();
		trackDbCall('insert', 'time_tracker.tasks', 'submitManualEntry');

		if (error) throw error;

		return this.mapTaskRow(data);
	}

	async updateManualEntry(taskId: string, updates: Partial<ManualTimeEntry>): Promise<void> {
		const user = await this.requireUser();
		const membership = await this.requireActiveOrgMembership(user.id);
		const tt = this.tt();

		const updateData: Record<string, unknown> = {};
		if (updates.hours !== undefined) {
			updateData.duration_minutes = Math.round(updates.hours * 60);
		}
		if (updates.workDate) updateData.work_date = updates.workDate;
		if (updates.projectId || updates.projectName) {
			const project = await this.resolveManualEntryProject(
				membership.orgId,
				updates.projectId,
				updates.projectName
			);
			updateData.project_id = project.id;
		}
		if (updates.categoryId && UUID_PATTERN.test(updates.categoryId)) updateData.task_template_id = updates.categoryId;
		if (updates.categoryName) updateData.task_name = updates.categoryName;
		if (updates.description !== undefined) updateData.notes = updates.description;

		updateData.approval_status = 'pending';

		const { error } = await tt
			.from('tasks')
			.update(updateData)
			.eq('id', taskId)
			.eq('org_id', membership.orgId)
			.eq('user_id', user.id);
		trackDbCall('update', 'time_tracker.tasks', 'updateManualEntry');

		if (error) throw error;
	}

		async deleteManualEntry(taskId: string): Promise<void> {
			const user = await this.requireUser();
			const membership = await this.requireActiveOrgMembership(user.id);
			const tt = this.tt();

			const { data, error } = await tt
				.from('tasks')
				.delete()
				.eq('id', taskId)
				.eq('user_id', user.id)
				.eq('org_id', membership.orgId)
				.eq('approval_status', 'pending')
				.select('id');
			trackDbCall('delete', 'time_tracker.tasks', 'deleteManualEntry');

			if (error) throw error;
			if (!data || data.length === 0) {
				throw new Error('未找到可删除的待审批手动记录，或当前账号没有删除权限');
			}
		}

	async getDayEntries(date: string): Promise<Task[]> {
		const user = await this.requireUser();
		const membership = await this.requireActiveOrgMembership(user.id);
		const tt = this.tt();

		const { data, error } = await tt
			.from('tasks')
			.select('id, task_name, notes, approval_status, start_time, end_time, work_date, duration_minutes, project_id, task_template_id, approved_by, approved_at, created_at, updated_at, project:projects(name)')
			.eq('org_id', membership.orgId)
			.eq('user_id', user.id)
			.eq('work_date', date)
			.order('created_at', { ascending: true });
		trackDbCall('select', 'time_tracker.tasks', 'getDayEntries');

		if (error) throw error;
		return (data || []).map(row => this.mapTaskRow(row));
	}

	async getPendingApprovalTasks(): Promise<Task[]> {
		await this.requireUser();

		const { data, error } = await supabase
			.from('tasks')
			.select('*')
			.eq('approval_status', 'pending')
			.eq('is_current', false)
			.order('inserted_at', { ascending: false });
		trackDbCall('select', 'tasks', 'getPendingApprovalTasks');

		if (error) throw error;
		return (data || []).map(row => this.mapTaskRow(row));
	}

	async getAdminSettingsBundle(): Promise<AdminSettingsBundle | null> {
		const user = await this.requireUser();
		const tt = supabase.schema('time_tracker');

		const { data: currentMembership, error: membershipError } = await tt
			.from('org_members')
			.select('id, org_id, user_id, role')
			.eq('user_id', user.id)
			.eq('employment_status', 'active')
			.order('joined_at', { ascending: true })
			.limit(1)
			.maybeSingle();
		trackDbCall('select', 'time_tracker.org_members', 'getAdminSettingsBundle.currentMembership');

		if (membershipError) throw membershipError;
		if (!currentMembership) return null;

		const orgId = currentMembership.org_id;

		const [orgRes, membersRes, costsRes, projectsRes, templatesRes] = await Promise.all([
			tt
				.from('organizations')
				.select('*')
				.eq('id', orgId)
				.single(),
			tt
				.from('org_members')
				.select('*')
				.eq('org_id', orgId)
				.order('joined_at', { ascending: true }),
			tt
				.from('employee_costs')
				.select('*')
				.eq('org_id', orgId)
				.order('effective_from', { ascending: false }),
			tt
				.from('projects')
				.select('*')
				.eq('org_id', orgId)
				.order('created_at', { ascending: false }),
			tt
				.from('task_templates')
				.select('*')
				.eq('org_id', orgId)
				.order('group_name', { ascending: true })
				.order('sort_order', { ascending: true })
				.order('task_name', { ascending: true }),
		]);
		trackDbCall('select', 'time_tracker.organizations', 'getAdminSettingsBundle.organization');
		trackDbCall('select', 'time_tracker.org_members', 'getAdminSettingsBundle.members');
		trackDbCall('select', 'time_tracker.employee_costs', 'getAdminSettingsBundle.costs');
		trackDbCall('select', 'time_tracker.projects', 'getAdminSettingsBundle.projects');
		trackDbCall('select', 'time_tracker.task_templates', 'getAdminSettingsBundle.templates');

		if (orgRes.error) throw orgRes.error;
		if (membersRes.error) throw membersRes.error;
		if (costsRes.error) throw costsRes.error;
		if (projectsRes.error) throw projectsRes.error;
		if (templatesRes.error) throw templatesRes.error;

		const memberRows = membersRes.data || [];
		const userIds = Array.from(new Set([
			orgRes.data.owner_user_id,
			...memberRows.map(row => row.user_id),
			...(projectsRes.data || []).map(row => row.manager_user_id).filter(Boolean),
		]));

		const { data: profileRows, error: profilesError } = await tt
			.from('v_user_profiles')
			.select('*')
			.in('id', userIds);
		trackDbCall('select', 'time_tracker.v_user_profiles', 'getAdminSettingsBundle.profiles');

		if (profilesError) throw profilesError;

		const profileMap = new Map(
			(profileRows || []).map((row: any) => [
				row.id,
				{
					name: row.display_name || row.username || row.email || row.id,
					email: row.email || '',
					username: row.username || null,
					department: row.department || null,
					avatarUrl: row.avatar_url || null,
				},
			])
		);

		const activeCostMap = new Map<string, any>();
		for (const row of costsRes.data || []) {
			if (!activeCostMap.has(row.user_id) && (row.effective_to === null || row.effective_to === undefined)) {
				activeCostMap.set(row.user_id, row);
			}
		}
		for (const row of costsRes.data || []) {
			if (!activeCostMap.has(row.user_id)) {
				activeCostMap.set(row.user_id, row);
			}
		}

		const members: AdminMemberSettingsRecord[] = memberRows.map((row: any) => {
			const profile = profileMap.get(row.user_id);
			const cost = activeCostMap.get(row.user_id);
			return {
				membershipId: row.id,
				orgId: row.org_id,
				userId: row.user_id,
				name: profile?.name || row.user_id,
				email: profile?.email || '',
				username: profile?.username || null,
				department: profile?.department || null,
				avatarUrl: profile?.avatarUrl || null,
				role: row.role,
				employmentStatus: row.employment_status,
				dataScope: row.data_scope,
				annualSalary: cost ? Number(cost.annual_salary) : null,
				annualWorkHours: cost ? Number(cost.annual_work_hours) : null,
				hourlyCost: cost ? Number(cost.hourly_cost) : null,
			};
		});

		const projects: AdminProjectSettingsRecord[] = (projectsRes.data || []).map((row: any) => ({
			id: row.id,
			orgId: row.org_id,
			name: row.name,
			sourceSystem: row.source_system || null,
			sourceProjectId: row.source_project_id || null,
			sourceProjectCode: row.source_project_code || null,
			managerUserId: row.manager_user_id,
			managerName: row.manager_user_id ? profileMap.get(row.manager_user_id)?.name || null : null,
			contractAmount: row.contract_amount != null ? Number(row.contract_amount) : null,
			humanCostBudget: row.human_cost_budget != null ? Number(row.human_cost_budget) : null,
			humanCostRatio: row.human_cost_ratio != null ? Number(row.human_cost_ratio) : null,
			completionProgress: row.completion_progress != null ? Number(row.completion_progress) : null,
			estimatedCompletionDate: row.estimated_completion_date || null,
			managerCostRatio: row.manager_cost_ratio != null ? Number(row.manager_cost_ratio) : null,
			companyCostRatio: row.company_cost_ratio != null ? Number(row.company_cost_ratio) : null,
			status: row.status,
		}));

		const taskTemplates: AdminTaskTemplateRecord[] = (templatesRes.data || []).map((row: any) => ({
			id: row.id,
			orgId: row.org_id,
			groupName: row.group_name,
			taskName: row.task_name,
			sortOrder: row.sort_order,
			isActive: row.is_active,
		}));

		const ownerProfile = profileMap.get(orgRes.data.owner_user_id);

		return {
			organization: {
				id: orgRes.data.id,
				name: orgRes.data.name,
				description: orgRes.data.description || null,
				ownerUserId: orgRes.data.owner_user_id,
				ownerName: ownerProfile?.name || orgRes.data.owner_user_id,
				ownerEmail: ownerProfile?.email || '',
				logoUrl: orgRes.data.logo_url || null,
				standardDailyHours: Number(orgRes.data.standard_daily_hours),
				standardWeeklyHours: Number(orgRes.data.standard_weekly_hours),
				defaultHumanCostRatio: Number(orgRes.data.default_human_cost_ratio),
			},
			currentUserId: user.id,
			currentUserRole: currentMembership.role,
			members,
			projects,
			taskTemplates,
		};
	}

	async saveAdminOrganization(input: SaveAdminOrganizationInput): Promise<void> {
		await this.requireUser();
		const { error } = await supabase
			.schema('time_tracker')
			.from('organizations')
			.update({
				name: input.name,
				description: input.description,
				logo_url: input.logoUrl,
				standard_daily_hours: input.standardDailyHours,
				standard_weekly_hours: input.standardWeeklyHours,
				default_human_cost_ratio: input.defaultHumanCostRatio,
			})
			.eq('id', input.orgId);
		trackDbCall('update', 'time_tracker.organizations', 'saveAdminOrganization');

		if (error) throw error;
	}

	async saveAdminMember(input: SaveAdminMemberInput): Promise<void> {
		await this.requireUser();
		const tt = supabase.schema('time_tracker');

		const { error: memberError } = await tt
			.from('org_members')
			.update({
				role: input.role,
				employment_status: input.employmentStatus,
				data_scope: input.dataScope,
			})
			.eq('id', input.membershipId);
		trackDbCall('update', 'time_tracker.org_members', 'saveAdminMember.membership');

		if (memberError) throw memberError;

		const hasCostValues =
			input.annualSalary !== null &&
			input.annualWorkHours !== null &&
			input.hourlyCost !== null;

		if (!hasCostValues) {
			return;
		}

		const { data: existingCost, error: costLookupError } = await tt
			.from('employee_costs')
			.select('id')
			.eq('org_id', input.orgId)
			.eq('user_id', input.userId)
			.is('effective_to', null)
			.order('effective_from', { ascending: false })
			.limit(1)
			.maybeSingle();
		trackDbCall('select', 'time_tracker.employee_costs', 'saveAdminMember.lookupCost');

		if (costLookupError) throw costLookupError;

		if (existingCost?.id) {
			const { error: costUpdateError } = await tt
				.from('employee_costs')
				.update({
					annual_salary: input.annualSalary,
					annual_work_hours: input.annualWorkHours,
					hourly_cost: input.hourlyCost,
				})
				.eq('id', existingCost.id);
			trackDbCall('update', 'time_tracker.employee_costs', 'saveAdminMember.updateCost');

			if (costUpdateError) throw costUpdateError;
			return;
		}

		const { error: costInsertError } = await tt
			.from('employee_costs')
			.insert({
				org_id: input.orgId,
				user_id: input.userId,
				annual_salary: input.annualSalary,
				annual_work_hours: input.annualWorkHours,
				hourly_cost: input.hourlyCost,
			});
		trackDbCall('insert', 'time_tracker.employee_costs', 'saveAdminMember.insertCost');

		if (costInsertError) throw costInsertError;
	}

	async saveAdminProject(input: SaveAdminProjectInput): Promise<void> {
		await this.requireUser();
		const tt = supabase.schema('time_tracker');
		const payload: Record<string, unknown> = {
			org_id: input.orgId,
			name: input.name,
			manager_user_id: input.managerUserId,
			contract_amount: input.contractAmount ?? 0,
			human_cost_budget: input.humanCostBudget ?? 0,
			human_cost_ratio: input.humanCostRatio ?? 0,
			completion_progress: input.completionProgress ?? 0,
			estimated_completion_date: input.estimatedCompletionDate,
			manager_cost_ratio: input.managerCostRatio ?? 0,
			company_cost_ratio: input.companyCostRatio ?? 0,
			status: input.status,
		};
		if (await this.hasProjectSourceFields()) {
			payload.source_system = input.sourceSystem ?? null;
			payload.source_project_id = input.sourceProjectId ?? null;
			payload.source_project_code = input.sourceProjectCode ?? null;
		}

		if (input.id) {
			const { error } = await tt
				.from('projects')
				.update(payload)
				.eq('id', input.id);
			trackDbCall('update', 'time_tracker.projects', 'saveAdminProject.update');
			if (error) throw error;
			return;
		}

		const { error } = await tt
			.from('projects')
			.insert(payload);
		trackDbCall('insert', 'time_tracker.projects', 'saveAdminProject.insert');
		if (error) throw error;
	}

	async syncAdminProjectsFromSource(): Promise<SyncAdminProjectsResult> {
		const user = await this.requireUser();
		const membership = await this.requireActiveOrgMembership(user.id);
		if (!this.canManageProjectsRole(membership.role)) {
			throw new Error('当前账号没有同步项目的权限');
		}

		const rpcResult = await this.trySyncAdminProjectsViaRpc(membership.orgId);
		if (rpcResult) {
			await this.logProjectSync(membership.orgId, user.id, rpcResult);
			return rpcResult;
		}

		const sourceFieldsAvailable = await this.hasProjectSourceFields();
		const { data: sourceRows, error: sourceError } = await supabase
			.from('projects')
			.select('id, name, project_code, status, is_deleted, created_at')
			.eq('is_deleted', false)
			.order('created_at', { ascending: true });
		trackDbCall('select', 'public.projects', 'syncAdminProjectsFromSource.source');

		if (sourceError) throw sourceError;

		const targetSelect = sourceFieldsAvailable
			? 'id, name, status, source_system, source_project_id, source_project_code'
			: 'id, name, status';
		const { data: targetRows, error: targetError } = await this.tt()
			.from('projects')
			.select(targetSelect)
			.eq('org_id', membership.orgId)
			.order('created_at', { ascending: true });
		trackDbCall('select', 'time_tracker.projects', 'syncAdminProjectsFromSource.target');

		if (targetError) throw targetError;

		const existingByName = new Map<string, any>();
		const existingBySourceId = new Map<string, any>();
		for (const row of targetRows || []) {
			const normalizedName = this.normalizeProjectName(row.name).toLowerCase();
			if (normalizedName && !existingByName.has(normalizedName)) {
				existingByName.set(normalizedName, row);
			}
			if (sourceFieldsAvailable && row.source_project_id) {
				existingBySourceId.set(String(row.source_project_id), row);
			}
		}

		let inserted = 0;
		let updated = 0;
		let skipped = 0;
		let sourceTotal = 0;

		for (const row of sourceRows || []) {
			const normalizedName = this.normalizeProjectName(row.name);
			if (!normalizedName) {
				continue;
			}
			sourceTotal += 1;

			const existing =
				existingBySourceId.get(String(row.id)) ||
				existingByName.get(normalizedName.toLowerCase()) ||
				null;
			const mappedStatus = this.mapProjectStatus(row.status);

			if (existing) {
				const updatePayload: Record<string, unknown> = {};
				if (existing.name !== normalizedName) {
					updatePayload.name = normalizedName;
				}
				if (existing.status !== mappedStatus) {
					updatePayload.status = mappedStatus;
				}
				if (sourceFieldsAvailable) {
					if (existing.source_system !== 'sa_ai_app') {
						updatePayload.source_system = 'sa_ai_app';
					}
					if (String(existing.source_project_id || '') !== String(row.id)) {
						updatePayload.source_project_id = row.id;
					}
					if ((existing.source_project_code || null) !== (row.project_code || null)) {
						updatePayload.source_project_code = row.project_code || null;
					}
				}

				if (Object.keys(updatePayload).length === 0) {
					skipped += 1;
					continue;
				}

				const { error } = await this.tt()
					.from('projects')
					.update(updatePayload)
					.eq('id', existing.id);
				trackDbCall('update', 'time_tracker.projects', 'syncAdminProjectsFromSource.update');

				if (error) throw error;

				const updatedRow = { ...existing, ...updatePayload };
				existingByName.set(normalizedName.toLowerCase(), updatedRow);
				if (sourceFieldsAvailable) {
					existingBySourceId.set(String(row.id), updatedRow);
				}
				updated += 1;
				continue;
			}

			const insertPayload: Record<string, unknown> = {
				org_id: membership.orgId,
				name: normalizedName,
				status: mappedStatus,
			};
			if (sourceFieldsAvailable) {
				insertPayload.source_system = 'sa_ai_app';
				insertPayload.source_project_id = row.id;
				insertPayload.source_project_code = row.project_code || null;
			}

			const { data: insertedRows, error } = await this.tt()
				.from('projects')
				.insert(insertPayload)
				.select(sourceFieldsAvailable
					? 'id, name, status, source_system, source_project_id, source_project_code'
					: 'id, name, status')
				.limit(1);
			trackDbCall('insert', 'time_tracker.projects', 'syncAdminProjectsFromSource.insert');

			if (error) throw error;

			const insertedRow = insertedRows?.[0] || {
				id: `new-${row.id}`,
				name: normalizedName,
				status: mappedStatus,
				source_system: sourceFieldsAvailable ? 'sa_ai_app' : null,
				source_project_id: sourceFieldsAvailable ? row.id : null,
				source_project_code: sourceFieldsAvailable ? row.project_code || null : null,
			};
			existingByName.set(normalizedName.toLowerCase(), insertedRow);
			if (sourceFieldsAvailable) {
				existingBySourceId.set(String(row.id), insertedRow);
			}
			inserted += 1;
		}

		const result = { sourceTotal, inserted, updated, skipped };
		await this.logProjectSync(membership.orgId, user.id, result);
		return result;
	}

	async saveAdminTaskTemplate(input: SaveAdminTaskTemplateInput): Promise<void> {
		await this.requireUser();
		const tt = supabase.schema('time_tracker');
		const payload = {
			org_id: input.orgId,
			group_name: input.groupName,
			task_name: input.taskName,
			sort_order: input.sortOrder,
			is_active: input.isActive,
		};

		if (input.id) {
			const { error } = await tt
				.from('task_templates')
				.update(payload)
				.eq('id', input.id);
			trackDbCall('update', 'time_tracker.task_templates', 'saveAdminTaskTemplate.update');
			if (error) throw error;
			return;
		}

		const { error } = await tt
			.from('task_templates')
			.insert(payload);
		trackDbCall('insert', 'time_tracker.task_templates', 'saveAdminTaskTemplate.insert');
		if (error) throw error;
	}

	async getMemberReportRecords(): Promise<MemberReportRecord[]> {
		const user = await this.requireUser();
		const tt = supabase.schema('time_tracker');

		const { data: currentMembership, error: membershipError } = await tt
			.from('org_members')
			.select('org_id')
			.eq('user_id', user.id)
			.eq('employment_status', 'active')
			.order('joined_at', { ascending: true })
			.limit(1)
			.maybeSingle();
		trackDbCall('select', 'time_tracker.org_members', 'getMemberReportRecords.currentMembership');

		if (membershipError) throw membershipError;
		if (!currentMembership) return [];

		const orgId = currentMembership.org_id;

		const [membersRes, summaryRes] = await Promise.all([
			tt
				.from('org_members')
				.select('id, org_id, user_id, role, employment_status')
				.eq('org_id', orgId)
				.order('joined_at', { ascending: true }),
			tt
				.from('v_member_hours_summary')
				.select('*')
				.eq('org_id', orgId),
		]);
		trackDbCall('select', 'time_tracker.org_members', 'getMemberReportRecords.members');
		trackDbCall('select', 'time_tracker.v_member_hours_summary', 'getMemberReportRecords.summary');

		if (membersRes.error) throw membersRes.error;
		if (summaryRes.error) throw summaryRes.error;

		const memberRows = membersRes.data || [];
		const userIds = memberRows.map((row) => row.user_id);

		const { data: profileRows, error: profilesError } = await tt
			.from('v_user_profiles')
			.select('id, email, display_name, username, department, avatar_url')
			.in('id', userIds);
		trackDbCall('select', 'time_tracker.v_user_profiles', 'getMemberReportRecords.profiles');

		if (profilesError) throw profilesError;

		const profileMap = new Map(
			(profileRows || []).map((row: any) => [
				row.id,
				{
					name: row.display_name || row.username || row.email || row.id,
					email: row.email || '',
					department: row.department || null,
					avatarUrl: row.avatar_url || null,
				},
			])
		);

		const summaryMap = new Map(
			(summaryRes.data || []).map((row: any) => [
				row.user_id,
				{
					hours: row.total_hours != null ? Number(row.total_hours) : 0,
					hourlyRate: row.hourly_cost != null ? Number(row.hourly_cost) : 0,
					laborCost: row.labor_cost != null ? Number(row.labor_cost) : 0,
				},
			])
		);

		return memberRows.map((row: any) => {
			const profile = profileMap.get(row.user_id);
			const summary = summaryMap.get(row.user_id);

			return {
				orgId: row.org_id,
				userId: row.user_id,
				name: profile?.name || row.user_id,
				email: profile?.email || '',
				department: profile?.department || null,
				avatarUrl: profile?.avatarUrl || null,
				role: row.role,
				employmentStatus: row.employment_status,
				hours: summary?.hours || 0,
				hourlyRate: summary?.hourlyRate || 0,
				laborCost: summary?.laborCost || 0,
				output: 0,
				unitPrice: 0,
				efficiency: 0,
			};
		});
	}

	async getProjectReportRecords(): Promise<ProjectReportRecord[]> {
		const user = await this.requireUser();
		const tt = supabase.schema('time_tracker');

		const { data: currentMembership, error: membershipError } = await tt
			.from('org_members')
			.select('org_id')
			.eq('user_id', user.id)
			.eq('employment_status', 'active')
			.order('joined_at', { ascending: true })
			.limit(1)
			.maybeSingle();
		trackDbCall('select', 'time_tracker.org_members', 'getProjectReportRecords.currentMembership');

		if (membershipError) throw membershipError;
		if (!currentMembership) return [];

		const orgId = currentMembership.org_id;

		const { data, error } = await tt
			.from('v_project_financial_summary')
			.select('*')
			.eq('org_id', orgId)
			.order('project_name', { ascending: true });
		trackDbCall('select', 'time_tracker.v_project_financial_summary', 'getProjectReportRecords.summary');

		if (error) throw error;

		return (data || []).map((row: any) => {
			const totalReceived = row.total_received != null ? Number(row.total_received) : 0;
			const totalCost = row.total_cost != null ? Number(row.total_cost) : 0;
			const recognizedRevenue = row.recognized_revenue != null ? Number(row.recognized_revenue) : 0;
			const receivable = row.receivable != null ? Number(row.receivable) : 0;
			const laborCost = row.labor_cost != null ? Number(row.labor_cost) : 0;
			const expenseCost = row.expense_cost != null ? Number(row.expense_cost) : 0;
			const projectHours = row.total_hours != null ? Number(row.total_hours) : 0;
			const contractAmount = row.contract_amount != null ? Number(row.contract_amount) : 0;
			const grossProfit = row.gross_profit != null ? Number(row.gross_profit) : 0;
			const cashNetFlow = row.cash_net_flow != null ? Number(row.cash_net_flow) : 0;
			const progress = row.completion_progress != null ? Number(row.completion_progress) : 0;
			const profitRate = recognizedRevenue > 0 ? (grossProfit / recognizedRevenue) * 100 : 0;
			const externalRisk = recognizedRevenue > 0 ? receivable / recognizedRevenue : 0;
			const internalRisk = recognizedRevenue > 0 ? laborCost / recognizedRevenue : 0;
			const prepaid = totalReceived > recognizedRevenue ? totalReceived - recognizedRevenue : 0;
			const hoursBudget = 0;
			const hoursRate = hoursBudget > 0 ? (projectHours / hoursBudget) * 100 : 0;
			const hourlyValue = projectHours > 0 ? recognizedRevenue / projectHours : 0;
			const mainCost = cashNetFlow < 0 ? Math.abs(cashNetFlow) : 0;
			const cashAsset = cashNetFlow > 0 ? cashNetFlow : 0;
			const costRate = contractAmount > 0 ? (totalCost / contractAmount) * 100 : 0;

			let status: ProjectReportRecord['status'] = '激活';
			if (row.status === 'completed') status = '已完成';
			if (row.status === 'archived') status = '已归档';

			return {
				projectId: row.project_id,
				orgId: row.org_id,
				name: row.project_name,
				status,
				receivable,
				externalRisk,
				internalRisk,
				progress,
				cashAsset,
				mainCost,
				prepaid,
				equity: grossProfit,
				revenue: recognizedRevenue,
				cost: totalCost,
				profit: grossProfit,
				profitRate,
				hours: projectHours,
				hourlyValue,
				cashIn: totalReceived,
				cashOut: totalCost,
				netCashFlow: cashNetFlow,
				contractAmount,
				hoursBudget,
				actualHours: projectHours,
				hoursRate,
				laborCost,
				costRate,
			};
		});
	}

	async getProjectDetailRecord(projectId: string): Promise<ProjectDetailRecord | null> {
		await this.requireUser();
		const { orgId } = await this.requireActiveOrgMembership();
		const tt = this.tt();

		const [projectRes, summaryRes, paymentsRes, expensesRes] = await Promise.all([
			tt
				.from('projects')
				.select('id, org_id, name, manager_user_id, contract_amount, human_cost_budget, completion_progress, estimated_completion_date, status, source_project_code')
				.eq('org_id', orgId)
				.eq('id', projectId)
				.maybeSingle(),
			tt
				.from('v_project_financial_summary')
				.select('project_id, org_id, recognized_revenue, total_received, total_hours, labor_cost, expense_cost, total_cost, gross_profit, receivable, cash_net_flow')
				.eq('org_id', orgId)
				.eq('project_id', projectId)
				.maybeSingle(),
			tt
				.from('project_payments')
				.select('id', { count: 'exact', head: true })
				.eq('org_id', orgId)
				.eq('project_id', projectId),
			tt
				.from('project_expenses')
				.select('id', { count: 'exact', head: true })
				.eq('org_id', orgId)
				.eq('project_id', projectId),
		]);
		trackDbCall('select', 'time_tracker.projects', 'getProjectDetailRecord.project');
		trackDbCall('select', 'time_tracker.v_project_financial_summary', 'getProjectDetailRecord.summary');
		trackDbCall('select', 'time_tracker.project_payments', 'getProjectDetailRecord.payments');
		trackDbCall('select', 'time_tracker.project_expenses', 'getProjectDetailRecord.expenses');

		if (projectRes.error) throw projectRes.error;
		if (summaryRes.error) throw summaryRes.error;
		if (paymentsRes.error) throw paymentsRes.error;
		if (expensesRes.error) throw expensesRes.error;
		if (!projectRes.data) return null;

		let managerName: string | null = null;
		if (projectRes.data.manager_user_id) {
			const managerRes = await tt
				.from('v_user_profiles')
				.select('display_name, username, email')
				.eq('id', projectRes.data.manager_user_id)
				.maybeSingle();
			trackDbCall('select', 'time_tracker.v_user_profiles', 'getProjectDetailRecord.manager');
			if (managerRes.error) throw managerRes.error;
			managerName = managerRes.data?.display_name || managerRes.data?.username || managerRes.data?.email || null;
		}

		const summary = summaryRes.data;
		const contractAmount = projectRes.data.contract_amount != null ? Number(projectRes.data.contract_amount) : 0;
		const humanCostBudget = projectRes.data.human_cost_budget != null ? Number(projectRes.data.human_cost_budget) : 0;
		const completionProgress = projectRes.data.completion_progress != null ? Number(projectRes.data.completion_progress) : 0;
		const recognizedRevenue = summary?.recognized_revenue != null ? Number(summary.recognized_revenue) : 0;
		const totalReceived = summary?.total_received != null ? Number(summary.total_received) : 0;
		const totalHours = summary?.total_hours != null ? Number(summary.total_hours) : 0;
		const laborCost = summary?.labor_cost != null ? Number(summary.labor_cost) : 0;
		const expenseCost = summary?.expense_cost != null ? Number(summary.expense_cost) : 0;
		const totalCost = summary?.total_cost != null ? Number(summary.total_cost) : 0;
		const grossProfit = summary?.gross_profit != null ? Number(summary.gross_profit) : 0;
		const receivable = summary?.receivable != null ? Number(summary.receivable) : 0;
		const cashNetFlow = summary?.cash_net_flow != null ? Number(summary.cash_net_flow) : 0;
		const hourlyValue = totalHours > 0 ? recognizedRevenue / totalHours : null;
		const externalRisk = recognizedRevenue > 0 ? (receivable / recognizedRevenue) * 100 : null;
		const internalRisk = recognizedRevenue > 0 ? (laborCost / recognizedRevenue) * 100 : null;
		const estimatedCompletionDate = projectRes.data.estimated_completion_date || null;
		const remainingDays = estimatedCompletionDate
			? Math.ceil((new Date(`${estimatedCompletionDate}T00:00:00`).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
			: null;

		let status: ProjectDetailRecord['status'] = '激活';
		if (projectRes.data.status === 'completed') status = '已完成';
		if (projectRes.data.status === 'archived') status = '已归档';

		return {
			projectId: projectRes.data.id,
			orgId: projectRes.data.org_id,
			name: projectRes.data.name,
			status,
			managerName,
			sourceProjectCode: projectRes.data.source_project_code || null,
			contractAmount,
			humanCostBudget,
			completionProgress,
			estimatedCompletionDate,
			remainingDays,
			recognizedRevenue,
			totalReceived,
			totalHours,
			laborCost,
			expenseCost,
			totalCost,
			grossProfit,
			receivable,
			cashNetFlow,
			hourlyValue,
			externalRisk,
			internalRisk,
			paymentCount: paymentsRes.count ?? 0,
			expenseCount: expensesRes.count ?? 0,
		};
	}

	async getProjectMembersBundle(projectId: string): Promise<ProjectMembersBundle | null> {
		await this.requireUser();
		const membership = await this.requireActiveOrgMembership();
		const tt = this.tt();

		const [projectRes, orgMembersRes, projectMembersRes] = await Promise.all([
			tt
				.from('projects')
				.select('id, org_id')
				.eq('org_id', membership.orgId)
				.eq('id', projectId)
				.maybeSingle(),
			tt
				.from('org_members')
				.select('id, user_id, role, employment_status')
				.eq('org_id', membership.orgId)
				.eq('employment_status', 'active')
				.order('joined_at', { ascending: true }),
			tt
				.from('project_members')
				.select('id, user_id, status, joined_at, left_at')
				.eq('org_id', membership.orgId)
				.eq('project_id', projectId),
		]);
		trackDbCall('select', 'time_tracker.projects', 'getProjectMembersBundle.project');
		trackDbCall('select', 'time_tracker.org_members', 'getProjectMembersBundle.orgMembers');
		trackDbCall('select', 'time_tracker.project_members', 'getProjectMembersBundle.projectMembers');

		if (projectRes.error) throw projectRes.error;
		if (orgMembersRes.error) throw orgMembersRes.error;
		if (projectMembersRes.error) throw projectMembersRes.error;
		if (!projectRes.data) return null;

		const orgMembers = orgMembersRes.data ?? [];
		const projectMembers = projectMembersRes.data ?? [];
		const userIds = orgMembers.map((row: any) => row.user_id);

		const profilesRes = userIds.length > 0
			? await tt
				.from('v_user_profiles')
				.select('id, email, display_name, username')
				.in('id', userIds)
			: { data: [], error: null };
		trackDbCall('select', 'time_tracker.v_user_profiles', 'getProjectMembersBundle.profiles');
		if (profilesRes.error) throw profilesRes.error;

		const profileMap = new Map((profilesRes.data ?? []).map((row: any) => [row.id, row]));
		const projectMemberMap = new Map(projectMembers.map((row: any) => [row.user_id, row]));

		const materialized = orgMembers.map((row: any) => {
			const profile = profileMap.get(row.user_id);
			const projectMember = projectMemberMap.get(row.user_id);
			const name = profile?.display_name || profile?.username || profile?.email || row.user_id;
			return {
				projectMemberId: projectMember?.id || `${projectId}:${row.user_id}`,
				userId: row.user_id,
				name,
				email: profile?.email || null,
				role: row.role,
				status: projectMember?.status === 'exited' ? 'exited' : (projectMember ? 'active' : 'available'),
				joinedAt: projectMember?.joined_at || null,
				leftAt: projectMember?.left_at || null,
				initial: String(name).trim().charAt(0).toUpperCase() || '?',
				color: this.getProjectMemberColor(String(row.user_id)),
			};
		});

		return {
			projectId,
			activeMembers: materialized.filter((row) => row.status === 'active'),
			exitedMembers: materialized.filter((row) => row.status === 'exited'),
			availableMembers: materialized.filter((row) => row.status === 'available'),
			canManageMembers: this.canManageProjectsRole(membership.role),
		};
	}

	async addProjectMember(projectId: string, userId: string): Promise<void> {
		await this.requireUser();
		const membership = await this.requireActiveOrgMembership();
		if (!this.canManageProjectsRole(membership.role)) {
			throw new Error('当前角色无权管理项目成员');
		}

		const tt = this.tt();
		const { error } = await tt
			.from('project_members')
			.upsert({
				org_id: membership.orgId,
				project_id: projectId,
				user_id: userId,
				status: 'active',
				joined_at: new Date().toISOString(),
				left_at: null,
				updated_at: new Date().toISOString(),
			}, { onConflict: 'project_id,user_id' });
		trackDbCall('upsert', 'time_tracker.project_members', 'addProjectMember');
		if (error) throw error;
	}

	async exitProjectMember(projectId: string, userId: string): Promise<void> {
		await this.requireUser();
		const membership = await this.requireActiveOrgMembership();
		if (!this.canManageProjectsRole(membership.role)) {
			throw new Error('当前角色无权管理项目成员');
		}

		const { error } = await this.tt()
			.from('project_members')
			.update({
				status: 'exited',
				left_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq('org_id', membership.orgId)
			.eq('project_id', projectId)
			.eq('user_id', userId);
		trackDbCall('update', 'time_tracker.project_members', 'exitProjectMember');
		if (error) throw error;
	}

	async restoreProjectMember(projectId: string, userId: string): Promise<void> {
		await this.requireUser();
		const membership = await this.requireActiveOrgMembership();
		if (!this.canManageProjectsRole(membership.role)) {
			throw new Error('当前角色无权管理项目成员');
		}

		const { error } = await this.tt()
			.from('project_members')
			.update({
				status: 'active',
				left_at: null,
				updated_at: new Date().toISOString(),
			})
			.eq('org_id', membership.orgId)
			.eq('project_id', projectId)
			.eq('user_id', userId);
		trackDbCall('update', 'time_tracker.project_members', 'restoreProjectMember');
		if (error) throw error;
	}

	async getOrgReportBundle(): Promise<OrgReportBundle | null> {
		const user = await this.requireUser();
		const tt = supabase.schema('time_tracker');

		const { data: currentMembership, error: membershipError } = await tt
			.from('org_members')
			.select('org_id')
			.eq('user_id', user.id)
			.eq('employment_status', 'active')
			.order('joined_at', { ascending: true })
			.limit(1)
			.maybeSingle();
		trackDbCall('select', 'time_tracker.org_members', 'getOrgReportBundle.currentMembership');

		if (membershipError) throw membershipError;
		if (!currentMembership) return null;

		const orgId = currentMembership.org_id;

		const [orgRes, kpiRes, monthlyRes, membersRes, costRes] = await Promise.all([
			tt
				.from('organizations')
				.select('id, name, default_human_cost_ratio')
				.eq('id', orgId)
				.single(),
			tt
				.from('v_org_financial_kpi')
				.select('*')
				.eq('org_id', orgId)
				.maybeSingle(),
			tt
				.from('v_org_capacity_monthly')
				.select('*')
				.eq('org_id', orgId)
				.order('month_start', { ascending: true }),
			tt
				.from('org_members')
				.select('user_id')
				.eq('org_id', orgId)
				.eq('employment_status', 'active'),
			tt
				.from('employee_costs')
				.select('user_id, hourly_cost')
				.eq('org_id', orgId)
				.is('effective_to', null),
		]);
		trackDbCall('select', 'time_tracker.organizations', 'getOrgReportBundle.organization');
		trackDbCall('select', 'time_tracker.v_org_financial_kpi', 'getOrgReportBundle.kpi');
		trackDbCall('select', 'time_tracker.v_org_capacity_monthly', 'getOrgReportBundle.monthly');
		trackDbCall('select', 'time_tracker.org_members', 'getOrgReportBundle.members');
		trackDbCall('select', 'time_tracker.employee_costs', 'getOrgReportBundle.costs');

		if (orgRes.error) throw orgRes.error;
		if (kpiRes.error) throw kpiRes.error;
		if (monthlyRes.error) throw monthlyRes.error;
		if (membersRes.error) throw membersRes.error;
		if (costRes.error) throw costRes.error;

		const monthly = (monthlyRes.data || []).map((row: any) => {
			const totalHours = row.total_hours != null ? Number(row.total_hours) : 0;
			const capacityHours = row.capacity_hours != null ? Number(row.capacity_hours) : 0;
			return {
				monthStart: row.month_start,
				totalHours,
				capacityHours,
				capacityUtilization: capacityHours > 0 ? (totalHours / capacityHours) * 100 : 0,
			};
		});

		const latestMonth = monthly.length > 0
			? monthly[monthly.length - 1]
			: {
				monthStart: new Date().toISOString().slice(0, 10),
				totalHours: 0,
				capacityHours: 0,
				capacityUtilization: 0,
			};

		const activeMemberCount = (membersRes.data || []).length;
		const activeCosts = (costRes.data || [])
			.map((row: any) => row.hourly_cost != null ? Number(row.hourly_cost) : 0)
			.filter((value: number) => Number.isFinite(value) && value > 0);
		const avgHourlyCost = activeCosts.length > 0
			? activeCosts.reduce((sum: number, value: number) => sum + value, 0) / activeCosts.length
			: 0;
		const defaultHumanCostRatio = orgRes.data.default_human_cost_ratio != null
			? Number(orgRes.data.default_human_cost_ratio)
			: 0;
		const ratioDecimal = defaultHumanCostRatio > 0 ? defaultHumanCostRatio / 100 : 0;
		const estimatedMonthlyCapacityValue = ratioDecimal > 0
			? (latestMonth.capacityHours * avgHourlyCost) / ratioDecimal
			: 0;
		const estimatedDailyCapacityValue = estimatedMonthlyCapacityValue > 0
			? estimatedMonthlyCapacityValue / 21.75
			: 0;

		const remainingContractAmount = kpiRes.data?.remaining_contract_amount != null ? Number(kpiRes.data.remaining_contract_amount) : 0;
		const totalReceivable = kpiRes.data?.total_receivable != null ? Number(kpiRes.data.total_receivable) : 0;
		const totalReceived = kpiRes.data?.total_received != null ? Number(kpiRes.data.total_received) : 0;
		const totalCost = kpiRes.data?.total_cost != null ? Number(kpiRes.data.total_cost) : 0;
		const projectCount = kpiRes.data?.project_count != null ? Number(kpiRes.data.project_count) : 0;
		const productionDays = estimatedMonthlyCapacityValue > 0 ? (remainingContractAmount / estimatedMonthlyCapacityValue) * 30 : 0;
		const inventoryDays = estimatedDailyCapacityValue > 0 ? totalReceivable / estimatedDailyCapacityValue : 0;
		const avgWeeklyHoursPerMember = activeMemberCount > 0 ? latestMonth.totalHours / activeMemberCount / 4.35 : 0;
		const avgMonthlyHoursPerMember = activeMemberCount > 0 ? latestMonth.totalHours / activeMemberCount : 0;

		return {
			snapshot: {
				orgId,
				orgName: orgRes.data.name,
				activeMemberCount,
				projectCount,
				remainingContractAmount,
				totalReceivable,
				totalReceived,
				totalCost,
				currentMonthHours: latestMonth.totalHours,
				currentMonthCapacityHours: latestMonth.capacityHours,
				capacityUtilization: latestMonth.capacityUtilization,
				estimatedMonthlyCapacityValue,
				estimatedDailyCapacityValue,
				productionDays,
				inventoryDays,
				avgWeeklyHoursPerMember,
				avgMonthlyHoursPerMember,
			},
			monthly,
		};
	}
	async getOrgActivityLogRecords(): Promise<OrgActivityLogRecord[]> {
		const user = await this.requireUser();
		const tt = supabase.schema('time_tracker');

		const { data: currentMembership, error: membershipError } = await tt
			.from('org_members')
			.select('org_id')
			.eq('user_id', user.id)
			.eq('employment_status', 'active')
			.order('joined_at', { ascending: true })
			.limit(1)
			.maybeSingle();
		trackDbCall('select', 'time_tracker.org_members', 'getOrgActivityLogRecords.currentMembership');

		if (membershipError) throw membershipError;
		if (!currentMembership) return [];

		const orgId = currentMembership.org_id;
		const { data: logRows, error: logError } = await tt
			.from('org_activity_logs')
			.select('*')
			.eq('org_id', orgId)
			.order('created_at', { ascending: false });
		trackDbCall('select', 'time_tracker.org_activity_logs', 'getOrgActivityLogRecords.logs');

		if (logError) throw logError;

		const actorIds = Array.from(new Set((logRows || []).map((row: any) => row.actor_user_id).filter(Boolean)));
		let profileMap = new Map<string, { name: string; email: string; avatarUrl: string | null }>();

		if (actorIds.length > 0) {
			const { data: profileRows, error: profilesError } = await tt
				.from('v_user_profiles')
				.select('id, email, display_name, username, avatar_url')
				.in('id', actorIds);
			trackDbCall('select', 'time_tracker.v_user_profiles', 'getOrgActivityLogRecords.profiles');

			if (profilesError) throw profilesError;

			profileMap = new Map(
				(profileRows || []).map((row: any) => [
					row.id,
					{
						name: row.display_name || row.username || row.email || row.id,
						email: row.email || '',
						avatarUrl: row.avatar_url || null,
					},
				])
			);
		}

		return (logRows || []).map((row: any) => {
			const actor = row.actor_user_id ? profileMap.get(row.actor_user_id) : null;
			return {
				id: row.id,
				orgId: row.org_id,
				actorUserId: row.actor_user_id || null,
				actorName: actor?.name || 'System',
				actorEmail: actor?.email || '',
				actorAvatarUrl: actor?.avatarUrl || null,
				actionType: row.action_type,
				targetType: row.target_type,
				description: row.description,
				createdAt: row.created_at,
			};
		});
	}
	// ===== 公共行映射器 =====

	private mapTaskRow(row: any): Task {
		const duration = row.duration != null
			? row.duration
			: row.duration_minutes != null
				? Number(row.duration_minutes) * 60 * 1000
				: undefined;
		const hours = row.hours != null
			? Number(row.hours)
			: row.duration_minutes != null
				? Math.round((Number(row.duration_minutes) / 60) * 100) / 100
				: undefined;

		return {
			id: row.id,
			title: row.title || row.task_name,
			description: row.description || row.notes || undefined,
			startTime: row.start_time ? new Date(row.start_time) : new Date(row.work_date || Date.now()),
			endTime: row.end_time ? new Date(row.end_time) : undefined,
			duration,
			project: row.project_name || this.extractProjectName(row.project),
			client: row.client || undefined,
			category: row.category_id || row.task_template_id || undefined,
			entry_type: row.entry_type || (row.start_time || row.end_time ? 'timer' : 'manual'),
			work_date: row.work_date || undefined,
			hours,
			approval_status: row.approval_status || 'pending',
			approved_by: row.approved_by || undefined,
			approved_at: row.approved_at || undefined,
			insertedAt: row.inserted_at ? new Date(row.inserted_at) : row.created_at ? new Date(row.created_at) : undefined,
			updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
		};
	}
}
