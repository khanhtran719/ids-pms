import { Component, effect, input, output, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type {
  CarrierContract,
  CreateReceivableRequest,
  Receivable,
  UpdateReceivableRequest,
} from '@project-ql/api-contracts';

@Component({
  selector: 'app-receivable-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './receivable-editor.component.html',
  styleUrl: './receivable-editor.component.scss',
})
export class ReceivableEditorComponent {
  readonly contracts = input.required<CarrierContract[]>();
  readonly receivable = input<Receivable | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);
  readonly submitted = output<
    CreateReceivableRequest | UpdateReceivableRequest
  >();
  readonly closed = output<void>();
  protected readonly operationError = signal<string | null>(null);
  protected readonly form = new FormGroup({
    carrierContractId: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    periodLabel: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    amountDue: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
    amountPaid: new FormControl(0, {
      nonNullable: true,
      validators: Validators.min(0),
    }),
    dueDate: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    paidDate: new FormControl('', { nonNullable: true }),
    note: new FormControl('', {
      nonNullable: true,
      validators: Validators.maxLength(500),
    }),
  });

  constructor() {
    effect(() => {
      const item = this.receivable();
      if (!item) return;
      this.form.reset({
        carrierContractId: item.carrierContractId,
        periodLabel: item.periodLabel,
        amountDue: item.amountDue,
        amountPaid: item.amountPaid,
        dueDate: item.dueDate.slice(0, 10),
        paidDate: item.paidDate?.slice(0, 10) ?? '',
        note: item.note ?? '',
      });
    });
  }

  protected submit(): void {
    this.operationError.set(null);
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const amountDue = value.amountDue as number;
    if (value.amountPaid > amountDue) {
      this.operationError.set('Số đã thu không được lớn hơn phải thu.');
      return;
    }
    if (value.amountPaid === amountDue && !value.paidDate) {
      this.operationError.set('Cần nhập ngày thu đủ tiền.');
      return;
    }
    if (value.amountPaid === 0 && value.paidDate) {
      this.operationError.set(
        'Ngày thu tiền chỉ hợp lệ khi số đã thu lớn hơn 0.',
      );
      return;
    }
    const terms = {
      periodLabel: value.periodLabel.trim(),
      amountDue,
      dueDate: value.dueDate,
    };
    if (this.receivable()) {
      this.submitted.emit({
        ...terms,
        amountPaid: value.amountPaid,
        paidDate: value.paidDate || null,
        note: value.note.trim() || null,
      });
      return;
    }
    this.submitted.emit({
      carrierContractId: value.carrierContractId,
      ...terms,
      ...(value.amountPaid ? { amountPaid: value.amountPaid } : {}),
      ...(value.paidDate ? { paidDate: value.paidDate } : {}),
      ...(value.note.trim() ? { note: value.note.trim() } : {}),
    });
  }
}
