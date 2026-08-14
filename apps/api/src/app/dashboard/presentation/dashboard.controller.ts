import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
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
import { DashboardService } from '../application/dashboard.service';
import { GetDashboardQueryDto } from './dashboard.dto';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PermissionGuard)
@Controller('v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @RequirePermissions(
    'projects.read',
    'tasks.read',
    'carrier-contracts.read',
    'revenue.read',
  )
  @ApiOperation({
    summary: 'Get one scoped portfolio dashboard snapshot',
  })
  @ApiOkResponse({
    description: 'Portfolio KPIs, trends and rankings for one fiscal year',
  })
  getSnapshot(
    @Req() request: AuthenticatedRequest,
    @Query() query: GetDashboardQueryDto,
  ) {
    return this.dashboard.getSnapshot(
      request.auth.subject,
      request.auth.permissions,
      query.fiscalYear,
    );
  }
}
