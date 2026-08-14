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
import { PaybackService } from '../application/payback.service';
import { ListPaybackQueryDto } from './payback.dto';

@ApiTags('payback')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PermissionGuard)
@Controller('v1/payback')
export class PaybackController {
  constructor(private readonly payback: PaybackService) {}

  @Get()
  @RequirePermissions('projects.read', 'revenue.read')
  @ApiOperation({
    summary: 'Get scoped cumulative payback report through a fiscal year',
  })
  @ApiOkResponse({
    description: 'CAPEX coverage and cumulative revenue recovery by project',
  })
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListPaybackQueryDto,
  ) {
    return this.payback.getReport(
      request.auth.subject,
      request.auth.permissions,
      query.page,
      query.limit,
      query.fiscalYear,
      query.status,
      query.search,
    );
  }
}
