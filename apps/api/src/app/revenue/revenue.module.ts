import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import {
  ProjectEntity,
  ProjectSchema,
} from '../projects/infrastructure/project.schemas';
import {
  REVENUE_ACTUAL_REPOSITORY,
  REVENUE_PROJECT_DIRECTORY,
} from './application/revenue-management.ports';
import { RevenueManagementService } from './application/revenue-management.service';
import {
  MongooseRevenueActualRepository,
  MongooseRevenueProjectDirectory,
} from './infrastructure/mongoose-revenue.repositories';
import {
  RevenueActualEntity,
  RevenueActualSchema,
} from './infrastructure/revenue-actual.schemas';
import { RevenueController } from './presentation/revenue.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: RevenueActualEntity.name, schema: RevenueActualSchema },
      { name: ProjectEntity.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [RevenueController],
  providers: [
    RevenueManagementService,
    {
      provide: REVENUE_ACTUAL_REPOSITORY,
      useClass: MongooseRevenueActualRepository,
    },
    {
      provide: REVENUE_PROJECT_DIRECTORY,
      useClass: MongooseRevenueProjectDirectory,
    },
  ],
})
export class RevenueModule {}
