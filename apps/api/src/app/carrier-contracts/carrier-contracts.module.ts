import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ProjectEntity, ProjectSchema } from '../projects/infrastructure/project.schemas';
import { CARRIER_CONTRACT_PROJECT_DIRECTORY, CARRIER_CONTRACT_REPOSITORY } from './application/carrier-contract-management.ports';
import { CarrierContractManagementService } from './application/carrier-contract-management.service';
import { CarrierContractEntity, CarrierContractSchema } from './infrastructure/carrier-contract.schemas';
import { MongooseCarrierContractProjectDirectory, MongooseCarrierContractRepository } from './infrastructure/mongoose-carrier-contract.repositories';
import { CarrierContractsController } from './presentation/carrier-contracts.controller';
@Module({ imports: [AuthModule, MongooseModule.forFeature([{ name: CarrierContractEntity.name, schema: CarrierContractSchema }, { name: ProjectEntity.name, schema: ProjectSchema }])], controllers: [CarrierContractsController], providers: [CarrierContractManagementService, { provide: CARRIER_CONTRACT_REPOSITORY, useClass: MongooseCarrierContractRepository }, { provide: CARRIER_CONTRACT_PROJECT_DIRECTORY, useClass: MongooseCarrierContractProjectDirectory }] })
export class CarrierContractsModule {}
