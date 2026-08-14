import { CurrencyPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  RevenueProjectSummary,
  RevenueQuarterSummary,
  RevenueReportResponse,
} from '@project-ql/api-contracts';

export interface RevenueQuarterSelection {
  project: RevenueProjectSummary;
  quarter: RevenueQuarterSummary;
}

@Component({
  selector: 'app-revenue-project-table',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './revenue-project-table.component.html',
  styleUrl: './revenue-project-table.component.scss',
})
export class RevenueProjectTableComponent {
  readonly report = input.required<RevenueReportResponse>();
  readonly canManage = input(false);
  readonly quarterSelected = output<RevenueQuarterSelection>();
  readonly previousRequested = output<void>();
  readonly nextRequested = output<void>();
}
