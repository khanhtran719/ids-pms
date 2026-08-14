import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import {
  ProjectEntity,
  ProjectSchema,
} from '../projects/infrastructure/project.schemas';
import { PROJECT_ACTIVITY_REPOSITORY } from './application/project-activity.ports';
import { ProjectActivityService } from './application/project-activity.service';
import { MongooseProjectActivityRepository } from './infrastructure/mongoose-project-activity.repository';
import {
  ProjectActivityEntity,
  ProjectActivitySchema,
} from './infrastructure/project-activity.schemas';
import { ProjectActivitiesController } from './presentation/project-activities.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: ProjectEntity.name, schema: ProjectSchema },
      { name: ProjectActivityEntity.name, schema: ProjectActivitySchema },
    ]),
  ],
  controllers: [ProjectActivitiesController],
  providers: [
    ProjectActivityService,
    {
      provide: PROJECT_ACTIVITY_REPOSITORY,
      useClass: MongooseProjectActivityRepository,
    },
  ],
})
export class ProjectActivitiesModule {}
