import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import type { RevenueQuarterSummary } from '@project-ql/api-contracts';

@Component({
  selector: 'app-revenue-quarter-analysis',
  imports: [CurrencyPipe, DecimalPipe],
  templateUrl: './revenue-quarter-analysis.component.html',
  styleUrl: './revenue-quarter-analysis.component.scss',
})
export class RevenueQuarterAnalysisComponent {
  readonly fiscalYear = input.required<number>();
  readonly quarters = input.required<RevenueQuarterSummary[]>();
  protected readonly q4Ratio = computed(() => {
    let firstThree = 0;
    let q4 = 0;
    for (const item of this.quarters()) {
      if (item.quarter === 4) q4 = item.revenue;
      else firstThree += item.revenue;
    }
    const average = firstThree / 3;
    return average > 0 ? q4 / average : null;
  });
  private readonly maxValue = computed(() => {
    let max = 1;
    for (const item of this.quarters())
      max = Math.max(max, item.revenue, item.cost);
    return max;
  });

  protected barWidth(value: number): number {
    return (value / this.maxValue()) * 100;
  }
}
