import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateProjectRequest,
  ListProjectsRequest,
  PaginatedResponse,
  PermissionCode,
  ProjectDetail,
  ProjectMember,
  ProjectMemberCandidate,
  UpdateProjectRequest,
  UpsertProjectMemberRequest,
} from '@project-ql/api-contracts';
import {
  createPagination,
  createPaginationMeta,
} from '../../core/http/pagination';
import {
  PROJECT_REPOSITORY,
  PROJECT_USER_DIRECTORY,
  type CreateProjectRecord,
  type ProjectRepository,
  type ProjectUserDirectory,
  type UpdateProjectRecord,
} from './project-management.ports';

type ProjectTextField =
  | 'address'
  | 'province'
  | 'investor'
  | 'projectType'
  | 'scaleDescription'
  | 'investmentUnit';

@Injectable()
export class ProjectManagementService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projects: ProjectRepository,
    @Inject(PROJECT_USER_DIRECTORY)
    private readonly users: ProjectUserDirectory,
  ) {}

  async create(
    actorId: string,
    input: CreateProjectRequest,
  ): Promise<ProjectDetail> {
    const code = input.code.trim().toUpperCase();
    if (await this.projects.codeExists(code)) {
      throw new ConflictException({
        code: 'PROJECT_CODE_EXISTS',
        message: 'A project with this code already exists',
      });
    }
    const startDate = this.parseDate(input.startDate);
    const dueDate = this.parseDate(input.dueDate);
    const signedDate = this.parseDate(input.signedDate);
    this.assertDateRange(startDate, dueDate);
    return this.projects.createWithOwner({
      code,
      name: input.name.trim(),
      ...(input.description?.trim()
        ? { description: input.description.trim() }
        : {}),
      status: input.status ?? 'planning',
      operationalStatus: input.operationalStatus ?? 'not_started',
      ...(signedDate ? { signedDate } : {}),
      ...this.normalizeCreatePortfolioFields(input),
      ...(startDate ? { startDate } : {}),
      ...(dueDate ? { dueDate } : {}),
      createdBy: actorId,
      ownerUserId: actorId,
    });
  }

  async list(
    actorId: string,
    permissions: readonly PermissionCode[],
    pageValue: number,
    limitValue: number,
    filters: Omit<ListProjectsRequest, 'page' | 'limit'> = {},
  ): Promise<PaginatedResponse<ProjectDetail>> {
    const pagination = createPagination(pageValue, limitValue);
    const result = await this.projects.list({
      ...pagination,
      actorId,
      canManageAll: this.canManageAll(permissions),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.operationalStatus
        ? { operationalStatus: filters.operationalStatus }
        : {}),
      ...(filters.dataQuality ? { dataQuality: filters.dataQuality } : {}),
      ...(filters.search?.trim() ? { search: filters.search.trim() } : {}),
    });
    return {
      data: result.projects,
      meta: createPaginationMeta(
        pagination.page,
        pagination.limit,
        result.totalItems,
      ),
    };
  }

  async getById(
    projectId: string,
    actorId: string,
    permissions: readonly PermissionCode[],
  ): Promise<ProjectDetail> {
    const project = await this.projects.findByIdWithAccess(
      projectId,
      actorId,
      this.canManageAll(permissions),
    );
    if (!project) this.throwProjectNotFound();
    return project;
  }

  async update(
    projectId: string,
    actorId: string,
    permissions: readonly PermissionCode[],
    input: UpdateProjectRequest,
  ): Promise<ProjectDetail> {
    const current = await this.assertCanManageProject(
      projectId,
      actorId,
      permissions,
    );
    const update = this.normalizeUpdate(input);
    const startDate =
      update.startDate === undefined
        ? this.parseDate(current.startDate)
        : (update.startDate ?? undefined);
    const dueDate =
      update.dueDate === undefined
        ? this.parseDate(current.dueDate)
        : (update.dueDate ?? undefined);
    this.assertDateRange(startDate, dueDate);
    const updated = await this.projects.update(projectId, update);
    if (!updated) this.throwProjectNotFound();
    return this.getById(projectId, actorId, permissions);
  }

  async listMembers(
    projectId: string,
    actorId: string,
    permissions: readonly PermissionCode[],
  ): Promise<ProjectMember[]> {
    await this.getById(projectId, actorId, permissions);
    return this.projects.listMembers(projectId);
  }

  async listMemberCandidates(
    projectId: string,
    actorId: string,
    permissions: readonly PermissionCode[],
    search: string | undefined,
    limit: number,
  ): Promise<ProjectMemberCandidate[]> {
    await this.assertCanManageProject(projectId, actorId, permissions);
    const users = await this.users.listActive(
      search?.trim() || undefined,
      limit,
    );
    return users.map((user) => ({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    }));
  }

  async upsertMember(
    projectId: string,
    actorId: string,
    permissions: readonly PermissionCode[],
    input: UpsertProjectMemberRequest,
  ): Promise<ProjectMember> {
    await this.assertCanManageProject(projectId, actorId, permissions);
    const user = await this.users.findActiveById(input.userId);
    if (!user) {
      throw new NotFoundException({
        code: 'PROJECT_MEMBER_USER_NOT_FOUND',
        message: 'Active user was not found',
      });
    }
    const result = await this.projects.upsertMemberSafely({
      projectId,
      userId: user.id,
      role: input.role,
      actorId,
    });
    if (result === 'last_owner') this.throwLastOwnerConflict();
    return result;
  }

  async removeMember(
    projectId: string,
    userId: string,
    actorId: string,
    permissions: readonly PermissionCode[],
  ): Promise<void> {
    await this.assertCanManageProject(projectId, actorId, permissions);
    const result = await this.projects.removeMemberSafely(projectId, userId);
    if (result === 'last_owner') this.throwLastOwnerConflict();
    if (result === 'not_found') {
      throw new NotFoundException({
        code: 'PROJECT_MEMBERSHIP_NOT_FOUND',
        message: 'Project membership was not found',
      });
    }
  }

  private async assertCanManageProject(
    projectId: string,
    actorId: string,
    permissions: readonly PermissionCode[],
  ): Promise<ProjectDetail> {
    const project = await this.getById(projectId, actorId, permissions);
    if (
      !this.canManageAll(permissions) &&
      project.myRole !== 'owner' &&
      project.myRole !== 'manager'
    ) {
      throw new ForbiddenException({
        code: 'PROJECT_MANAGEMENT_FORBIDDEN',
        message: 'You cannot manage this project',
      });
    }
    return project;
  }

  private normalizeUpdate(input: UpdateProjectRequest): UpdateProjectRecord {
    return {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.operationalStatus !== undefined
        ? { operationalStatus: input.operationalStatus }
        : {}),
      ...(input.signedDate !== undefined
        ? {
            signedDate: input.signedDate
              ? this.parseDate(input.signedDate)
              : null,
          }
        : {}),
      ...this.normalizeUpdatePortfolioFields(input),
      ...(input.startDate !== undefined
        ? {
            startDate: input.startDate ? this.parseDate(input.startDate) : null,
          }
        : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate ? this.parseDate(input.dueDate) : null }
        : {}),
    };
  }

  private normalizeCreatePortfolioFields(
    input: CreateProjectRequest,
  ): Partial<CreateProjectRecord> {
    return {
      ...this.createTextFields(input),
      ...(input.unitCount !== undefined ? { unitCount: input.unitCount } : {}),
      ...(input.floorAreaM2 !== undefined
        ? { floorAreaM2: input.floorAreaM2 }
        : {}),
      ...(input.landAreaHa !== undefined
        ? { landAreaHa: input.landAreaHa }
        : {}),
      ...(input.dataSources !== undefined
        ? { dataSources: input.dataSources }
        : {}),
      ...(input.dataConflict !== undefined
        ? { dataConflict: input.dataConflict }
        : {}),
      ...(input.carrierContractCount !== undefined
        ? { carrierContractCount: input.carrierContractCount }
        : {}),
      ...(input.revenueTotal !== undefined
        ? { revenueTotal: input.revenueTotal }
        : {}),
      ...(input.costTotal !== undefined
        ? { costTotal: input.costTotal }
        : {}),
      ...(input.capex !== undefined ? { capex: input.capex } : {}),
    };
  }

  private normalizeUpdatePortfolioFields(
    input: UpdateProjectRequest,
  ): UpdateProjectRecord {
    return {
      ...this.updateTextFields(input),
      ...(input.unitCount !== undefined ? { unitCount: input.unitCount } : {}),
      ...(input.floorAreaM2 !== undefined
        ? { floorAreaM2: input.floorAreaM2 }
        : {}),
      ...(input.landAreaHa !== undefined
        ? { landAreaHa: input.landAreaHa }
        : {}),
      ...(input.dataSources !== undefined
        ? { dataSources: input.dataSources }
        : {}),
      ...(input.dataConflict !== undefined
        ? { dataConflict: input.dataConflict }
        : {}),
      ...(input.carrierContractCount !== undefined
        ? { carrierContractCount: input.carrierContractCount }
        : {}),
      ...(input.revenueTotal !== undefined
        ? { revenueTotal: input.revenueTotal }
        : {}),
      ...(input.costTotal !== undefined
        ? { costTotal: input.costTotal }
        : {}),
      ...(input.capex !== undefined ? { capex: input.capex } : {}),
    };
  }

  private createTextFields(
    input: CreateProjectRequest,
  ): Partial<CreateProjectRecord> {
    return {
      ...this.normalizedText('address', input.address),
      ...this.normalizedText('province', input.province),
      ...this.normalizedText('investor', input.investor),
      ...this.normalizedText('projectType', input.projectType),
      ...this.normalizedText('scaleDescription', input.scaleDescription),
      ...this.normalizedText('investmentUnit', input.investmentUnit),
    };
  }

  private updateTextFields(input: UpdateProjectRequest): UpdateProjectRecord {
    return {
      ...this.normalizedNullableText('address', input.address),
      ...this.normalizedNullableText('province', input.province),
      ...this.normalizedNullableText('investor', input.investor),
      ...this.normalizedNullableText('projectType', input.projectType),
      ...this.normalizedNullableText(
        'scaleDescription',
        input.scaleDescription,
      ),
      ...this.normalizedNullableText('investmentUnit', input.investmentUnit),
    };
  }

  private normalizedText(
    field: ProjectTextField,
    value: string | undefined,
  ): Partial<Record<ProjectTextField, string>> {
    const normalized = value?.trim();
    return normalized ? { [field]: normalized } : {};
  }

  private normalizedNullableText(
    field: ProjectTextField,
    value: string | null | undefined,
  ): Partial<Record<ProjectTextField, string | null>> {
    if (value === undefined) return {};
    const normalized = value?.trim();
    return { [field]: normalized || null };
  }

  private parseDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException({
        code: 'PROJECT_DATE_INVALID',
        message: 'Project date is invalid',
      });
    }
    return date;
  }

  private assertDateRange(startDate?: Date, dueDate?: Date): void {
    if (startDate && dueDate && dueDate < startDate) {
      throw new BadRequestException({
        code: 'PROJECT_DATE_RANGE_INVALID',
        message: 'Due date cannot be earlier than start date',
      });
    }
  }

  private canManageAll(permissions: readonly PermissionCode[]): boolean {
    return permissions.includes('projects.manage');
  }

  private throwProjectNotFound(): never {
    throw new NotFoundException({
      code: 'PROJECT_NOT_FOUND',
      message: 'Project was not found',
    });
  }

  private throwLastOwnerConflict(): never {
    throw new ConflictException({
      code: 'PROJECT_LAST_OWNER_REQUIRED',
      message: 'A project must keep at least one owner',
    });
  }
}
