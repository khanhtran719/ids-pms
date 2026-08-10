import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  ProjectDetail,
  ProjectTask,
  TaskStatus,
} from '@project-ql/api-contracts';

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Lên kế hoạch',
  in_progress: 'Đang thực hiện',
  done: 'Hoàn thành',
};

@Component({
  selector: 'app-project-portfolio-summary',
  imports: [RouterLink],
  templateUrl: './project-portfolio-summary.component.html',
  styleUrl: './project-portfolio-summary.component.scss',
})
export class ProjectPortfolioSummaryComponent {
  readonly project = input.required<ProjectDetail>();
  readonly tasks = input.required<ProjectTask[]>();

  protected formatNumber(value: number | undefined, suffix = ''): string {
    if (value === undefined) return '—';
    const formatted = new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 2,
    }).format(value);
    return suffix ? `${formatted} ${suffix}` : formatted;
  }

  protected formatMoney(value: number | undefined): string {
    if (value === undefined || value <= 0) return '—';
    return `${new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 1_000_000_000)} tỷ`;
  }

  protected profit(project: ProjectDetail): number | undefined {
    return project.revenueTotal === undefined || project.costTotal === undefined
      ? undefined
      : project.revenueTotal - project.costTotal;
  }

  protected roi(project: ProjectDetail): string {
    if (!project.capex || project.revenueTotal === undefined) return '—';
    return `${new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format((project.revenueTotal / project.capex) * 100)}%`;
  }

  protected taskStatusLabel(status: TaskStatus): string {
    return TASK_STATUS_LABELS[status];
  }
}
