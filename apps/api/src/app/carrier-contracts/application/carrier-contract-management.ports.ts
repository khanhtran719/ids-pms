import type {
  CarrierContract,
  CarrierContractOverview,
  CarrierContractUnit,
  CarrierPaymentCycle,
  CarrierServiceType,
} from '@project-ql/api-contracts';
import type { Pagination } from '../../core/http/pagination';

export interface CarrierContractProjectAccess {
  id: string;
  code: string;
  name: string;
  unitCount?: number;
  floorAreaM2?: number;
}

export interface ListCarrierContractsQuery extends Pagination {
  actorId: string;
  canManageAll: boolean;
  carrier?: string;
  serviceType?: CarrierServiceType;
}

export interface CreateCarrierContractRecord {
  projectId: string;
  carrier: string;
  serviceType: CarrierServiceType;
  quantity: number;
  unit: CarrierContractUnit;
  unitPrice?: number;
  paymentCycle?: CarrierPaymentCycle;
  startDate?: Date;
  endDate?: Date;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateCarrierContractRecord {
  carrier?: string;
  serviceType?: CarrierServiceType;
  quantity?: number;
  unit?: CarrierContractUnit;
  unitPrice?: number | null;
  paymentCycle?: CarrierPaymentCycle | null;
  startDate?: Date | null;
  endDate?: Date | null;
  updatedBy: string;
}

export interface CarrierContractRepository {
  list(query: ListCarrierContractsQuery): Promise<{
    contracts: CarrierContract[];
    totalItems: number;
    overview: CarrierContractOverview;
    availableCarriers: string[];
  }>;
  create(input: CreateCarrierContractRecord): Promise<CarrierContract>;
  findByIdWithAccess(
    contractId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<CarrierContract | null>;
  update(
    contract: CarrierContract,
    input: UpdateCarrierContractRecord,
  ): Promise<CarrierContract | null>;
}

export interface CarrierContractProjectDirectory {
  findByIdWithAccess(
    projectId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<CarrierContractProjectAccess | null>;
}

export const CARRIER_CONTRACT_REPOSITORY = Symbol('CARRIER_CONTRACT_REPOSITORY');
export const CARRIER_CONTRACT_PROJECT_DIRECTORY = Symbol(
  'CARRIER_CONTRACT_PROJECT_DIRECTORY',
);
