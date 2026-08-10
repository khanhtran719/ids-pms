import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../../auth/presentation/access-token.guard';
import type { AuthenticatedRequest } from '../../auth/presentation/auth-request';
import { RequirePermissions } from '../../auth/presentation/permission.decorator';
import { PermissionGuard } from '../../auth/presentation/permission.guard';
import { TaskManagementService } from '../application/task-management.service';
import {
  ListTasksQueryDto,
  TaskIdParamDto,
  TaskProjectIdParamDto,
  UpdateTaskDto,
} from './task.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PermissionGuard)
@Controller('v1/tasks')
export class TasksController {
  constructor(private readonly tasks: TaskManagementService) {}

  @Get()
  @RequirePermissions('tasks.read')
  @ApiOperation({ summary: 'List accessible project tasks with overview' })
  @ApiOkResponse()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.tasks.list(
      request.auth.subject,
      request.auth.permissions,
      query.page,
      query.limit,
      query.projectId,
      query.status,
    );
  }

  @Patch(':taskId')
  @RequirePermissions('tasks.manage', 'projects.read')
  @ApiOperation({ summary: 'Update a task in an accessible project' })
  @ApiOkResponse()
  update(
    @Req() request: AuthenticatedRequest,
    @Param() params: TaskIdParamDto,
    @Body() input: UpdateTaskDto,
  ) {
    return this.tasks.update(
      params.taskId,
      request.auth.subject,
      request.auth.permissions,
      input,
    );
  }
}

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PermissionGuard)
@Controller('v1/projects')
export class ProjectTaskPlansController {
  constructor(private readonly tasks: TaskManagementService) {}

  @Post(':projectId/tasks/initialize')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('tasks.manage', 'projects.read')
  @ApiOperation({
    summary: 'Idempotently initialize the five standard project tasks',
  })
  @ApiOkResponse()
  initializePlan(
    @Req() request: AuthenticatedRequest,
    @Param() params: TaskProjectIdParamDto,
  ) {
    return this.tasks.initializePlan(
      params.projectId,
      request.auth.subject,
      request.auth.permissions,
    );
  }
}
