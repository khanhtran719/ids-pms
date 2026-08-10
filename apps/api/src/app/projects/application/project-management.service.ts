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
  PaginatedResponse,
  PermissionCode,
  ProjectDetail,
  ProjectMember,
  ProjectMemberCandidate,
  ProjectStatus,
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
  type ProjectRepository,
  type ProjectUserDirectory,
  type UpdateProjectRecord,
} from './project-management.ports';

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
    this.assertDateRange(startDate, dueDate);
    return this.projects.createWithOwner({
      code,
      name: input.name.trim(),
      ...(input.description?.trim()
        ? { description: input.description.trim() }
        : {}),
      status: input.status ?? 'planning',
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
    status?: ProjectStatus,
  ): Promise<PaginatedResponse<ProjectDetail>> {
    const pagination = createPagination(pageValue, limitValue);
    const result = await this.projects.list({
      ...pagination,
      actorId,
      canManageAll: this.canManageAll(permissions),
      ...(status ? { status } : {}),
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
