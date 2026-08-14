import { BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  Receivable,
  ReceivableListResponse,
} from '@project-ql/api-contracts';
import type { ReceivableRepository } from './receivable-management.ports';
import { ReceivableManagementService } from './receivable-management.service';

const RECEIVABLE: Receivable = {
  id: 'receivable-1',
  projectId: 'project-1',
  projectCode: 'IDS-01',
  projectName: 'Eco Green',
  carrierContractId: 'contract-1',
  carrier: 'Viettel',
  periodLabel: 'Q3/2026',
  amountDue: 100_000_000,
  amountPaid: 40_000_000,
  outstandingAmount: 60_000_000,
  dueDate: '2026-08-01T00:00:00.000Z',
  paidDate: '2026-07-20T00:00:00.000Z',
  status: 'partial',
  overdue: true,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-20T00:00:00.000Z',
};

const EMPTY_REPORT: Omit<ReceivableListResponse, 'meta'> = {
  data: [],
  overview: {
    totalDue: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    overdueOutstanding: 0,
    overdueItems: 0,
    paidItems: 0,
    onTimePaidItems: 0,
  },
  availableCarriers: [],
};

describe('ReceivableManagementService', () => {
  function repository(
    overrides: Partial<jest.Mocked<ReceivableRepository>> = {},
  ): jest.Mocked<ReceivableRepository> {
    return {
      list: jest.fn().mockResolvedValue({
        receivables: EMPTY_REPORT.data,
        totalItems: 0,
        overview: EMPTY_REPORT.overview,
        availableCarriers: [],
      }),
      findContractContext: jest.fn(),
      findByIdWithAccess: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      ...overrides,
    };
  }

  it('returns one filtered page and portfolio collection overview', async () => {
    const receivables = repository({
      list: jest.fn().mockResolvedValue({
        receivables: [RECEIVABLE],
        totalItems: 1,
        overview: {
          totalDue: 100_000_000,
          totalPaid: 40_000_000,
          totalOutstanding: 60_000_000,
          overdueOutstanding: 60_000_000,
          overdueItems: 1,
          paidItems: 0,
          onTimePaidItems: 0,
        },
        availableCarriers: ['Viettel'],
      }),
    });
    const service = new ReceivableManagementService(receivables);

    const result = await service.list(
      'user-1',
      ['projects.read', 'receivables.read'],
      2,
      20,
      {
        search: '  Eco Green  ',
        status: 'overdue',
        carrier: '  Viettel  ',
      },
    );

    expect(receivables.list).toHaveBeenCalledWith({
      actorId: 'user-1',
      canManageAll: false,
      page: 2,
      limit: 20,
      skip: 20,
      search: 'Eco Green',
      status: 'overdue',
      carrier: 'Viettel',
    });
    expect(result.data).toEqual([RECEIVABLE]);
    expect(result.meta).toMatchObject({ page: 2, totalItems: 1 });
  });

  it('creates a normalized manual receivable for an accessible contract', async () => {
    const receivables = repository({
      findContractContext: jest.fn().mockResolvedValue({
        projectId: 'project-1',
        projectCode: 'IDS-01',
        projectName: 'Eco Green',
        carrierContractId: 'contract-1',
        carrier: 'Viettel',
      }),
      create: jest.fn().mockResolvedValue(RECEIVABLE),
    });
    const service = new ReceivableManagementService(receivables);

    const result = await service.create(
      'admin-1',
      ['projects.manage', 'receivables.manage'],
      {
        carrierContractId: 'contract-1',
        periodLabel: '  Q3/2026  ',
        amountDue: 100_000_000,
        amountPaid: 40_000_000,
        dueDate: '2026-08-01',
        paidDate: '2026-07-20',
        note: '  Thu một phần  ',
      },
    );

    expect(receivables.findContractContext).toHaveBeenCalledWith(
      'contract-1',
      'admin-1',
      true,
    );
    expect(receivables.create).toHaveBeenCalledWith({
      projectId: 'project-1',
      projectCode: 'IDS-01',
      projectName: 'Eco Green',
      carrierContractId: 'contract-1',
      carrier: 'Viettel',
      periodLabel: 'Q3/2026',
      amountDue: 100_000_000,
      amountPaid: 40_000_000,
      dueDate: new Date('2026-08-01'),
      paidDate: new Date('2026-07-20'),
      note: 'Thu một phần',
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
    });
    expect(result).toEqual(RECEIVABLE);
  });

  it('rejects overpayment and requires a paid date for full collection', async () => {
    const receivables = repository({
      findContractContext: jest.fn().mockResolvedValue({
        projectId: 'project-1',
        projectCode: 'IDS-01',
        projectName: 'Eco Green',
        carrierContractId: 'contract-1',
        carrier: 'Viettel',
      }),
    });
    const service = new ReceivableManagementService(receivables);

    await expect(
      service.create('admin-1', ['receivables.manage'], {
        carrierContractId: 'contract-1',
        periodLabel: 'Q3/2026',
        amountDue: 100,
        amountPaid: 101,
        dueDate: '2026-08-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create('admin-1', ['receivables.manage'], {
        carrierContractId: 'contract-1',
        periodLabel: 'Q3/2026',
        amountDue: 100,
        amountPaid: 100,
        dueDate: '2026-08-01',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'RECEIVABLE_PAID_DATE_REQUIRED',
      }),
    });
    expect(receivables.create).not.toHaveBeenCalled();
  });

  it('merges a payment update and returns the refreshed receivable', async () => {
    const receivables = repository({
      findByIdWithAccess: jest.fn().mockResolvedValue(RECEIVABLE),
      update: jest.fn().mockResolvedValue({
        ...RECEIVABLE,
        amountPaid: 100_000_000,
        outstandingAmount: 0,
        status: 'paid',
        overdue: false,
        paidOnTime: false,
        paidDate: '2026-08-05T00:00:00.000Z',
      }),
    });
    const service = new ReceivableManagementService(receivables);

    const result = await service.update(
      'receivable-1',
      'admin-1',
      ['projects.manage', 'receivables.manage'],
      { amountPaid: 100_000_000, paidDate: '2026-08-05' },
    );

    expect(receivables.update).toHaveBeenCalledWith(RECEIVABLE, {
      periodLabel: 'Q3/2026',
      amountDue: 100_000_000,
      amountPaid: 100_000_000,
      dueDate: new Date('2026-08-01T00:00:00.000Z'),
      paidDate: new Date('2026-08-05'),
      note: null,
      updatedBy: 'admin-1',
    });
    expect(result.status).toBe('paid');
  });

  it('uses a non-leaking not-found response for inaccessible records', async () => {
    const receivables = repository({
      findContractContext: jest.fn().mockResolvedValue(null),
      findByIdWithAccess: jest.fn().mockResolvedValue(null),
    });
    const service = new ReceivableManagementService(receivables);

    await expect(
      service.create('user-1', ['receivables.manage'], {
        carrierContractId: 'contract-1',
        periodLabel: 'Q3/2026',
        amountDue: 100,
        dueDate: '2026-08-01',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.update('receivable-1', 'user-1', ['receivables.manage'], {
        amountPaid: 10,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'RECEIVABLE_NOT_FOUND' }),
    });
  });
});
