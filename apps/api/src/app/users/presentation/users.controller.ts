import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../../auth/presentation/access-token.guard';
import { RequirePermissions } from '../../auth/presentation/permission.decorator';
import { PermissionGuard } from '../../auth/presentation/permission.guard';
import { UserManagementService } from '../application/user-management.service';
import { CreateUserDto, ListUsersQueryDto } from './user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PermissionGuard)
@Controller('v1/users')
export class UsersController {
  constructor(private readonly users: UserManagementService) {}

  @Get()
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'List users with pagination' })
  @ApiOkResponse()
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query.page, query.limit);
  }

  @Post()
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse()
  create(@Body() input: CreateUserDto) {
    return this.users.create(input);
  }
}
