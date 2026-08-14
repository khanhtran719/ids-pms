import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import {
  CarrierContractEntity,
  CarrierContractSchema,
} from '../carrier-contracts/infrastructure/carrier-contract.schemas';
import { RECEIVABLE_REPOSITORY } from './application/receivable-management.ports';
import { ReceivableManagementService } from './application/receivable-management.service';
import { MongooseReceivableRepository } from './infrastructure/mongoose-receivable.repository';
import {
  ReceivableEntity,
  ReceivableSchema,
} from './infrastructure/receivable.schemas';
import { ReceivablesController } from './presentation/receivables.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: ReceivableEntity.name, schema: ReceivableSchema },
      { name: CarrierContractEntity.name, schema: CarrierContractSchema },
    ]),
  ],
  controllers: [ReceivablesController],
  providers: [
    ReceivableManagementService,
    {
      provide: RECEIVABLE_REPOSITORY,
      useClass: MongooseReceivableRepository,
    },
  ],
})
export class ReceivablesModule {}
