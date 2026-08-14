export type ServiceAvailability = 'up' | 'down';

export interface SystemHealth {
  status: 'ok' | 'degraded';
  services: {
    api: ServiceAvailability;
    database: ServiceAvailability;
  };
  timestamp: string;
}

export interface LivenessHealth {
  status: 'ok';
  services: {
    api: 'up';
  };
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  path: string;
  requestId: string;
  timestamp: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export type UserRoleCode = 'admin' | 'manager' | 'member';
export type UserStatus = 'active' | 'disabled';
export type PermissionCode =
  | 'users.read'
  | 'users.manage'
  | 'projects.read'
  | 'projects.manage'
  | 'tasks.read'
  | 'tasks.manage'
  | 'carrier-contracts.read'
  | 'carrier-contracts.manage'
  | 'revenue.read'
  | 'revenue.manage';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  roleCodes: UserRoleCode[];
  permissions: PermissionCode[];
}

export interface AuthSessionResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: AuthUser;
}

export interface UserListItem {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  roleCodes: UserRoleCode[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  displayName: string;
  password: string;
  roleCodes: UserRoleCode[];
}

export type ProjectStatus =
  | 'planning'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'archived';

export type ProjectOperationalStatus =
  | 'not_started'
  | 'in_progress'
  | 'partial'
  | 'operational';

export type ProjectDataSource = 'Teldata' | 'IBS' | 'DoanhThu';

export type ProjectDataQualityFilter =
  | 'has_revenue'
  | 'missing_capex'
  | 'conflict';

export type ProjectMembershipRole = 'owner' | 'manager' | 'member';

export interface ProjectListItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  operationalStatus?: ProjectOperationalStatus;
  signedDate?: string;
  address?: string;
  province?: string;
  investor?: string;
  projectType?: string;
  scaleDescription?: string;
  unitCount?: number;
  floorAreaM2?: number;
  landAreaHa?: number;
  investmentUnit?: string;
  dataSources?: ProjectDataSource[];
  dataConflict?: boolean;
  carrierContractCount?: number;
  revenueTotal?: number;
  costTotal?: number;
  capex?: number;
  startDate?: string;
  dueDate?: string;
  memberCount: number;
  myRole?: ProjectMembershipRole;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectListItem {
  createdBy: string;
  createdAt: string;
}

export interface ProjectMember {
  userId: string;
  email: string;
  displayName: string;
  status: UserStatus;
  role: ProjectMembershipRole;
  joinedAt: string;
}

export interface ProjectMemberCandidate {
  userId: string;
  email: string;
  displayName: string;
}

export interface CreateProjectRequest {
  code: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  operationalStatus?: ProjectOperationalStatus;
  signedDate?: string;
  address?: string;
  province?: string;
  investor?: string;
  projectType?: string;
  scaleDescription?: string;
  unitCount?: number;
  floorAreaM2?: number;
  landAreaHa?: number;
  investmentUnit?: string;
  dataSources?: ProjectDataSource[];
  dataConflict?: boolean;
  carrierContractCount?: number;
  revenueTotal?: number;
  costTotal?: number;
  capex?: number;
  startDate?: string;
  dueDate?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  operationalStatus?: ProjectOperationalStatus;
  signedDate?: string | null;
  address?: string | null;
  province?: string | null;
  investor?: string | null;
  projectType?: string | null;
  scaleDescription?: string | null;
  unitCount?: number | null;
  floorAreaM2?: number | null;
  landAreaHa?: number | null;
  investmentUnit?: string | null;
  dataSources?: ProjectDataSource[] | null;
  dataConflict?: boolean;
  carrierContractCount?: number | null;
  revenueTotal?: number | null;
  costTotal?: number | null;
  capex?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
}

export interface ListProjectsRequest {
  page?: number;
  limit?: number;
  status?: ProjectStatus;
  operationalStatus?: ProjectOperationalStatus;
  dataQuality?: ProjectDataQualityFilter;
  search?: string;
}

export interface UpsertProjectMemberRequest {
  userId: string;
  role: ProjectMembershipRole;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface ProjectTask {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  step: number;
  name: string;
  department: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  status: TaskStatus;
  updatedAt: string;
}

export interface TaskOverview {
  totalTasks: number;
  completedTasks: number;
  tasksWithActualEnd: number;
  trackedProjects: number;
}

export interface TaskListResponse extends PaginatedResponse<ProjectTask> {
  overview: TaskOverview;
}

export interface UpdateTaskRequest {
  department?: string;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualEndDate?: string | null;
  status?: TaskStatus;
}

export type DataQualityIssueType =
  | 'data_conflict'
  | 'missing_capex'
  | 'missing_task_plan'
  | 'overdue_task'
  | 'missing_actual_end';

export interface DataQualitySummary {
  totalProjects: number;
  affectedProjects: number;
  totalIssues: number;
  dataConflictProjects: number;
  missingCapexProjects: number;
  missingTaskPlanProjects: number;
  overdueTasks: number;
  missingActualEndTasks: number;
}

export interface DataQualityProjectIssue {
  projectId: string;
  projectCode: string;
  projectName: string;
  investor?: string;
  province?: string;
  issueTypes: DataQualityIssueType[];
  issueCount: number;
  missingTaskPlanCount: number;
  overdueTaskCount: number;
  missingActualEndCount: number;
  updatedAt: string;
}

export interface DataQualityReportResponse
  extends PaginatedResponse<DataQualityProjectIssue> {
  summary: DataQualitySummary;
}

export interface ListDataQualityRequest {
  page?: number;
  limit?: number;
  issueType?: DataQualityIssueType;
  search?: string;
}

export type CarrierServiceType = 'teldata' | 'ibs';
export type CarrierContractUnit = 'apartment' | 'm2';
export type CarrierPaymentCycle =
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual'
  | 'one_time';

export interface CarrierContract {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  carrier: string;
  serviceType: CarrierServiceType;
  quantity: number;
  unit: CarrierContractUnit;
  unitPrice?: number;
  paymentCycle?: CarrierPaymentCycle;
  startDate?: string;
  endDate?: string;
  termsComplete: boolean;
  penetrationRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CarrierContractOverview {
  totalContracts: number;
  teldataContracts: number;
  ibsContracts: number;
  contractsWithTerms: number;
  coveredProjects: number;
}

export interface CarrierContractListResponse
  extends PaginatedResponse<CarrierContract> {
  overview: CarrierContractOverview;
  availableCarriers: string[];
}

export interface ListCarrierContractsRequest {
  page?: number;
  limit?: number;
  projectId?: string;
  carrier?: string;
  serviceType?: CarrierServiceType;
}

export interface CreateCarrierContractRequest {
  projectId: string;
  carrier: string;
  serviceType: CarrierServiceType;
  quantity: number;
  unitPrice?: number;
  paymentCycle?: CarrierPaymentCycle;
  startDate?: string;
  endDate?: string;
}

export interface UpdateCarrierContractRequest {
  carrier?: string;
  serviceType?: CarrierServiceType;
  quantity?: number;
  unitPrice?: number | null;
  paymentCycle?: CarrierPaymentCycle | null;
  startDate?: string | null;
  endDate?: string | null;
}

export type FiscalQuarter = 1 | 2 | 3 | 4;

export interface RevenueQuarterSummary {
  quarter: FiscalQuarter;
  revenue: number;
  cost: number;
  grossProfit: number;
}

export interface RevenueActual extends RevenueQuarterSummary {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  fiscalYear: number;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueProjectSummary {
  projectId: string;
  projectCode: string;
  projectName: string;
  quarters: RevenueQuarterSummary[];
  revenueTotal: number;
  costTotal: number;
  grossProfit: number;
  grossMargin?: number;
}

export interface RevenueOverview {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossMargin?: number;
  totalProjects: number;
  projectsWithRevenue: number;
  projectsWithoutRevenue: number;
}

export interface RevenueReportResponse
  extends PaginatedResponse<RevenueProjectSummary> {
  fiscalYear: number;
  overview: RevenueOverview;
  quarters: RevenueQuarterSummary[];
}

export interface ListRevenueRequest {
  fiscalYear: number;
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
}

export interface UpsertRevenueActualRequest {
  projectId: string;
  fiscalYear: number;
  quarter: FiscalQuarter;
  revenue: number;
  cost: number;
}

export interface DashboardOverview {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossMargin?: number;
  projectsWithRevenue: number;
  totalProjects: number;
  operationalProjects: number;
  totalCarrierContracts: number;
  teldataContracts: number;
  ibsContracts: number;
  totalTasks: number;
  overdueTasks: number;
  missingCapexProjects: number;
  dataConflictProjects: number;
}

export interface DashboardOperationalStatusSummary {
  status: ProjectOperationalStatus;
  projects: number;
}

export interface DashboardTopRevenueProject {
  projectId: string;
  projectCode: string;
  projectName: string;
  revenue: number;
  cost: number;
  grossProfit: number;
}

export interface DashboardCarrierContractsSummary {
  carrier: string;
  contracts: number;
}

export interface DashboardResponse {
  fiscalYear: number;
  overview: DashboardOverview;
  quarters: RevenueQuarterSummary[];
  operationalStatuses: DashboardOperationalStatusSummary[];
  topRevenueProjects: DashboardTopRevenueProject[];
  carrierContractsByCarrier: DashboardCarrierContractsSummary[];
}
