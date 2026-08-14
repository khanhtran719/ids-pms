import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateProjectCommentRequest,
  PermissionCode,
  ProjectActivity,
  ProjectActivityListResponse,
} from '@project-ql/api-contracts';
import {
  createPagination,
  createPaginationMeta,
} from '../../core/http/pagination';
import {
  PROJECT_ACTIVITY_REPOSITORY,
  type ProjectActivityRepository,
} from './project-activity.ports';

@Injectable()
export class ProjectActivityService {
  constructor(
    @Inject(PROJECT_ACTIVITY_REPOSITORY)
    private readonly activities: ProjectActivityRepository,
  ) {}

  async list(
    projectId: string,
    actorId: string,
    permissions: readonly PermissionCode[],
    pageValue: number,
    limitValue: number,
  ): Promise<ProjectActivityListResponse> {
    const pagination = createPagination(pageValue, limitValue);
    const result = await this.activities.list({
      projectId,
      actorId,
      canManageAll: permissions.includes('projects.manage'),
      ...pagination,
    });
    if (!result) this.throwNotFound();
    return {
      data: result.activities,
      meta: createPaginationMeta(
        pagination.page,
        pagination.limit,
        result.totalItems,
      ),
    };
  }

  async createComment(
    projectId: string,
    actorId: string,
    permissions: readonly PermissionCode[],
    input: CreateProjectCommentRequest,
  ): Promise<ProjectActivity> {
    const context = await this.activities.resolveCreateContext(
      projectId,
      actorId,
      permissions.includes('projects.manage'),
    );
    if (!context) this.throwNotFound();
    return this.activities.create({
      ...context,
      type: 'comment',
      content: input.content.trim(),
    });
  }

  private throwNotFound(): never {
    throw new NotFoundException({
      code: 'PROJECT_ACTIVITY_NOT_FOUND',
      message: 'Project was not found or is not accessible',
    });
  }
}
