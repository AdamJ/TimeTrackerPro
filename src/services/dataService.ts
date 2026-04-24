import { DayRecord, Project, TodoItem } from "@/contexts/TimeTrackingContext";
import { Task } from "@/contexts/TimeTrackingContext";
import { TaskCategory } from "@/config/categories";
import { LocalStorageService } from "@/services/localStorageService";
import { SupabaseService } from "@/services/supabaseService";

export { STORAGE_KEYS } from "@/services/localStorageService";

// Current day data structure
export interface CurrentDayData {
	isDayStarted: boolean;
	dayStartTime: Date | null;
	currentTask: Task | null;
	tasks: Task[];
}

// ===== v2.0 新增类型定义：回溯式工时填报 =====

/** 日历单日工时汇总条目 */
export interface DailyTimesheetEntry {
	date: string;           // '2026-04-15'
	totalHours: number;     // 当日合计小时数
	entries: {
		projectName: string;
		projectId?: string;
		projectColor?: string;
		hours: number;
		entryType: 'timer' | 'manual';
		approvalStatus: 'pending' | 'approved' | 'rejected';
		taskId: string;
		description?: string;
		isAutoTime?: boolean;
	}[];
}

/** 手动填报工时条目 */
export interface ManualTimeEntry {
	projectId: string;
	projectName: string;
	categoryId?: string;
	categoryName?: string;
	workDate: string;       // ISO date: '2026-04-15'
	hours: number;          // 支持 0.5 精度
	description?: string;
}

/** 项目健康度统计 */
export interface ProjectHealthStat {
	project_id: string;
	project_name: string;
	actual_cost: number;
	total_hours: number;
}

/** 当前用户曾经写入过工时的项目，用于快速填报中的“参与过的项目”分组 */
export interface ParticipatedProjectOption {
	projectId: string;
	projectName: string;
	usedAt: string;
}

export interface AdminOrganizationProfile {
	id: string;
	name: string;
	description: string | null;
	ownerUserId: string;
	ownerName: string;
	ownerEmail: string;
	logoUrl: string | null;
	standardDailyHours: number;
	standardWeeklyHours: number;
	defaultHumanCostRatio: number;
}

export interface AdminMemberSettingsRecord {
	membershipId: string;
	orgId: string;
	userId: string;
	name: string;
	email: string;
	username: string | null;
	department: string | null;
	avatarUrl: string | null;
	role: 'owner' | 'admin' | 'finance' | 'hr' | 'project_manager' | 'member';
	employmentStatus: 'active' | 'inactive' | 'departed';
	dataScope: 'self' | 'team' | 'org' | 'finance_only';
	annualSalary: number | null;
	annualWorkHours: number | null;
	hourlyCost: number | null;
}

export interface AdminProjectSettingsRecord {
	id: string;
	orgId: string;
	name: string;
	sourceSystem: string | null;
	sourceProjectId: string | null;
	sourceProjectCode: string | null;
	managerUserId: string | null;
	managerName: string | null;
	contractAmount: number | null;
	humanCostBudget: number | null;
	humanCostRatio: number | null;
	completionProgress: number | null;
	estimatedCompletionDate: string | null;
	managerCostRatio: number | null;
	companyCostRatio: number | null;
	status: 'active' | 'completed' | 'archived';
}

export interface AdminTaskTemplateRecord {
	id: string;
	orgId: string;
	groupName: string;
	taskName: string;
	sortOrder: number;
	isActive: boolean;
}

export interface AdminSettingsBundle {
	organization: AdminOrganizationProfile;
	currentUserId: string;
	currentUserRole: AdminMemberSettingsRecord['role'];
	members: AdminMemberSettingsRecord[];
	projects: AdminProjectSettingsRecord[];
	taskTemplates: AdminTaskTemplateRecord[];
}

export interface MemberReportRecord {
	orgId: string;
	userId: string;
	name: string;
	email: string;
	department: string | null;
	avatarUrl: string | null;
	role: AdminMemberSettingsRecord['role'];
	employmentStatus: AdminMemberSettingsRecord['employmentStatus'];
	hours: number;
	hourlyRate: number;
	laborCost: number;
	output: number;
	unitPrice: number;
	efficiency: number;
}

export interface ProjectReportRecord {
	projectId: string;
	orgId: string;
	name: string;
	status: '激活' | '已完成' | '已归档';
	receivable: number;
	externalRisk: number;
	internalRisk: number;
	progress: number;
	cashAsset: number;
	mainCost: number;
	prepaid: number;
	equity: number;
	revenue: number;
	cost: number;
	profit: number;
	profitRate: number;
	hours: number;
	hourlyValue: number;
	cashIn: number;
	cashOut: number;
	netCashFlow: number;
	contractAmount: number;
	hoursBudget: number;
	actualHours: number;
	hoursRate: number;
	laborCost: number;
	costRate: number;
}

export interface ProjectDetailRecord {
	projectId: string;
	orgId: string;
	name: string;
	status: '激活' | '已完成' | '已归档';
	managerName: string | null;
	sourceProjectCode: string | null;
	contractAmount: number;
	humanCostBudget: number;
	completionProgress: number;
	estimatedCompletionDate: string | null;
	remainingDays: number | null;
	recognizedRevenue: number;
	totalReceived: number;
	totalHours: number;
	laborCost: number;
	expenseCost: number;
	totalCost: number;
	grossProfit: number;
	receivable: number;
	cashNetFlow: number;
	hourlyValue: number | null;
	externalRisk: number | null;
	internalRisk: number | null;
	paymentCount: number;
	expenseCount: number;
}

export interface ProjectMemberRecord {
	projectMemberId: string;
	userId: string;
	name: string;
	email: string | null;
	role: 'owner' | 'admin' | 'finance' | 'hr' | 'project_manager' | 'member';
	status: 'active' | 'exited';
	joinedAt: string | null;
	leftAt: string | null;
	initial: string;
	color: string;
}

export interface ProjectMembersBundle {
	projectId: string;
	activeMembers: ProjectMemberRecord[];
	exitedMembers: ProjectMemberRecord[];
	availableMembers: ProjectMemberRecord[];
	canManageMembers: boolean;
}

export interface OrgCapacityMonthlyRecord {
	monthStart: string;
	totalHours: number;
	capacityHours: number;
	capacityUtilization: number;
}

export interface OrgReportSnapshot {
	orgId: string;
	orgName: string;
	activeMemberCount: number;
	projectCount: number;
	remainingContractAmount: number;
	totalReceivable: number;
	totalReceived: number;
	totalCost: number;
	currentMonthHours: number;
	currentMonthCapacityHours: number;
	capacityUtilization: number;
	estimatedMonthlyCapacityValue: number;
	estimatedDailyCapacityValue: number;
	productionDays: number;
	inventoryDays: number;
	avgWeeklyHoursPerMember: number;
	avgMonthlyHoursPerMember: number;
}

export interface OrgReportBundle {
	snapshot: OrgReportSnapshot;
	monthly: OrgCapacityMonthlyRecord[];
}
export interface OrgActivityLogRecord {
	id: string;
	orgId: string;
	actorUserId: string | null;
	actorName: string;
	actorEmail: string;
	actorAvatarUrl: string | null;
	actionType: string;
	targetType: 'org' | 'project' | 'member' | 'template' | 'task';
	description: string;
	createdAt: string;
}
export interface SaveAdminOrganizationInput {
	orgId: string;
	name: string;
	description: string | null;
	logoUrl: string | null;
	standardDailyHours: number;
	standardWeeklyHours: number;
	defaultHumanCostRatio: number;
}

export interface SaveAdminMemberInput {
	membershipId: string;
	orgId: string;
	userId: string;
	role: AdminMemberSettingsRecord['role'];
	employmentStatus: AdminMemberSettingsRecord['employmentStatus'];
	dataScope: AdminMemberSettingsRecord['dataScope'];
	annualSalary: number | null;
	annualWorkHours: number | null;
	hourlyCost: number | null;
}

export interface SaveAdminProjectInput {
	id?: string;
	orgId: string;
	name: string;
	sourceSystem?: string | null;
	sourceProjectId?: string | null;
	sourceProjectCode?: string | null;
	managerUserId: string | null;
	contractAmount: number | null;
	humanCostBudget: number | null;
	humanCostRatio: number | null;
	completionProgress: number | null;
	estimatedCompletionDate: string | null;
	managerCostRatio: number | null;
	companyCostRatio: number | null;
	status: AdminProjectSettingsRecord['status'];
}

export interface SaveAdminTaskTemplateInput {
	id?: string;
	orgId: string;
	groupName: string;
	taskName: string;
	sortOrder: number;
	isActive: boolean;
}

export interface SyncAdminProjectsResult {
	sourceTotal: number;
	inserted: number;
	updated: number;
	skipped: number;
}

// Data service interface
export interface DataService {
	// Current day operations
	saveCurrentDay: (data: CurrentDayData) => Promise<void>;
	getCurrentDay: () => Promise<CurrentDayData | null>;

	// Archived days operations
	saveArchivedDays: (days: DayRecord[]) => Promise<void>;
	getArchivedDays: () => Promise<DayRecord[]>;
	updateArchivedDay: (id: string, updates: Partial<DayRecord>) => Promise<void>;
	deleteArchivedDay: (id: string) => Promise<void>;

	// Projects operations
	saveProjects: (projects: Project[]) => Promise<void>;
	getProjects: () => Promise<Project[]>;

	// Categories operations
	saveCategories: (categories: TaskCategory[]) => Promise<void>;
	getCategories: () => Promise<TaskCategory[]>;

	// Todo items operations
	saveTodos: (todos: TodoItem[]) => Promise<void>;
	getTodos: () => Promise<TodoItem[]>;

	// Migration operations
	migrateFromLocalStorage: () => Promise<void>;
	migrateToLocalStorage: () => Promise<void>;

	// ===== v2.0 新增：回溯式工时填报 =====

	/** 获取指定月份的日工时汇总（日历渲染用） */
	getMonthlyTimesheet: (year: number, month: number) => Promise<DailyTimesheetEntry[]>;

	/** 获取当前用户参与过的项目，按工时记录提交/更新时间倒序 */
	getParticipatedProjects: () => Promise<ParticipatedProjectOption[]>;

	/** 提交一条回溯工时记录 */
	submitManualEntry: (entry: ManualTimeEntry) => Promise<Task>;

	/** 更新一条已有的回溯记录 */
	updateManualEntry: (taskId: string, updates: Partial<ManualTimeEntry>) => Promise<void>;

	/** 删除一条回溯记录（仅限 pending 状态） */
	deleteManualEntry: (taskId: string) => Promise<void>;

	/** 获取指定日期的详细工时记录列表 */
	getDayEntries: (date: string) => Promise<Task[]>;

	// ===== v2.0 新增：审批流（从 as any 提升为正式接口） =====

	/** 批量审批 */
	batchApproveTasks: (taskIds: string[]) => Promise<void>;

	/** 获取待审批任务列表 */
	getPendingApprovalTasks: () => Promise<Task[]>;

	/** 获取项目健康度统计 */
	getProjectHealthStats: () => Promise<ProjectHealthStat[]>;

	/** 获取管理后台组织/成员/项目/模板数据 */
	getAdminSettingsBundle: () => Promise<AdminSettingsBundle | null>;

	/** 更新组织设置 */
	saveAdminOrganization: (input: SaveAdminOrganizationInput) => Promise<void>;

	/** 更新成员角色/成本设置 */
	saveAdminMember: (input: SaveAdminMemberInput) => Promise<void>;

	/** 新增或更新项目设置 */
	saveAdminProject: (input: SaveAdminProjectInput) => Promise<void>;

	/** 从 SA-AI-APP 项目主数据同步项目名称 */
	syncAdminProjectsFromSource: () => Promise<SyncAdminProjectsResult>;

	/** 新增或更新任务模板 */
	saveAdminTaskTemplate: (input: SaveAdminTaskTemplateInput) => Promise<void>;

	/** 获取成员全局报表数据 */
	getMemberReportRecords: () => Promise<MemberReportRecord[]>;

	/** 获取项目全局报表数据 */
	getProjectReportRecords: () => Promise<ProjectReportRecord[]>;

	/** 获取单个项目详情 */
	getProjectDetailRecord: (projectId: string) => Promise<ProjectDetailRecord | null>;

	/** 获取项目成员配置 */
	getProjectMembersBundle: (projectId: string) => Promise<ProjectMembersBundle | null>;

	/** 添加项目成员 */
	addProjectMember: (projectId: string, userId: string) => Promise<void>;

	/** 移出项目成员 */
	exitProjectMember: (projectId: string, userId: string) => Promise<void>;

	/** 恢复已退出项目成员 */
	restoreProjectMember: (projectId: string, userId: string) => Promise<void>;

	/** 获取组织报表主卡与趋势数据 */
	getOrgReportBundle: () => Promise<OrgReportBundle | null>;

	/** 获取组织日志 */
	getOrgActivityLogRecords: () => Promise<OrgActivityLogRecord[]>;
}

// Factory function to get the appropriate service
export const createDataService = (isAuthenticated: boolean): DataService => {
	return isAuthenticated ? new SupabaseService() : new LocalStorageService();
};
