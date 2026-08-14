import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type {
  AuthUser,
  CarrierContractListResponse,
} from '@project-ql/api-contracts';
import { of, throwError } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { CarrierContractsService } from '../../core/carrier-contracts.service';
import { ProjectsService } from '../../core/projects.service';
import { CarrierContractsPage } from './carrier-contracts.page';

const RESPONSE: CarrierContractListResponse = {
  data: [
    {
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
    },
  ],
  meta: {
    page: 1,
    limit: 20,
    totalItems: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
  overview: {
    totalContracts: 185,
    teldataContracts: 104,
    ibsContracts: 81,
    contractsWithTerms: 0,
    coveredProjects: 48,
  },
  availableCarriers: ['Viettel', 'VNPT'],
};

describe('CarrierContractsPage', () => {
  let fixture: ComponentFixture<CarrierContractsPage>;
  let contracts: {
    list: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  async function setup(canManage = true) {
    contracts = {
      list: jest.fn().mockReturnValue(of(RESPONSE)),
      create: jest.fn().mockReturnValue(of(RESPONSE.data[0])),
      update: jest.fn().mockReturnValue(of(RESPONSE.data[0])),
    };
    await TestBed.configureTestingModule({
      imports: [CarrierContractsPage],
      providers: [
        provideRouter([]),
        { provide: CarrierContractsService, useValue: contracts },
        {
          provide: ProjectsService,
          useValue: { list: jest.fn().mockReturnValue(of({ data: [], meta: {} })) },
        },
      ],
    }).compileComponents();
    const user = {
      id: 'user-1', email: 'manager@example.com', displayName: 'Manager',
      status: 'active', roleCodes: ['manager'], permissions: [
        'projects.read', 'carrier-contracts.read',
        ...(canManage ? (['carrier-contracts.manage'] as const) : []),
      ],
    } satisfies AuthUser;
    TestBed.inject(AuthSessionStore).setSession({
      accessToken: 'token', expiresInSeconds: 900, user,
    });
    fixture = TestBed.createComponent(CarrierContractsPage);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders mockup KPIs, missing-term warning and contract row', async () => {
    await setup();

    expect(fixture.nativeElement.textContent).toContain('Hợp đồng nhà mạng');
    expect(fixture.nativeElement.textContent).toContain('185');
    expect(fixture.nativeElement.textContent).toContain('104');
    expect(fixture.nativeElement.textContent).toContain('IDS Riverside');
    expect(fixture.nativeElement.textContent).toContain('chưa có');
    expect(fixture.nativeElement.textContent).toContain('Rủi ro lớn nhất');
  });

  it('reloads immediately when carrier and service filters change', async () => {
    await setup();
    const page = fixture.componentInstance as unknown as {
      carrierFilter: { setValue(value: string): void };
      serviceTypeFilter: { setValue(value: string): void };
    };

    page.carrierFilter.setValue('Viettel');
    page.serviceTypeFilter.setValue('teldata');

    expect(contracts.list).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      carrier: 'Viettel',
      serviceType: 'teldata',
    });
  });

  it('allows managers to open the term editor but keeps it hidden for readers', async () => {
    await setup(true);
    expect(fixture.nativeElement.querySelector('.edit-button')).not.toBeNull();
    fixture.nativeElement.querySelector('.edit-button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cập nhật điều khoản');

    TestBed.resetTestingModule();
    await setup(false);
    expect(fixture.nativeElement.querySelector('.edit-button')).toBeNull();
  });

  it('shows a retry action when the list request fails', async () => {
    await setup();
    contracts.list.mockReturnValue(throwError(() => new Error('offline')));
    const page = fixture.componentInstance as unknown as { load(): void };
    page.load();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Không thể tải danh sách hợp đồng',
    );
  });

  it('creates a contract, validates dates and handles pagination bounds', async () => {
    await setup();
    const page = fixture.componentInstance as unknown as {
      form: { setValue(value: object): void };
      editor: { (): string | null };
      page: { (): number; set(value: number): void };
      openCreate(): void;
      save(): void;
      closeEditor(): void;
      previous(): void;
      next(): void;
      cycleLabel(value?: string): string;
      unitLabel(value: object): string;
    };
    page.openCreate();
    page.form.setValue({ projectId: 'project-1', carrier: ' VNPT ', serviceType: 'ibs', quantity: 2000, unitPrice: null, paymentCycle: '', startDate: '2026-12-31', endDate: '2026-01-01' });
    page.save();
    expect(contracts.create).not.toHaveBeenCalled();

    page.form.setValue({ projectId: 'project-1', carrier: ' VNPT ', serviceType: 'ibs', quantity: 2000, unitPrice: 50000, paymentCycle: 'annual', startDate: '2026-01-01', endDate: '2026-12-31' });
    page.save();
    expect(contracts.create).toHaveBeenCalledWith(expect.objectContaining({ carrier: 'VNPT', serviceType: 'ibs' }));
    expect(page.editor()).toBeNull();

    page.page.set(1);
    page.previous();
    expect(page.page()).toBe(1);
    page.next();
    expect(page.page()).toBe(1);
    expect(page.cycleLabel('monthly')).toBe('Hàng tháng');
    expect(page.cycleLabel()).toBe('chưa có');
    expect(page.unitLabel({ unit: 'm2' })).toBe('m²');
    expect(page.unitLabel({ unit: 'apartment' })).toBe('căn hộ');
    page.closeEditor();
  });

  it('updates an existing contract and reports save failures', async () => {
    await setup();
    const page = fixture.componentInstance as unknown as {
      openEdit(value: object): void;
      save(): void;
    };
    page.openEdit(RESPONSE.data[0]);
    page.save();
    expect(contracts.update).toHaveBeenCalledWith('contract-1', expect.objectContaining({ carrier: 'Viettel' }));

    contracts.update.mockReturnValue(throwError(() => new Error('failed')));
    page.openEdit(RESPONSE.data[0]);
    page.save();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Không thể lưu hợp đồng');
  });
});
