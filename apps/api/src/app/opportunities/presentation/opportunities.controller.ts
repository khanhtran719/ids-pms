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
import { OpportunityManagementService } from '../application/opportunity-management.service';
import {
  CreateOpportunityDto,
  ListOpportunitiesQueryDto,
  OpportunityIdParamDto,
  UpdateOpportunityDto,
} from './opportunity.dto';

@ApiTags('opportunities')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PermissionGuard)
@Controller('v1/opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunityManagementService) {}

  @Get()
  @RequirePermissions('opportunities.read')
  @ApiOperation({
    summary: 'List business opportunities and pipeline overview',
  })
  @ApiOkResponse()
  list(@Query() query: ListOpportunitiesQueryDto) {
    return this.opportunities.list(
      query.page,
      query.limit,
      query.search,
      query.stage,
      query.region,
      query.ownerName,
      query.feasible,
    );
  }

  @Post()
  @RequirePermissions('opportunities.manage')
  @ApiOperation({ summary: 'Create a business opportunity' })
  @ApiCreatedResponse()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateOpportunityDto,
  ) {
    return this.opportunities.create(request.auth.subject, input);
  }

  @Patch(':opportunityId')
  @RequirePermissions('opportunities.manage')
  @ApiOperation({ summary: 'Update a business opportunity profile or stage' })
  @ApiOkResponse()
  update(
    @Req() request: AuthenticatedRequest,
    @Param() params: OpportunityIdParamDto,
    @Body() input: UpdateOpportunityDto,
  ) {
    return this.opportunities.update(
      params.opportunityId,
      request.auth.subject,
      input,
    );
  }
}
