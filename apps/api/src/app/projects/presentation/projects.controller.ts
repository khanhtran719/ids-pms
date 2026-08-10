import {
  Body,
  Controller,
  Delete,
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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../../auth/presentation/access-token.guard';
import type { AuthenticatedRequest } from '../../auth/presentation/auth-request';
import { RequirePermissions } from '../../auth/presentation/permission.decorator';
import { PermissionGuard } from '../../auth/presentation/permission.guard';
import { ProjectManagementService } from '../application/project-management.service';
import {
  CreateProjectDto,
  ListProjectMemberCandidatesQueryDto,
  ListProjectsQueryDto,
  ProjectIdParamDto,
  ProjectMemberParamDto,
  UpdateProjectDto,
  UpsertProjectMemberDto,
} from './project.dto';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PermissionGuard)
@Controller('v1/projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectManagementService) {}

  @Get()
  @RequirePermissions('projects.read')
  @ApiOperation({ summary: 'List projects accessible to the current user' })
  @ApiOkResponse()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListProjectsQueryDto,
  ) {
    return this.projects.list(
      request.auth.subject,
      request.auth.permissions,
      query.page,
      query.limit,
      {
        ...(query.status ? { status: query.status } : {}),
        ...(query.operationalStatus
          ? { operationalStatus: query.operationalStatus }
          : {}),
        ...(query.dataQuality ? { dataQuality: query.dataQuality } : {}),
        ...(query.search ? { search: query.search } : {}),
      },
    );
  }

  @Post()
  @RequirePermissions('projects.manage')
  @ApiOperation({ summary: 'Create a project and owner membership' })
  @ApiCreatedResponse()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateProjectDto,
  ) {
    return this.projects.create(request.auth.subject, input);
  }

  @Get(':projectId')
  @RequirePermissions('projects.read')
  @ApiOperation({ summary: 'Get an accessible project' })
  @ApiOkResponse()
  getById(
    @Req() request: AuthenticatedRequest,
    @Param() params: ProjectIdParamDto,
  ) {
    return this.projects.getById(
      params.projectId,
      request.auth.subject,
      request.auth.permissions,
    );
  }

  @Patch(':projectId')
  @RequirePermissions('projects.read')
  @ApiOperation({ summary: 'Update a manageable project' })
  @ApiOkResponse()
  update(
    @Req() request: AuthenticatedRequest,
    @Param() params: ProjectIdParamDto,
    @Body() input: UpdateProjectDto,
  ) {
    return this.projects.update(
      params.projectId,
      request.auth.subject,
      request.auth.permissions,
      input,
    );
  }

  @Get(':projectId/members')
  @RequirePermissions('projects.read')
  @ApiOperation({ summary: 'List project members in one aggregated query' })
  @ApiOkResponse()
  listMembers(
    @Req() request: AuthenticatedRequest,
    @Param() params: ProjectIdParamDto,
  ) {
    return this.projects.listMembers(
      params.projectId,
      request.auth.subject,
      request.auth.permissions,
    );
  }

  @Get(':projectId/member-candidates')
  @RequirePermissions('projects.read')
  @ApiOperation({ summary: 'List active users that can join the project' })
  @ApiOkResponse()
  listMemberCandidates(
    @Req() request: AuthenticatedRequest,
    @Param() params: ProjectIdParamDto,
    @Query() query: ListProjectMemberCandidatesQueryDto,
  ) {
    return this.projects.listMemberCandidates(
      params.projectId,
      request.auth.subject,
      request.auth.permissions,
      query.search,
      query.limit,
    );
  }

  @Post(':projectId/members')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('projects.read')
  @ApiOperation({ summary: 'Add a project member or update their role' })
  @ApiOkResponse()
  upsertMember(
    @Req() request: AuthenticatedRequest,
    @Param() params: ProjectIdParamDto,
    @Body() input: UpsertProjectMemberDto,
  ) {
    return this.projects.upsertMember(
      params.projectId,
      request.auth.subject,
      request.auth.permissions,
      input,
    );
  }

  @Delete(':projectId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('projects.read')
  @ApiOperation({ summary: 'Remove a project member' })
  @ApiNoContentResponse()
  removeMember(
    @Req() request: AuthenticatedRequest,
    @Param() params: ProjectMemberParamDto,
  ) {
    return this.projects.removeMember(
      params.projectId,
      params.userId,
      request.auth.subject,
      request.auth.permissions,
    );
  }
}
