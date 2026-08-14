import { CurrencyPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import type {
  DashboardOperationalStatusSummary,
  ProjectOperationalStatus,
  RevenueQuarterSummary,
} from '@project-ql/api-contracts';

const STATUS_LABELS: Record<ProjectOperationalStatus, string> = {
  not_started: 'Chưa triển khai',
  in_progress: 'Đang triển khai',
  partial: 'Vận hành một phần',
  operational: 'Đã vận hành',
};

@Component({
  selector: 'app-dashboard-analysis',
  imports: [CurrencyPipe],
  templateUrl: './dashboard-analysis.component.html',
  styleUrl: './dashboard-analysis.component.scss',
})
export class DashboardAnalysisComponent {
  readonly fiscalYear = input.required<number>();
  readonly quarters = input.required<RevenueQuarterSummary[]>();
  readonly statuses = input.required<DashboardOperationalStatusSummary[]>();
  readonly totalProjects = input.required<number>();
  protected readonly statusLabels = STATUS_LABELS;
  private readonly quarterMax = computed(() => {
    let max = 1;
    for (const quarter of this.quarters())
      max = Math.max(max, quarter.revenue, quarter.cost);
    return max;
  });

  protected quarterWidth(value: number): number {
    return (value / this.quarterMax()) * 100;
  }

  protected statusWidth(projects: number): number {
    return this.totalProjects() > 0
      ? (projects / this.totalProjects()) * 100
      : 0;
  }
}
