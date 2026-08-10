import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UserEntity, UserSchema } from '../auth/infrastructure/auth.schemas';
import { UserManagementService } from './application/user-management.service';
import { USER_MANAGEMENT_REPOSITORY } from './application/user-management.ports';
import { MongooseUserManagementRepository } from './infrastructure/mongoose-user-management.repository';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: UserEntity.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [
    UserManagementService,
    {
      provide: USER_MANAGEMENT_REPOSITORY,
      useClass: MongooseUserManagementRepository,
    },
  ],
})
export class UsersModule {}
