import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type {
  CarrierContract,
  CarrierContractListResponse,
  CarrierPaymentCycle,
  CarrierServiceType,
  ProjectDetail,
} from '@project-ql/api-contracts';
import { distinctUntilChanged, finalize } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { CarrierContractsService } from '../../core/carrier-contracts.service';
import { ProjectsService } from '../../core/projects.service';
type State =
  | { kind: 'loading' }
  | { kind: 'ready'; value: CarrierContractListResponse }
  | { kind: 'error' };
const CYCLE_LABELS: Record<CarrierPaymentCycle, string> = {
  monthly: 'Hàng tháng',
  quarterly: 'Hàng quý',
  semi_annual: '6 tháng',
  annual: 'Hàng năm',
  one_time: 'Một lần',
};
@Component({
  selector: 'app-carrier-contracts-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './carrier-contracts.page.html',
  styleUrl: './carrier-contracts.page.scss',
})
export class CarrierContractsPage {
  private readonly contracts = inject(CarrierContractsService);
  private readonly projects = inject(ProjectsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  protected readonly scopedProjectId =
    this.route.snapshot.queryParamMap.get('projectId') ?? '';
  protected readonly auth = inject(AuthSessionStore);
  protected readonly state = signal<State>({ kind: 'loading' });
  protected readonly page = signal(1);
  protected readonly editor = signal<'new' | string | null>(null);
  protected readonly saving = signal(false);
  protected readonly operationError = signal<string | null>(null);
  protected readonly projectChoices = signal<ProjectDetail[]>([]);
  protected readonly carrierFilter = new FormControl('', { nonNullable: true });
  protected readonly serviceTypeFilter = new FormControl<
    CarrierServiceType | ''
  >('', { nonNullable: true });
  protected readonly form = new FormGroup({
    projectId: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    carrier: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    serviceType: new FormControl<CarrierServiceType>('teldata', {
      nonNullable: true,
    }),
    quantity: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    unitPrice: new FormControl<number | null>(null),
    paymentCycle: new FormControl<CarrierPaymentCycle | ''>('', {
      nonNullable: true,
    }),
    startDate: new FormControl('', { nonNullable: true }),
    endDate: new FormControl('', { nonNullable: true }),
  });
  constructor() {
    this.load();
    for (const control of [this.carrierFilter, this.serviceTypeFilter])
      control.valueChanges
        .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.page.set(1);
          this.load();
        });
  }
  protected load(): void {
    this.state.set({ kind: 'loading' });
    this.contracts
      .list({
        page: this.page(),
        limit: 20,
        ...(this.scopedProjectId ? { projectId: this.scopedProjectId } : {}),
        ...(this.carrierFilter.value
          ? { carrier: this.carrierFilter.value }
          : {}),
        ...(this.serviceTypeFilter.value
          ? { serviceType: this.serviceTypeFilter.value }
          : {}),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => this.state.set({ kind: 'ready', value }),
        error: () => this.state.set({ kind: 'error' }),
      });
  }
  protected openCreate(): void {
    this.editor.set('new');
    this.form.reset({
      projectId: this.scopedProjectId,
      carrier: '',
      serviceType: 'teldata',
      quantity: 0,
      unitPrice: null,
      paymentCycle: '',
      startDate: '',
      endDate: '',
    });
    this.projects
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => this.projectChoices.set(value.data),
        error: () => this.operationError.set('Không thể tải danh mục dự án.'),
      });
  }
  protected openEdit(item: CarrierContract): void {
    this.editor.set(item.id);
    this.form.setValue({
      projectId: item.projectId,
      carrier: item.carrier,
      serviceType: item.serviceType,
      quantity: item.quantity,
      unitPrice: item.unitPrice ?? null,
      paymentCycle: item.paymentCycle ?? '',
      startDate: item.startDate?.slice(0, 10) ?? '',
      endDate: item.endDate?.slice(0, 10) ?? '',
    });
  }
  protected closeEditor(): void {
    this.editor.set(null);
    this.operationError.set(null);
  }
  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (v.startDate && v.endDate && v.endDate < v.startDate) {
      this.operationError.set('Ngày hết hạn không được trước ngày bắt đầu.');
      return;
    }
    const terms = {
      carrier: v.carrier.trim(),
      serviceType: v.serviceType,
      quantity: v.quantity,
      unitPrice: v.unitPrice,
      paymentCycle: v.paymentCycle || null,
      startDate: v.startDate || null,
      endDate: v.endDate || null,
    };
    const request =
      this.editor() === 'new'
        ? this.contracts.create({
            projectId: v.projectId,
            ...terms,
            unitPrice: v.unitPrice ?? undefined,
            paymentCycle: v.paymentCycle || undefined,
            startDate: v.startDate || undefined,
            endDate: v.endDate || undefined,
          })
        : this.contracts.update(this.editor() as string, terms);
    this.saving.set(true);
    this.operationError.set(null);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.closeEditor();
          this.load();
        },
        error: () =>
          this.operationError.set(
            'Không thể lưu hợp đồng. Vui lòng kiểm tra dữ liệu và thử lại.',
          ),
      });
  }
  protected cycleLabel(value?: CarrierPaymentCycle): string {
    return value ? CYCLE_LABELS[value] : 'chưa có';
  }
  protected unitLabel(item: CarrierContract): string {
    return item.unit === 'apartment' ? 'căn hộ' : 'm²';
  }
  protected previous(): void {
    if (this.page() > 1) {
      this.page.update((v) => v - 1);
      this.load();
    }
  }
  protected next(): void {
    const s = this.state();
    if (s.kind === 'ready' && s.value.meta.hasNextPage) {
      this.page.update((v) => v + 1);
      this.load();
    }
  }
}
