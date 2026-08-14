import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { RevenueReportResponse } from '@project-ql/api-contracts';
import { ProjectRevenueComponent } from './project-revenue.component';

describe('ProjectRevenueComponent', () => {
  const response: RevenueReportResponse = {
    data: [],
    fiscalYear: 2025,
    overview: {
      totalRevenue: 0,
      totalCost: 0,
      grossProfit: 0,
      totalProjects: 1,
      projectsWithRevenue: 0,
      projectsWithoutRevenue: 1,
    },
    quarters: [
      { quarter: 1, revenue: 0, cost: 0, grossProfit: 0 },
      { quarter: 2, revenue: 0, cost: 0, grossProfit: 0 },
      { quarter: 3, revenue: 0, cost: 0, grossProfit: 0 },
      { quarter: 4, revenue: 0, cost: 0, grossProfit: 0 },
    ],
    meta: {
      page: 1,
      limit: 1,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
  let fixture: ComponentFixture<ProjectRevenueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectRevenueComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectRevenueComponent);
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.componentRef.setInput('fiscalYear', 2025);
    fixture.componentRef.setInput('response', response);
    fixture.detectChanges();
  });

  it('keeps all four quarters visible when the project has no actuals', () => {
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(fixture.nativeElement.textContent).toContain('Chưa ghi nhận số liệu');
  });

  it('emits a quarter edit only when management is allowed', () => {
    const selected = jest.fn();
    fixture.componentRef.setInput('canManage', true);
    fixture.componentInstance.quarterSelected.subscribe(selected);
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('button[aria-label="Chỉnh sửa doanh thu quý 1"]')
      .click();

    expect(selected).toHaveBeenCalledWith(1);
  });

  it('emits the selected fiscal year', () => {
    const changed = jest.fn();
    fixture.componentInstance.fiscalYearChanged.subscribe(changed);
    const year = fixture.nativeElement.querySelector(
      '#projectRevenueYear',
    ) as HTMLSelectElement;

    year.value = '2026';
    year.dispatchEvent(new Event('change'));

    expect(changed).toHaveBeenCalledWith(2026);
  });
});
