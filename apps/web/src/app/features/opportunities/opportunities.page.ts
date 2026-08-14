import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type {
  BusinessOpportunity,
  CreateOpportunityRequest,
  ListOpportunitiesRequest,
  OpportunityListResponse,
  OpportunityRegion,
  OpportunityStage,
  UpdateOpportunityRequest,
} from '@project-ql/api-contracts';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  merge,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { OpportunitiesService } from '../../core/opportunities.service';

type PageState =
  | { kind: 'loading' }
  | { kind: 'ready'; value: OpportunityListResponse }
  | { kind: 'error' };
const STAGE_LABELS: Record<OpportunityStage, string> = {
  1: 'Tiếp cận thông tin',
  2: 'Gửi phương án HTĐT',
  3: 'Đã nộp hồ sơ thầu',
  4: 'Thống nhất PAHT / trúng thầu',
};
const REGION_LABELS: Record<OpportunityRegion, string> = {
  north: 'Bắc',
  central: 'Trung',
  south: 'Nam',
};

@Component({
  selector: 'app-opportunities-page',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule],
  templateUrl: './opportunities.page.html',
  styleUrl: './opportunities.page.scss',
})
export class OpportunitiesPage {
  private readonly opportunities = inject(OpportunitiesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<ListOpportunitiesRequest>();
  protected readonly auth = inject(AuthSessionStore);
  protected readonly state = signal<PageState>({ kind: 'loading' });
  protected readonly page = signal(1);
  protected readonly editor = signal<'new' | string | null>(null);
  protected readonly saving = signal(false);
  protected readonly operationError = signal<string | null>(null);
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly stage = new FormControl<OpportunityStage | ''>('', {
    nonNullable: true,
  });
  protected readonly region = new FormControl<OpportunityRegion | ''>('', {
    nonNullable: true,
  });
  protected readonly ownerName = new FormControl('', { nonNullable: true });
  protected readonly feasible = new FormControl<'' | 'true' | 'false'>('', {
    nonNullable: true,
  });
  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    region: new FormControl<OpportunityRegion>('south', { nonNullable: true }),
    stage: new FormControl<OpportunityStage>(1, { nonNullable: true }),
    province: new FormControl('', { nonNullable: true }),
    investor: new FormControl('', { nonNullable: true }),
    projectType: new FormControl('', { nonNullable: true }),
    ownerName: new FormControl('', { nonNullable: true }),
    unitCount: new FormControl<number | null>(null, Validators.min(0)),
    floorAreaM2: new FormControl<number | null>(null, Validators.min(0)),
    feasible: new FormControl(false, { nonNullable: true }),
    lastInteractionDate: new FormControl('', { nonNullable: true }),
    note: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.requests
      .pipe(
        tap(() => this.state.set({ kind: 'loading' })),
        switchMap((query) =>
          this.opportunities.list(query).pipe(
            map((value): PageState => ({ kind: 'ready', value })),
            catchError(() => of<PageState>({ kind: 'error' })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.state.set(state));
    merge(
      this.stage.valueChanges,
      this.region.valueChanges,
      this.ownerName.valueChanges,
      this.feasible.valueChanges,
    )
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetAndLoad());
    this.search.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.resetAndLoad());
    this.load();
  }

  protected load(): void {
    const search = this.search.value.trim();
    this.requests.next({
      page: this.page(),
      limit: 20,
      ...(search ? { search } : {}),
      ...(this.stage.value ? { stage: this.stage.value } : {}),
      ...(this.region.value ? { region: this.region.value } : {}),
      ...(this.ownerName.value ? { ownerName: this.ownerName.value } : {}),
      ...(this.feasible.value
        ? { feasible: this.feasible.value === 'true' }
        : {}),
    });
  }

  protected openCreate(): void {
    this.editor.set('new');
    this.operationError.set(null);
    this.form.reset({ region: 'south', stage: 1, feasible: false });
  }

  protected openEdit(item: BusinessOpportunity): void {
    this.editor.set(item.id);
    this.operationError.set(null);
    this.form.setValue({
      name: item.name,
      region: item.region,
      stage: item.stage,
      province: item.province ?? '',
      investor: item.investor ?? '',
      projectType: item.projectType ?? '',
      ownerName: item.ownerName ?? '',
      unitCount: item.unitCount ?? null,
      floorAreaM2: item.floorAreaM2 ?? null,
      feasible: item.feasible,
      lastInteractionDate: item.lastInteractionDate?.slice(0, 10) ?? '',
      note: item.note ?? '',
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
    const value = this.form.getRawValue();
    const common = {
      name: value.name.trim(),
      region: value.region,
      stage: value.stage,
      feasible: value.feasible,
      unitCount: value.unitCount,
      floorAreaM2: value.floorAreaM2,
      province: value.province.trim() || null,
      investor: value.investor.trim() || null,
      projectType: value.projectType.trim() || null,
      ownerName: value.ownerName.trim() || null,
      lastInteractionDate: value.lastInteractionDate || null,
      note: value.note.trim() || null,
    };
    const id = this.editor();
    const request =
      id === 'new'
        ? this.opportunities.create(
            Object.fromEntries(
              Object.entries(common).filter(([, item]) => item !== null),
            ) as unknown as CreateOpportunityRequest,
          )
        : this.opportunities.update(
            id as string,
            common as UpdateOpportunityRequest,
          );
    this.saving.set(true);
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
            'Không thể lưu cơ hội. Vui lòng kiểm tra dữ liệu và thử lại.',
          ),
      });
  }

  protected stageLabel(value: OpportunityStage): string {
    return STAGE_LABELS[value];
  }
  protected regionLabel(value: OpportunityRegion): string {
    return REGION_LABELS[value];
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
  private resetAndLoad(): void {
    this.page.set(1);
    this.load();
  }
}
