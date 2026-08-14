import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import {
  ProjectEntity,
  ProjectSchema,
} from '../projects/infrastructure/project.schemas';
import { DASHBOARD_REPOSITORY } from './application/dashboard.ports';
import { DashboardService } from './application/dashboard.service';
import { MongooseDashboardRepository } from './infrastructure/mongoose-dashboard.repository';
import { DashboardController } from './presentation/dashboard.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: ProjectEntity.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    {
      provide: DASHBOARD_REPOSITORY,
      useClass: MongooseDashboardRepository,
    },
  ],
})
export class DashboardModule {}
