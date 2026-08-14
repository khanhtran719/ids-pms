import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type {
  CarrierContract,
  CreateReceivableRequest,
  Receivable,
  ReceivableListResponse,
  ReceivableStatusFilter,
  UpdateReceivableRequest,
} from '@project-ql/api-contracts';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { CarrierContractsService } from '../../core/carrier-contracts.service';
import { ReceivablesService } from '../../core/receivables.service';
import { ReceivableEditorComponent } from './receivable-editor.component';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; value: ReceivableListResponse }
  | { kind: 'error' };

@Component({
  selector: 'app-receivables-page',
  imports: [ReactiveFormsModule, ReceivableEditorComponent],
  templateUrl: './receivables.page.html',
  styleUrl: './receivables.page.scss',
})
export class ReceivablesPage {
  private readonly receivables = inject(ReceivablesService);
  private readonly carrierContracts = inject(CarrierContractsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthSessionStore);
  protected readonly state = signal<State>({ kind: 'loading' });
  protected readonly page = signal(1);
  protected readonly editor = signal<Receivable | 'new' | null>(null);
  protected readonly contractChoices = signal<CarrierContract[]>([]);
  protected readonly saving = signal(false);
  protected readonly operationError = signal<string | null>(null);
  protected readonly searchFilter = new FormControl('', { nonNullable: true });
  protected readonly statusFilter = new FormControl<
    ReceivableStatusFilter | ''
  >('', { nonNullable: true });
  protected readonly carrierFilter = new FormControl('', { nonNullable: true });

  constructor() {
    this.load();
    this.searchFilter.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.filtersChanged());
    for (const control of [this.statusFilter, this.carrierFilter]) {
      control.valueChanges
        .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.filtersChanged());
    }
  }

  protected load(): void {
    this.state.set({ kind: 'loading' });
    this.receivables
      .list({
        page: this.page(),
        limit: 20,
        ...(this.searchFilter.value.trim()
          ? { search: this.searchFilter.value.trim() }
          : {}),
        ...(this.statusFilter.value ? { status: this.statusFilter.value } : {}),
        ...(this.carrierFilter.value
          ? { carrier: this.carrierFilter.value }
          : {}),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => this.state.set({ kind: 'ready', value }),
        error: () => this.state.set({ kind: 'error' }),
      });
  }

  protected openCreate(): void {
    this.operationError.set(null);
    this.editor.set('new');
    this.carrierContracts
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.contractChoices.set(response.data),
        error: () =>
          this.operationError.set('Không thể tải danh sách hợp đồng nhà mạng.'),
      });
  }

  protected openEdit(item: Receivable): void {
    this.operationError.set(null);
    this.editor.set(item);
  }

  protected closeEditor(): void {
    this.editor.set(null);
    this.operationError.set(null);
  }

  protected save(
    input: CreateReceivableRequest | UpdateReceivableRequest,
  ): void {
    const current = this.editor();
    if (!current || this.saving()) return;
    const request =
      current === 'new'
        ? this.receivables.create(input as CreateReceivableRequest)
        : this.receivables.update(current.id, input as UpdateReceivableRequest);
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
            'Không thể lưu khoản phải thu. Vui lòng kiểm tra dữ liệu và thử lại.',
          ),
      });
  }

  protected money(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected date(value: string): string {
    return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
  }

  protected statusLabel(item: Receivable): string {
    if (item.overdue) return 'Quá hạn';
    if (item.status === 'paid') return 'Đã thu';
    if (item.status === 'partial') return 'Thu một phần';
    return 'Chưa thu';
  }

  protected previous(): void {
    if (this.page() > 1) {
      this.page.update((value) => value - 1);
      this.load();
    }
  }

  protected next(): void {
    const current = this.state();
    if (current.kind === 'ready' && current.value.meta.hasNextPage) {
      this.page.update((value) => value + 1);
      this.load();
    }
  }

  private filtersChanged(): void {
    this.page.set(1);
    this.load();
  }
}
