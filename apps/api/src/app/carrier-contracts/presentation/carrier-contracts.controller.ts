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
import { CarrierContractManagementService } from '../application/carrier-contract-management.service';
import {
  CarrierContractIdParamDto,
  CreateCarrierContractDto,
  ListCarrierContractsQueryDto,
  UpdateCarrierContractDto,
} from './carrier-contract.dto';
@ApiTags('carrier-contracts')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PermissionGuard)
@Controller('v1/carrier-contracts')
export class CarrierContractsController {
  constructor(private readonly contracts: CarrierContractManagementService) {}
  @Get()
  @RequirePermissions('carrier-contracts.read', 'projects.read')
  @ApiOperation({
    summary: 'List accessible carrier contracts with portfolio overview',
  })
  @ApiOkResponse()
  list(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListCarrierContractsQueryDto,
  ) {
    return this.contracts.list(
      req.auth.subject,
      req.auth.permissions,
      query.page,
      query.limit,
      query.projectId,
      query.carrier,
      query.serviceType,
    );
  }
  @Post()
  @RequirePermissions('carrier-contracts.manage', 'projects.read')
  @ApiOperation({
    summary: 'Create a carrier contract in an accessible project',
  })
  @ApiCreatedResponse()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() input: CreateCarrierContractDto,
  ) {
    return this.contracts.create(req.auth.subject, req.auth.permissions, input);
  }
  @Patch(':contractId')
  @RequirePermissions('carrier-contracts.manage', 'projects.read')
  @ApiOperation({ summary: 'Update carrier contract volume or terms' })
  @ApiOkResponse()
  update(
    @Req() req: AuthenticatedRequest,
    @Param() params: CarrierContractIdParamDto,
    @Body() input: UpdateCarrierContractDto,
  ) {
    return this.contracts.update(
      params.contractId,
      req.auth.subject,
      req.auth.permissions,
      input,
    );
  }
}
