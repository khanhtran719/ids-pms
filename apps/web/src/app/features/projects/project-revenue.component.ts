import { CurrencyPipe, PercentPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  FiscalQuarter,
  RevenueQuarterSummary,
  RevenueReportResponse,
} from '@project-ql/api-contracts';

const EMPTY_QUARTERS: RevenueQuarterSummary[] = ([1, 2, 3, 4] as const).map(
  (quarter) => ({ quarter, revenue: 0, cost: 0, grossProfit: 0 }),
);

@Component({
  selector: 'app-project-revenue',
  imports: [CurrencyPipe, PercentPipe, RouterLink],
  templateUrl: './project-revenue.component.html',
  styleUrl: './project-revenue.component.scss',
})
export class ProjectRevenueComponent {
  readonly projectId = input.required<string>();
  readonly fiscalYear = input.required<number>();
  readonly response = input<RevenueReportResponse | null>(null);
  readonly loading = input(false);
  readonly error = input(false);
  readonly canManage = input(false);
  readonly retry = output<void>();
  readonly fiscalYearChanged = output<number>();
  readonly quarterSelected = output<FiscalQuarter>();
  protected readonly summary = computed(() => this.response()?.data[0]);
  protected readonly quarters = computed(
    () => this.summary()?.quarters ?? EMPTY_QUARTERS,
  );

  protected changeFiscalYear(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (Number.isInteger(value)) this.fiscalYearChanged.emit(value);
  }
}
