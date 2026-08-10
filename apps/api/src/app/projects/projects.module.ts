import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UserEntity, UserSchema } from '../auth/infrastructure/auth.schemas';
import {
  PROJECT_REPOSITORY,
  PROJECT_USER_DIRECTORY,
} from './application/project-management.ports';
import { ProjectManagementService } from './application/project-management.service';
import {
  MongooseProjectRepository,
  MongooseProjectUserDirectory,
} from './infrastructure/mongoose-project.repositories';
import {
  ProjectEntity,
  ProjectMembershipEntity,
  ProjectMembershipSchema,
  ProjectSchema,
} from './infrastructure/project.schemas';
import { ProjectsController } from './presentation/projects.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: UserEntity.name, schema: UserSchema },
      { name: ProjectEntity.name, schema: ProjectSchema },
      { name: ProjectMembershipEntity.name, schema: ProjectMembershipSchema },
    ]),
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectManagementService,
    { provide: PROJECT_REPOSITORY, useClass: MongooseProjectRepository },
    {
      provide: PROJECT_USER_DIRECTORY,
      useClass: MongooseProjectUserDirectory,
    },
  ],
})
export class ProjectsModule {}
