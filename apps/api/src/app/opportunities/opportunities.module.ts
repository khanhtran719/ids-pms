import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { OPPORTUNITY_REPOSITORY } from './application/opportunity-management.ports';
import { OpportunityManagementService } from './application/opportunity-management.service';
import { MongooseOpportunityRepository } from './infrastructure/mongoose-opportunity.repository';
import {
  OpportunityEntity,
  OpportunitySchema,
} from './infrastructure/opportunity.schemas';
import { OpportunitiesController } from './presentation/opportunities.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: OpportunityEntity.name, schema: OpportunitySchema },
    ]),
  ],
  controllers: [OpportunitiesController],
  providers: [
    OpportunityManagementService,
    {
      provide: OPPORTUNITY_REPOSITORY,
      useClass: MongooseOpportunityRepository,
    },
  ],
})
export class OpportunitiesModule {}
