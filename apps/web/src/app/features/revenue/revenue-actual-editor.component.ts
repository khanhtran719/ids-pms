import { Component, effect, input, output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type { FiscalQuarter, ProjectDetail } from '@project-ql/api-contracts';

export interface RevenueEditorValue {
  projectId: string;
  quarter: FiscalQuarter;
  revenue: number;
  cost: number;
}

@Component({
  selector: 'app-revenue-actual-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './revenue-actual-editor.component.html',
  styleUrl: './revenue-actual-editor.component.scss',
})
export class RevenueActualEditorComponent {
  readonly fiscalYear = input.required<number>();
  readonly initialValue = input.required<RevenueEditorValue>();
  readonly projects = input.required<ProjectDetail[]>();
  readonly saving = input(false);
  readonly error = input<string | null>(null);
  readonly submitted = output<RevenueEditorValue>();
  readonly closed = output<void>();
  protected readonly form = new FormGroup({
    projectId: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    quarter: new FormControl<FiscalQuarter>(1, { nonNullable: true }),
    revenue: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    cost: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
  });

  constructor() {
    effect(() => this.form.reset(this.initialValue()));
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }
}
