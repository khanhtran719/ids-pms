import { CurrencyPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  DashboardCarrierContractsSummary,
  DashboardTopRevenueProject,
} from '@project-ql/api-contracts';

@Component({
  selector: 'app-dashboard-rankings',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './dashboard-rankings.component.html',
  styleUrl: './dashboard-rankings.component.scss',
})
export class DashboardRankingsComponent {
  readonly projects = input.required<DashboardTopRevenueProject[]>();
  readonly carriers = input.required<DashboardCarrierContractsSummary[]>();
  private readonly projectMax = computed(() => {
    let max = 1;
    for (const project of this.projects()) max = Math.max(max, project.revenue);
    return max;
  });
  private readonly carrierMax = computed(() => {
    let max = 1;
    for (const carrier of this.carriers())
      max = Math.max(max, carrier.contracts);
    return max;
  });

  protected projectWidth(value: number): number {
    return (value / this.projectMax()) * 100;
  }

  protected carrierWidth(value: number): number {
    return (value / this.carrierMax()) * 100;
  }
}
