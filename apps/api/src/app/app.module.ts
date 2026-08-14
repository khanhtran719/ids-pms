import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import {
  EnvironmentVariables,
  validateEnvironment,
} from './core/config/environment';
import { CoreModule } from './core/core.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { DataQualityModule } from './data-quality/data-quality.module';
import { CarrierContractsModule } from './carrier-contracts/carrier-contracts.module';
import { RevenueModule } from './revenue/revenue.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PaybackModule } from './payback/payback.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { ProjectActivitiesModule } from './project-activities/project-activities.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<EnvironmentVariables, true>,
      ) => [
        {
          ttl: configService.getOrThrow('THROTTLE_TTL_MS'),
          limit: configService.getOrThrow('THROTTLE_LIMIT'),
        },
      ],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<EnvironmentVariables, true>,
      ) => ({
        uri: configService.getOrThrow('MONGODB_URI'),
        lazyConnection: true,
        serverSelectionTimeoutMS: 3_000,
      }),
    }),
    CoreModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    DataQualityModule,
    CarrierContractsModule,
    RevenueModule,
    DashboardModule,
    PaybackModule,
    OpportunitiesModule,
    ProjectActivitiesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
