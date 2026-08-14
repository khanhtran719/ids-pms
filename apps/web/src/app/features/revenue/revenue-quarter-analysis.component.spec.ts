import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { RevenueQuarterSummary } from '@project-ql/api-contracts';
import { RevenueQuarterAnalysisComponent } from './revenue-quarter-analysis.component';

const QUARTERS: RevenueQuarterSummary[] = [
  { quarter: 1, revenue: 100, cost: 50, grossProfit: 50 },
  { quarter: 2, revenue: 100, cost: 60, grossProfit: 40 },
  { quarter: 3, revenue: 100, cost: 70, grossProfit: 30 },
  { quarter: 4, revenue: 300, cost: 120, grossProfit: 180 },
];

describe('RevenueQuarterAnalysisComponent', () => {
  let fixture: ComponentFixture<RevenueQuarterAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevenueQuarterAnalysisComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(RevenueQuarterAnalysisComponent);
    fixture.componentRef.setInput('fiscalYear', 2025);
  });

  it('compares Q4 with the first-three-quarter average and scales bars', () => {
    fixture.componentRef.setInput('quarters', QUARTERS);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('FY2025');
    expect(fixture.nativeElement.textContent).toContain('3.00 lần');
    expect(
      fixture.nativeElement.querySelectorAll('.bar--revenue')[3].style.width,
    ).toBe('100%');
  });

  it('explains when the first three quarters cannot form a baseline', () => {
    fixture.componentRef.setInput(
      'quarters',
      QUARTERS.map((item) => ({
        ...item,
        revenue: item.quarter === 4 ? 20 : 0,
      })),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Chưa đủ số liệu ba quý đầu',
    );
  });
});
