import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type {
  AuthUser,
  OpportunityListResponse,
} from '@project-ql/api-contracts';
import { of, throwError } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { OpportunitiesService } from '../../core/opportunities.service';
import { OpportunitiesPage } from './opportunities.page';

const RESPONSE: OpportunityListResponse = {
  data: [
    {
      id: 'opportunity-1',
      name: 'IDS Riverside',
      region: 'south',
      investor: 'IDS Corporation',
      ownerName: 'Chị Lan',
      stage: 3,
      unitCount: 420,
      feasible: true,
      lastInteractionDate: '2026-08-10T00:00:00.000Z',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-10T00:00:00.000Z',
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
    totalOpportunities: 71,
    feasibleOpportunities: 28,
    missingOwner: 22,
    missingLastInteraction: 45,
    stages: [
      { stage: 1, total: 40 },
      { stage: 2, total: 20 },
      { stage: 3, total: 4 },
      { stage: 4, total: 7 },
    ],
  },
  availableOwners: ['Chị Lan'],
};

describe('OpportunitiesPage', () => {
  let fixture: ComponentFixture<OpportunitiesPage>;
  let opportunities: { list: jest.Mock; create: jest.Mock; update: jest.Mock };

  async function setup(canManage = true): Promise<void> {
    opportunities = {
      list: jest.fn().mockReturnValue(of(RESPONSE)),
      create: jest.fn().mockReturnValue(of(RESPONSE.data[0])),
      update: jest.fn().mockReturnValue(of(RESPONSE.data[0])),
    };
    await TestBed.configureTestingModule({
      imports: [OpportunitiesPage],
      providers: [
        provideRouter([]),
        { provide: OpportunitiesService, useValue: opportunities },
      ],
    }).compileComponents();
    const user = {
      id: 'user-1',
      email: 'manager@example.com',
      displayName: 'Manager',
      status: 'active',
      roleCodes: ['manager'],
      permissions: [
        'opportunities.read',
        ...(canManage ? (['opportunities.manage'] as const) : []),
      ],
    } satisfies AuthUser;
    TestBed.inject(AuthSessionStore).setSession({
      accessToken: 'token',
      expiresInSeconds: 900,
      user,
    });
    fixture = TestBed.createComponent(OpportunitiesPage);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders four pipeline stages, quality warning and opportunity rows', async () => {
    await setup();

    expect(fixture.nativeElement.textContent).toContain('Cơ hội kinh doanh');
    expect(fixture.nativeElement.textContent).toContain('Tiếp cận thông tin');
    expect(fixture.nativeElement.textContent).toContain('40');
    expect(fixture.nativeElement.textContent).toContain('IDS Riverside');
    expect(fixture.nativeElement.textContent).toContain('khả thi');
    expect(fixture.nativeElement.textContent).toContain('22 cơ hội chưa gán');
  });

  it('shows management actions only to opportunity managers', async () => {
    await setup(true);
    expect(
      fixture.nativeElement.querySelector('.primary-button'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.edit-button')).not.toBeNull();

    TestBed.resetTestingModule();
    await setup(false);
    expect(fixture.nativeElement.querySelector('.primary-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.edit-button')).toBeNull();
  });

  it('creates a normalized opportunity and updates an existing stage', async () => {
    await setup();
    const page = fixture.componentInstance as unknown as {
      form: { patchValue(value: object): void };
      openCreate(): void;
      openEdit(value: object): void;
      save(): void;
    };
    page.openCreate();
    page.form.patchValue({ name: '  New Opportunity  ', region: 'north' });
    page.save();
    expect(opportunities.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Opportunity', region: 'north' }),
    );

    page.openEdit(RESPONSE.data[0]);
    page.form.patchValue({ stage: 4 });
    page.save();
    expect(opportunities.update).toHaveBeenCalledWith(
      'opportunity-1',
      expect.objectContaining({ stage: 4 }),
    );
  });

  it('renders a retry state when loading fails', async () => {
    await setup();
    opportunities.list.mockReturnValue(throwError(() => new Error('offline')));
    const page = fixture.componentInstance as unknown as { load(): void };
    page.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Không thể tải danh sách cơ hội',
    );
  });
});
