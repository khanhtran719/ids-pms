import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CarrierContract,
  CarrierContractListResponse,
  CarrierContractUnit,
  CarrierServiceType,
  CreateCarrierContractRequest,
  PermissionCode,
  UpdateCarrierContractRequest,
} from '@project-ql/api-contracts';
import { createPagination, createPaginationMeta } from '../../core/http/pagination';
import {
  CARRIER_CONTRACT_PROJECT_DIRECTORY,
  CARRIER_CONTRACT_REPOSITORY,
  type CarrierContractProjectDirectory,
  type CarrierContractRepository,
  type UpdateCarrierContractRecord,
} from './carrier-contract-management.ports';

@Injectable()
export class CarrierContractManagementService {
  constructor(
    @Inject(CARRIER_CONTRACT_REPOSITORY) private readonly contracts: CarrierContractRepository,
    @Inject(CARRIER_CONTRACT_PROJECT_DIRECTORY) private readonly projects: CarrierContractProjectDirectory,
  ) {}

  async list(actorId: string, permissions: readonly PermissionCode[], pageValue: number, limitValue: number, carrierValue?: string, serviceType?: CarrierServiceType): Promise<CarrierContractListResponse> {
    const pagination = createPagination(pageValue, limitValue);
    const carrier = carrierValue?.trim();
    const result = await this.contracts.list({ ...pagination, actorId, canManageAll: permissions.includes('projects.manage'), ...(carrier ? { carrier } : {}), ...(serviceType ? { serviceType } : {}) });
    return { data: result.contracts, meta: createPaginationMeta(pagination.page, pagination.limit, result.totalItems), overview: result.overview, availableCarriers: result.availableCarriers };
  }

  async create(actorId: string, permissions: readonly PermissionCode[], input: CreateCarrierContractRequest): Promise<CarrierContract> {
    const project = await this.projects.findByIdWithAccess(input.projectId, actorId, permissions.includes('projects.manage'));
    if (!project) this.projectNotFound();
    this.validateDates(input.startDate, input.endDate);
    return this.contracts.create({
      projectId: project.id, carrier: input.carrier.trim(), serviceType: input.serviceType,
      quantity: input.quantity, unit: this.unitFor(input.serviceType),
      ...(input.unitPrice !== undefined ? { unitPrice: input.unitPrice } : {}),
      ...(input.paymentCycle ? { paymentCycle: input.paymentCycle } : {}),
      ...(input.startDate ? { startDate: new Date(input.startDate) } : {}),
      ...(input.endDate ? { endDate: new Date(input.endDate) } : {}),
      createdBy: actorId, updatedBy: actorId,
    });
  }

  async update(contractId: string, actorId: string, permissions: readonly PermissionCode[], input: UpdateCarrierContractRequest): Promise<CarrierContract> {
    const current = await this.contracts.findByIdWithAccess(contractId, actorId, permissions.includes('projects.manage'));
    if (!current) this.contractNotFound();
    const start = input.startDate === undefined ? current.startDate : input.startDate ?? undefined;
    const end = input.endDate === undefined ? current.endDate : input.endDate ?? undefined;
    this.validateDates(start, end);
    const update: UpdateCarrierContractRecord = {
      ...(input.carrier !== undefined ? { carrier: input.carrier.trim() } : {}),
      ...(input.serviceType !== undefined ? { serviceType: input.serviceType, unit: this.unitFor(input.serviceType) } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.unitPrice !== undefined ? { unitPrice: input.unitPrice } : {}),
      ...(input.paymentCycle !== undefined ? { paymentCycle: input.paymentCycle } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate ? new Date(input.startDate) : null } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate ? new Date(input.endDate) : null } : {}),
      updatedBy: actorId,
    };
    const updated = await this.contracts.update(current, update);
    if (!updated) this.contractNotFound();
    return updated;
  }

  private unitFor(serviceType: CarrierServiceType): CarrierContractUnit { return serviceType === 'teldata' ? 'apartment' : 'm2'; }
  private validateDates(start?: string, end?: string): void { if (start && end && new Date(end) < new Date(start)) throw new BadRequestException({ code: 'CARRIER_CONTRACT_DATE_RANGE_INVALID', message: 'End date cannot be earlier than start date' }); }
  private projectNotFound(): never { throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project was not found' }); }
  private contractNotFound(): never { throw new NotFoundException({ code: 'CARRIER_CONTRACT_NOT_FOUND', message: 'Carrier contract was not found' }); }
}
