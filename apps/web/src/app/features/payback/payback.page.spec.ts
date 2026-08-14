import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PaybackReportResponse } from '@project-ql/api-contracts';
import { of, throwError } from 'rxjs';
import { PaybackService } from '../../core/payback.service';
import { PaybackPage } from './payback.page';

const RESPONSE: PaybackReportResponse = {
  fiscalYear: 2025,
  data: [
    {
      projectId: 'project-1',
      projectCode: 'IDS-01',
      projectName: 'IDS Riverside',
      capex: 300_000_000,
      cumulativeRevenue: 420_000_000,
      recoveryRatio: 1.4,
      status: 'paid_back',
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
    totalProjects: 4,
    evaluableProjects: 2,
    paidBackProjects: 1,
    notPaidBackProjects: 1,
    missingCapexProjects: 2,
    evaluationCoverage: 0.5,
  },
};

describe('PaybackPage', () => {
  let fixture: ComponentFixture<PaybackPage>;
  let service: { getReport: jest.Mock };

  async function setup(response: PaybackReportResponse = RESPONSE) {
    service = { getReport: jest.fn().mockReturnValue(of(response)) };
    await TestBed.configureTestingModule({
      imports: [PaybackPage],
      providers: [
        provideRouter([]),
        { provide: PaybackService, useValue: service },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PaybackPage);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders coverage KPIs and evaluated projects', async () => {
    await setup();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Hoàn vốn');
    expect(text).toContain('2/4');
    expect(text).toContain('IDS Riverside');
    expect(text).toContain('140.0%');
    expect(text).toContain('Đã hoàn vốn');
  });

  it('filters immediately by year/status and debounces search', async () => {
    jest.useFakeTimers();
    await setup();
    const component = fixture.componentInstance as unknown as {
      fiscalYearControl: { setValue(value: number): void };
      statusControl: { setValue(value: string): void };
      searchControl: { setValue(value: string): void };
    };

    component.fiscalYearControl.setValue(2024);
    expect(service.getReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ fiscalYear: 2024, page: 1 }),
    );
    component.statusControl.setValue('not_paid_back');
    expect(service.getReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'not_paid_back' }),
    );
    component.searchControl.setValue('Riverside');
    jest.advanceTimersByTime(300);
    expect(service.getReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Riverside' }),
    );
    jest.useRealTimers();
  });

  it('distinguishes no CAPEX coverage from an empty filter result', async () => {
    await setup({
      ...RESPONSE,
      data: [],
      meta: { ...RESPONSE.meta, totalItems: 0, totalPages: 0 },
      overview: {
        totalProjects: 4,
        evaluableProjects: 0,
        paidBackProjects: 0,
        notPaidBackProjects: 0,
        missingCapexProjects: 4,
        evaluationCoverage: 0,
      },
    });
    expect(fixture.nativeElement.textContent).toContain(
      'Chưa có dự án đủ dữ liệu đánh giá',
    );

    TestBed.resetTestingModule();
    await setup({
      ...RESPONSE,
      data: [],
      meta: { ...RESPONSE.meta, totalItems: 0 },
    });
    expect(fixture.nativeElement.textContent).toContain(
      'Không có dự án phù hợp bộ lọc',
    );
  });

  it('offers retry after a report error', async () => {
    await setup();
    service.getReport.mockReturnValue(throwError(() => new Error('offline')));
    const component = fixture.componentInstance as unknown as { load(): void };
    component.load();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Không thể tải báo cáo hoàn vốn',
    );
    const calls = service.getReport.mock.calls.length;
    fixture.nativeElement.querySelector('.state-panel button').click();
    expect(service.getReport).toHaveBeenCalledTimes(calls + 1);
  });
});
