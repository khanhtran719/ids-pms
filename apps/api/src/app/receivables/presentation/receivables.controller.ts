import {
  Body,
  Controller,
  Get,
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../../auth/presentation/access-token.guard';
import type { AuthenticatedRequest } from '../../auth/presentation/auth-request';
import { RequirePermissions } from '../../auth/presentation/permission.decorator';
import { PermissionGuard } from '../../auth/presentation/permission.guard';
import { ReceivableManagementService } from '../application/receivable-management.service';
import {
  CreateReceivableDto,
  ListReceivablesQueryDto,
  ReceivableIdParamDto,
  UpdateReceivableDto,
} from './receivable.dto';

@ApiTags('receivables')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PermissionGuard)
@Controller('v1/receivables')
export class ReceivablesController {
  constructor(private readonly receivables: ReceivableManagementService) {}

  @Get()
  @RequirePermissions('receivables.read', 'projects.read')
  @ApiOperation({ summary: 'List scoped receivables with collection KPI' })
  @ApiOkResponse()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListReceivablesQueryDto,
  ) {
    return this.receivables.list(
      request.auth.subject,
      request.auth.permissions,
      query.page,
      query.limit,
      {
        ...(query.search ? { search: query.search } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.carrier ? { carrier: query.carrier } : {}),
        ...(query.projectId ? { projectId: query.projectId } : {}),
      },
    );
  }

  @Post()
  @RequirePermissions('receivables.manage', 'projects.read')
  @ApiOperation({
    summary: 'Create a manual receivable for a carrier contract',
  })
  @ApiCreatedResponse()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateReceivableDto,
  ) {
    return this.receivables.create(
      request.auth.subject,
      request.auth.permissions,
      input,
    );
  }

  @Patch(':receivableId')
  @RequirePermissions('receivables.manage', 'projects.read')
  @ApiOperation({ summary: 'Update a receivable or record collection' })
  @ApiOkResponse()
  update(
    @Req() request: AuthenticatedRequest,
    @Param() params: ReceivableIdParamDto,
    @Body() input: UpdateReceivableDto,
  ) {
    return this.receivables.update(
      params.receivableId,
      request.auth.subject,
      request.auth.permissions,
      input,
    );
  }
}
