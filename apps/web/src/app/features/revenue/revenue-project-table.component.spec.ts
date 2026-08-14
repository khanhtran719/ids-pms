import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { RevenueReportResponse } from '@project-ql/api-contracts';
import { RevenueProjectTableComponent } from './revenue-project-table.component';

const REPORT: RevenueReportResponse = {
  fiscalYear: 2025,
  data: [
    {
      projectId: 'project-1',
      projectCode: 'IDS-01',
      projectName: 'IDS Riverside',
      quarters: [1, 2, 3, 4].map((quarter) => ({
        quarter: quarter as 1 | 2 | 3 | 4,
        revenue: quarter * 100,
        cost: quarter * 50,
        grossProfit: quarter * 50,
      })),
      revenueTotal: 1_000,
      costTotal: 500,
      grossProfit: 500,
      grossMargin: 0.5,
    },
  ],
  meta: {
    page: 2,
    limit: 20,
    totalItems: 50,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: true,
  },
  overview: {
    totalRevenue: 1_000,
    totalCost: 500,
    grossProfit: 500,
    grossMargin: 0.5,
    totalProjects: 1,
    projectsWithRevenue: 1,
    projectsWithoutRevenue: 0,
  },
  quarters: [],
};

describe('RevenueProjectTableComponent', () => {
  let fixture: ComponentFixture<RevenueProjectTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevenueProjectTableComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(RevenueProjectTableComponent);
    fixture.componentRef.setInput('report', REPORT);
    fixture.componentRef.setInput('canManage', true);
    fixture.detectChanges();
  });

  it('renders project quarters and emits edit and pagination intents', () => {
    const selected = jest.fn();
    const previous = jest.fn();
    const next = jest.fn();
    fixture.componentInstance.quarterSelected.subscribe(selected);
    fixture.componentInstance.previousRequested.subscribe(previous);
    fixture.componentInstance.nextRequested.subscribe(next);

    expect(fixture.nativeElement.textContent).toContain('IDS Riverside');
    fixture.nativeElement.querySelector('.quarter-button').click();
    const pagination =
      fixture.nativeElement.querySelectorAll('.pagination button');
    pagination[0].click();
    pagination[1].click();

    expect(selected).toHaveBeenCalledWith({
      project: REPORT.data[0],
      quarter: REPORT.data[0].quarters[0],
    });
    expect(previous).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('renders read-only quarter values without edit buttons', () => {
    fixture.componentRef.setInput('canManage', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.quarter-button')).toBeNull();
  });
});
