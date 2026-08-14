import {
  Body,
  Controller,
  Get,
  Put,
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
import { RevenueManagementService } from '../application/revenue-management.service';
import { ListRevenueQueryDto, UpsertRevenueActualDto } from './revenue.dto';

@ApiTags('revenue')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PermissionGuard)
@Controller('v1/revenue')
export class RevenueController {
  constructor(private readonly revenue: RevenueManagementService) {}

  @Get()
  @RequirePermissions('revenue.read', 'projects.read')
  @ApiOperation({ summary: 'Get scoped revenue report for a fiscal year' })
  @ApiOkResponse()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListRevenueQueryDto,
  ) {
    return this.revenue.list(
      request.auth.subject,
      request.auth.permissions,
      query.page,
      query.limit,
      query.fiscalYear,
      query.search,
    );
  }

  @Put()
  @RequirePermissions('revenue.manage', 'projects.read')
  @ApiOperation({ summary: 'Create or replace one quarterly revenue actual' })
  @ApiOkResponse()
  upsert(
    @Req() request: AuthenticatedRequest,
    @Body() input: UpsertRevenueActualDto,
  ) {
    return this.revenue.upsert(
      request.auth.subject,
      request.auth.permissions,
      input,
    );
  }
}
