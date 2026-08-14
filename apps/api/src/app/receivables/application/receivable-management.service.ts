import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateReceivableRequest,
  ListReceivablesRequest,
  PermissionCode,
  Receivable,
  ReceivableListResponse,
  UpdateReceivableRequest,
} from '@project-ql/api-contracts';
import {
  createPagination,
  createPaginationMeta,
} from '../../core/http/pagination';
import {
  RECEIVABLE_REPOSITORY,
  type ReceivableRepository,
} from './receivable-management.ports';

@Injectable()
export class ReceivableManagementService {
  constructor(
    @Inject(RECEIVABLE_REPOSITORY)
    private readonly receivables: ReceivableRepository,
  ) {}

  async list(
    actorId: string,
    permissions: readonly PermissionCode[],
    pageValue: number,
    limitValue: number,
    filters: Omit<ListReceivablesRequest, 'page' | 'limit'> = {},
  ): Promise<ReceivableListResponse> {
    const pagination = createPagination(pageValue, limitValue);
    const search = filters.search?.trim();
    const carrier = filters.carrier?.trim();
    const result = await this.receivables.list({
      ...pagination,
      actorId,
      canManageAll: permissions.includes('projects.manage'),
      ...(search ? { search } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(carrier ? { carrier } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
    });
    return {
      data: result.receivables,
      meta: createPaginationMeta(
        pagination.page,
        pagination.limit,
        result.totalItems,
      ),
      overview: result.overview,
      availableCarriers: result.availableCarriers,
    };
  }

  async create(
    actorId: string,
    permissions: readonly PermissionCode[],
    input: CreateReceivableRequest,
  ): Promise<Receivable> {
    const amountPaid = input.amountPaid ?? 0;
    const dueDate = this.parseDate(input.dueDate);
    const paidDate = input.paidDate
      ? this.parseDate(input.paidDate)
      : undefined;
    this.assertCollection(input.amountDue, amountPaid, paidDate);
    const context = await this.receivables.findContractContext(
      input.carrierContractId,
      actorId,
      permissions.includes('projects.manage'),
    );
    if (!context) this.contractNotFound();
    return this.receivables.create({
      ...context,
      periodLabel: input.periodLabel.trim(),
      amountDue: input.amountDue,
      amountPaid,
      dueDate,
      ...(paidDate ? { paidDate } : {}),
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      createdBy: actorId,
      updatedBy: actorId,
    });
  }

  async update(
    receivableId: string,
    actorId: string,
    permissions: readonly PermissionCode[],
    input: UpdateReceivableRequest,
  ): Promise<Receivable> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException({
        code: 'RECEIVABLE_UPDATE_EMPTY',
        message: 'At least one receivable field is required',
      });
    }
    const current = await this.receivables.findByIdWithAccess(
      receivableId,
      actorId,
      permissions.includes('projects.manage'),
    );
    if (!current) this.receivableNotFound();
    const amountDue = input.amountDue ?? current.amountDue;
    const amountPaid = input.amountPaid ?? current.amountPaid;
    const paidDate =
      input.paidDate === undefined
        ? current.paidDate
          ? new Date(current.paidDate)
          : undefined
        : input.paidDate
          ? this.parseDate(input.paidDate)
          : undefined;
    this.assertCollection(amountDue, amountPaid, paidDate);
    const updated = await this.receivables.update(current, {
      periodLabel: input.periodLabel?.trim() ?? current.periodLabel,
      amountDue,
      amountPaid,
      dueDate: input.dueDate
        ? this.parseDate(input.dueDate)
        : new Date(current.dueDate),
      paidDate: paidDate ?? null,
      note:
        input.note === undefined
          ? (current.note ?? null)
          : (input.note?.trim() ?? null),
      updatedBy: actorId,
    });
    if (!updated) this.receivableNotFound();
    return updated;
  }

  private assertCollection(
    amountDue: number,
    amountPaid: number,
    paidDate?: Date,
  ): void {
    if (amountDue <= 0 || amountPaid < 0 || amountPaid > amountDue) {
      throw new BadRequestException({
        code: 'RECEIVABLE_AMOUNT_INVALID',
        message: 'Paid amount must be between zero and the amount due',
      });
    }
    if (amountPaid === amountDue && !paidDate) {
      throw new BadRequestException({
        code: 'RECEIVABLE_PAID_DATE_REQUIRED',
        message: 'Paid date is required when the receivable is fully paid',
      });
    }
    if (amountPaid === 0 && paidDate) {
      throw new BadRequestException({
        code: 'RECEIVABLE_PAID_DATE_UNEXPECTED',
        message: 'Paid date requires a positive paid amount',
      });
    }
  }

  private parseDate(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException({
        code: 'RECEIVABLE_DATE_INVALID',
        message: 'Receivable date is invalid',
      });
    }
    return parsed;
  }

  private contractNotFound(): never {
    throw new NotFoundException({
      code: 'RECEIVABLE_CONTRACT_NOT_FOUND',
      message: 'Carrier contract was not found or is not accessible',
    });
  }

  private receivableNotFound(): never {
    throw new NotFoundException({
      code: 'RECEIVABLE_NOT_FOUND',
      message: 'Receivable was not found or is not accessible',
    });
  }
}
