import type {
  Receivable,
  ReceivableOverview,
  ReceivableStatusFilter,
} from '@project-ql/api-contracts';
import type { Pagination } from '../../core/http/pagination';

export interface ListReceivablesQuery extends Pagination {
  actorId: string;
  canManageAll: boolean;
  search?: string;
  status?: ReceivableStatusFilter;
  carrier?: string;
  projectId?: string;
}

export interface ReceivableContractContext {
  projectId: string;
  projectCode: string;
  projectName: string;
  carrierContractId: string;
  carrier: string;
}

export interface CreateReceivableRecord extends ReceivableContractContext {
  periodLabel: string;
  amountDue: number;
  amountPaid: number;
  dueDate: Date;
  paidDate?: Date;
  note?: string;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateReceivableRecord {
  periodLabel: string;
  amountDue: number;
  amountPaid: number;
  dueDate: Date;
  paidDate: Date | null;
  note: string | null;
  updatedBy: string;
}

export interface ReceivableRepository {
  list(query: ListReceivablesQuery): Promise<{
    receivables: Receivable[];
    totalItems: number;
    overview: ReceivableOverview;
    availableCarriers: string[];
  }>;
  findContractContext(
    contractId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<ReceivableContractContext | null>;
  findByIdWithAccess(
    receivableId: string,
    actorId: string,
    canManageAll: boolean,
  ): Promise<Receivable | null>;
  create(input: CreateReceivableRecord): Promise<Receivable>;
  update(
    current: Receivable,
    input: UpdateReceivableRecord,
  ): Promise<Receivable | null>;
}

export const RECEIVABLE_REPOSITORY = Symbol('RECEIVABLE_REPOSITORY');
