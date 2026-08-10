import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AUTH_TOKEN_SERVICE,
  PASSWORD_HASHER,
  REFRESH_SESSION_REPOSITORY,
  ROLE_REPOSITORY,
  USER_REPOSITORY,
} from './application/auth.ports';
import { AuthenticationService } from './application/authentication.service';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { AuthSeedService } from './infrastructure/auth-seed.service';
import {
  RefreshSessionEntity,
  RefreshSessionSchema,
  RoleEntity,
  RoleSchema,
  UserEntity,
  UserSchema,
} from './infrastructure/auth.schemas';
import { JwtAuthTokenService } from './infrastructure/jwt-auth-token.service';
import {
  MongooseRefreshSessionRepository,
  MongooseRoleRepository,
  MongooseUserRepository,
} from './infrastructure/mongoose-auth.repositories';
import { AccessTokenGuard } from './presentation/access-token.guard';
import { AuthController } from './presentation/auth.controller';
import { CsrfProtectionGuard } from './presentation/csrf-protection.guard';
import { PermissionGuard } from './presentation/permission.guard';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: UserEntity.name, schema: UserSchema },
      { name: RoleEntity.name, schema: RoleSchema },
      { name: RefreshSessionEntity.name, schema: RefreshSessionSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthenticationService,
    AccessTokenGuard,
    CsrfProtectionGuard,
    PermissionGuard,
    AuthSeedService,
    { provide: USER_REPOSITORY, useClass: MongooseUserRepository },
    { provide: ROLE_REPOSITORY, useClass: MongooseRoleRepository },
    {
      provide: REFRESH_SESSION_REPOSITORY,
      useClass: MongooseRefreshSessionRepository,
    },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: AUTH_TOKEN_SERVICE, useClass: JwtAuthTokenService },
  ],
  exports: [
    AuthenticationService,
    AccessTokenGuard,
    PermissionGuard,
    AUTH_TOKEN_SERVICE,
    USER_REPOSITORY,
    ROLE_REPOSITORY,
    PASSWORD_HASHER,
    MongooseModule,
  ],
})
export class AuthModule {}
