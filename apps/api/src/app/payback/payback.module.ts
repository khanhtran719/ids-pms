import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import {
  ProjectEntity,
  ProjectSchema,
} from '../projects/infrastructure/project.schemas';
import { PAYBACK_REPOSITORY } from './application/payback.ports';
import { PaybackService } from './application/payback.service';
import { MongoosePaybackRepository } from './infrastructure/mongoose-payback.repository';
import { PaybackController } from './presentation/payback.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: ProjectEntity.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [PaybackController],
  providers: [
    PaybackService,
    {
      provide: PAYBACK_REPOSITORY,
      useClass: MongoosePaybackRepository,
    },
  ],
})
export class PaybackModule {}
