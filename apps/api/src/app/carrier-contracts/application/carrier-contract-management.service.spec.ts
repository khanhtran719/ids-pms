import { BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  CarrierContract,
  CarrierContractOverview,
} from '@project-ql/api-contracts';
import type {
  CarrierContractProjectDirectory,
  CarrierContractRepository,
} from './carrier-contract-management.ports';
import { CarrierContractManagementService } from './carrier-contract-management.service';

const CONTRACT: CarrierContract = {
  id: 'contract-1',
  projectId: 'project-1',
  projectCode: 'IDS-01',
  projectName: 'IDS Riverside',
  carrier: 'Viettel',
  serviceType: 'teldata',
  quantity: 120,
  unit: 'apartment',
  termsComplete: false,
  penetrationRate: 0.6,
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
};

const OVERVIEW: CarrierContractOverview = {
  totalContracts: 1,
  teldataContracts: 1,
  ibsContracts: 0,
  contractsWithTerms: 0,
  coveredProjects: 1,
};

describe('CarrierContractManagementService', () => {
  let contracts: jest.Mocked<CarrierContractRepository>;
  let projects: jest.Mocked<CarrierContractProjectDirectory>;
  let service: CarrierContractManagementService;

  beforeEach(() => {
    contracts = {
      list: jest.fn().mockResolvedValue({
        contracts: [CONTRACT],
        totalItems: 1,
        overview: OVERVIEW,
        availableCarriers: ['Viettel'],
      }),
      create: jest.fn().mockResolvedValue(CONTRACT),
      findByIdWithAccess: jest.fn().mockResolvedValue(CONTRACT),
      update: jest.fn().mockResolvedValue(CONTRACT),
    };
    projects = {
      findByIdWithAccess: jest.fn().mockResolvedValue({
        id: 'project-1',
        code: 'IDS-01',
        name: 'IDS Riverside',
        unitCount: 200,
        floorAreaM2: 12_000,
      }),
    };
    service = new CarrierContractManagementService(contracts, projects);
  });

  it('lists only the actor scope and trims carrier filters', async () => {
    const result = await service.list(
      'user-1',
      ['carrier-contracts.read', 'projects.read'],
      1,
      20,
      '  Viettel  ',
      'teldata',
    );

    expect(contracts.list).toHaveBeenCalledWith({
      actorId: 'user-1',
      canManageAll: false,
      page: 1,
      limit: 20,
      skip: 0,
      carrier: 'Viettel',
      serviceType: 'teldata',
    });
    expect(result.overview).toEqual(OVERVIEW);
    expect(result.meta.totalItems).toBe(1);
  });

  it('creates a contract for an accessible project with derived unit', async () => {
    await service.create(
      'user-1',
      ['carrier-contracts.manage', 'projects.read'],
      {
        projectId: 'project-1',
        carrier: '  Viettel  ',
        serviceType: 'teldata',
        quantity: 120,
      },
    );

    expect(contracts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        carrier: 'Viettel',
        serviceType: 'teldata',
        unit: 'apartment',
        createdBy: 'user-1',
        updatedBy: 'user-1',
      }),
    );
  });

  it('rejects a contract when the project is outside the actor scope', async () => {
    projects.findByIdWithAccess.mockResolvedValue(null);

    await expect(
      service.create(
        'user-1',
        ['carrier-contracts.manage', 'projects.read'],
        {
          projectId: 'outside-project',
          carrier: 'VNPT',
          serviceType: 'ibs',
          quantity: 5_000,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an end date earlier than the start date', async () => {
    await expect(
      service.update(
        'contract-1',
        'user-1',
        ['carrier-contracts.manage', 'projects.read'],
        {
          startDate: '2026-08-20',
          endDate: '2026-08-19',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clears optional terms and derives the unit when service changes', async () => {
    await service.update(
      'contract-1',
      'user-1',
      ['carrier-contracts.manage', 'projects.read', 'projects.manage'],
      {
        serviceType: 'ibs',
        unitPrice: null,
        paymentCycle: null,
        startDate: null,
        endDate: null,
      },
    );

    expect(contracts.findByIdWithAccess).toHaveBeenCalledWith(
      'contract-1',
      'user-1',
      true,
    );
    expect(contracts.update).toHaveBeenCalledWith(
      CONTRACT,
      expect.objectContaining({
        serviceType: 'ibs',
        unit: 'm2',
        unitPrice: null,
        paymentCycle: null,
        startDate: null,
        endDate: null,
      }),
    );
  });
});
