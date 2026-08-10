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
import { DataQualityService } from '../application/data-quality.service';
import { ListDataQualityQueryDto } from './data-quality.dto';

@ApiTags('data-quality')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PermissionGuard)
@Controller('v1/data-quality')
export class DataQualityController {
  constructor(private readonly dataQuality: DataQualityService) {}

  @Get()
  @RequirePermissions('projects.read', 'tasks.read')
  @ApiOperation({
    summary: 'Get accessible project data-quality summary and issues',
  })
  @ApiOkResponse({
    description: 'Paginated project issues with a scope-wide summary',
  })
  getReport(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListDataQualityQueryDto,
  ) {
    return this.dataQuality.getReport(
      request.auth.subject,
      request.auth.permissions,
      query.page,
      query.limit,
      query.issueType,
      query.search,
    );
  }
}
