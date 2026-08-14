import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type {
  CarrierContractListResponse,
  Receivable,
  ReceivableListResponse,
} from '@project-ql/api-contracts';
import { of, Subject, throwError } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { CarrierContractsService } from '../../core/carrier-contracts.service';
import { ReceivablesService } from '../../core/receivables.service';
import { ReceivablesPage } from './receivables.page';

const ITEM: Receivable = {
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
  status: 'partial',
  overdue: true,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const RESPONSE: ReceivableListResponse = {
  data: [ITEM],
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
  meta: {
    page: 1,
    limit: 20,
    totalItems: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const CONTRACTS: CarrierContractListResponse = {
  data: [
    {
      id: 'contract-1',
      projectId: 'project-1',
      projectCode: 'IDS-01',
      projectName: 'Eco Green',
      carrier: 'Viettel',
      serviceType: 'teldata',
      quantity: 100,
      unit: 'apartment',
      termsComplete: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  overview: {
    totalContracts: 1,
    teldataContracts: 1,
    ibsContracts: 0,
    contractsWithTerms: 1,
    coveredProjects: 1,
  },
  availableCarriers: ['Viettel'],
  meta: RESPONSE.meta,
};

describe('ReceivablesPage', () => {
  async function createFixture(
    list: jest.Mock = jest.fn(() => of(RESPONSE)),
    canManage = true,
  ): Promise<{
    fixture: ComponentFixture<ReceivablesPage>;
    receivables: { list: jest.Mock; create: jest.Mock; update: jest.Mock };
  }> {
    const receivables = {
      list,
      create: jest.fn(() => of(ITEM)),
      update: jest.fn(() => of(ITEM)),
    };
    await TestBed.configureTestingModule({
      imports: [ReceivablesPage],
      providers: [
        provideRouter([]),
        { provide: ReceivablesService, useValue: receivables },
        {
          provide: CarrierContractsService,
          useValue: { list: jest.fn(() => of(CONTRACTS)) },
        },
      ],
    }).compileComponents();
    TestBed.inject(AuthSessionStore).setSession({
      accessToken: 'token',
      expiresInSeconds: 900,
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        displayName: 'Administrator',
        status: 'active',
        roleCodes: [canManage ? 'admin' : 'member'],
        permissions: [
          'projects.read',
          'carrier-contracts.read',
          'receivables.read',
          ...(canManage ? (['receivables.manage'] as const) : []),
        ],
      },
    });
    const fixture = TestBed.createComponent(ReceivablesPage);
    fixture.detectChanges();
    return { fixture, receivables };
  }

  it('shows loading then renders KPI and the collection table', async () => {
    const response = new Subject<ReceivableListResponse>();
    const { fixture } = await createFixture(jest.fn(() => response));

    expect(fixture.nativeElement.textContent).toContain('Đang tải công nợ');
    response.next(RESPONSE);
    response.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Công nợ');
    expect(fixture.nativeElement.textContent).toContain('Eco Green');
    expect(fixture.nativeElement.textContent).toContain('Q3/2026');
    expect(fixture.nativeElement.textContent).toContain('60.000.000');
    expect(fixture.nativeElement.textContent).toContain('Quá hạn');
  });

  it('opens the editor and creates a manual receivable', async () => {
    const { fixture, receivables } = await createFixture();

    fixture.nativeElement.querySelector('button[data-action="create"]').click();
    fixture.detectChanges();
    const editor = fixture.debugElement.children.find(
      (child) => child.name === 'app-receivable-editor',
    );
    editor?.componentInstance.submitted.emit({
      carrierContractId: 'contract-1',
      periodLabel: 'Q3/2026',
      amountDue: 100,
      dueDate: '2026-08-01',
    });
    fixture.detectChanges();

    expect(receivables.create).toHaveBeenCalledWith({
      carrierContractId: 'contract-1',
      periodLabel: 'Q3/2026',
      amountDue: 100,
      dueDate: '2026-08-01',
    });
    expect(receivables.list).toHaveBeenCalledTimes(2);
  });

  it('renders retryable load failures and hides write controls from readers', async () => {
    const { fixture } = await createFixture(
      jest.fn(() => throwError(() => new Error('offline'))),
      false,
    );

    expect(fixture.nativeElement.textContent).toContain(
      'Không thể tải danh sách công nợ',
    );
    expect(
      fixture.nativeElement.querySelector('button[data-action="create"]'),
    ).toBeNull();
  });

  it('reloads from page one when portfolio filters change', async () => {
    const { fixture, receivables } = await createFixture();
    const component = fixture.componentInstance as unknown as {
      statusFilter: { setValue(value: string): void };
      carrierFilter: { setValue(value: string): void };
    };

    component.statusFilter.setValue('paid');
    component.carrierFilter.setValue('Viettel');

    expect(receivables.list).toHaveBeenNthCalledWith(2, {
      page: 1,
      limit: 20,
      status: 'paid',
    });
    expect(receivables.list).toHaveBeenNthCalledWith(3, {
      page: 1,
      limit: 20,
      status: 'paid',
      carrier: 'Viettel',
    });
  });

  it('opens an existing item and updates it without changing the contract', async () => {
    const { fixture, receivables } = await createFixture();

    fixture.nativeElement
      .querySelector('button.edit-button')
      .dispatchEvent(new Event('click'));
    fixture.detectChanges();
    const editor = fixture.debugElement.children.find(
      (child) => child.name === 'app-receivable-editor',
    );
    editor?.componentInstance.submitted.emit({
      amountPaid: 100_000_000,
      paidDate: '2026-07-20',
    });

    expect(receivables.update).toHaveBeenCalledWith('receivable-1', {
      amountPaid: 100_000_000,
      paidDate: '2026-07-20',
    });
    expect(receivables.list).toHaveBeenCalledTimes(2);
  });

  it('loads the next and previous page using response pagination', async () => {
    const paginated = {
      ...RESPONSE,
      meta: {
        ...RESPONSE.meta,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    };
    const { fixture, receivables } = await createFixture(
      jest.fn(() => of(paginated)),
    );

    let buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.pagination button'),
    ) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.includes('Sau'))?.click();
    fixture.detectChanges();
    buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.pagination button'),
    ) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.includes('Trước'))?.click();

    expect(receivables.list).toHaveBeenNthCalledWith(2, {
      page: 2,
      limit: 20,
    });
    expect(receivables.list).toHaveBeenNthCalledWith(3, {
      page: 1,
      limit: 20,
    });
  });
});
