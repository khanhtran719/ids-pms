import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../../auth/presentation/access-token.guard';
import type { AuthenticatedRequest } from '../../auth/presentation/auth-request';
import { RequirePermissions } from '../../auth/presentation/permission.decorator';
import { PermissionGuard } from '../../auth/presentation/permission.guard';
import { ProjectActivityService } from '../application/project-activity.service';
import {
  CreateProjectCommentDto,
  ListProjectActivitiesQueryDto,
  ProjectActivityProjectIdParamDto,
} from './project-activity.dto';

@ApiTags('project-activities')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PermissionGuard)
@Controller('v1/projects/:projectId/activities')
export class ProjectActivitiesController {
  constructor(private readonly activities: ProjectActivityService) {}

  @Get()
  @RequirePermissions('projects.read')
  @ApiOperation({ summary: 'List an accessible project activity timeline' })
  @ApiOkResponse()
  list(
    @Req() request: AuthenticatedRequest,
    @Param() params: ProjectActivityProjectIdParamDto,
    @Query() query: ListProjectActivitiesQueryDto,
  ) {
    return this.activities.list(
      params.projectId,
      request.auth.subject,
      request.auth.permissions,
      query.page,
      query.limit,
    );
  }

  @Post('comments')
  @RequirePermissions('projects.read')
  @ApiOperation({ summary: 'Post an immutable internal project comment' })
  @ApiCreatedResponse()
  createComment(
    @Req() request: AuthenticatedRequest,
    @Param() params: ProjectActivityProjectIdParamDto,
    @Body() input: CreateProjectCommentDto,
  ) {
    return this.activities.createComment(
      params.projectId,
      request.auth.subject,
      request.auth.permissions,
      input,
    );
  }
}
