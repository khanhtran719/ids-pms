import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import {
  ProjectEntity,
  ProjectSchema,
} from '../projects/infrastructure/project.schemas';
import {
  TASK_PROJECT_DIRECTORY,
  TASK_REPOSITORY,
} from './application/task-management.ports';
import { TaskManagementService } from './application/task-management.service';
import {
  MongooseTaskProjectDirectory,
  MongooseTaskRepository,
} from './infrastructure/mongoose-task.repositories';
import { TaskEntity, TaskSchema } from './infrastructure/task.schemas';
import {
  ProjectTaskPlansController,
  TasksController,
} from './presentation/tasks.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: TaskEntity.name, schema: TaskSchema },
      { name: ProjectEntity.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [TasksController, ProjectTaskPlansController],
  providers: [
    TaskManagementService,
    { provide: TASK_REPOSITORY, useClass: MongooseTaskRepository },
    {
      provide: TASK_PROJECT_DIRECTORY,
      useClass: MongooseTaskProjectDirectory,
    },
  ],
})
export class TasksModule {}
