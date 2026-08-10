import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import {
  ProjectEntity,
  ProjectSchema,
} from '../projects/infrastructure/project.schemas';
import { DATA_QUALITY_REPOSITORY } from './application/data-quality.ports';
import { DataQualityService } from './application/data-quality.service';
import { MongooseDataQualityRepository } from './infrastructure/mongoose-data-quality.repository';
import { DataQualityController } from './presentation/data-quality.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: ProjectEntity.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [DataQualityController],
  providers: [
    DataQualityService,
    {
      provide: DATA_QUALITY_REPOSITORY,
      useClass: MongooseDataQualityRepository,
    },
  ],
})
export class DataQualityModule {}
