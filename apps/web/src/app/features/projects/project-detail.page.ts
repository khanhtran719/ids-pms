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
  CarrierContractListResponse,
  ProjectDetail,
  ProjectMember,
  ProjectMemberCandidate,
  ProjectMembershipRole,
  ProjectOperationalStatus,
  ProjectTask,
  ProjectStatus,
} from '@project-ql/api-contracts';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { CarrierContractsService } from '../../core/carrier-contracts.service';
import { ProjectsService } from '../../core/projects.service';
import { TasksService } from '../../core/tasks.service';
import { ProjectCarrierContractsComponent } from './project-carrier-contracts.component';
import { ProjectPortfolioSummaryComponent } from './project-portfolio-summary.component';

type DetailState =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      project: ProjectDetail;
      members: ProjectMember[];
      tasks: ProjectTask[];
    }
  | { kind: 'error' };

const OPERATIONAL_STATUS_LABELS: Record<ProjectOperationalStatus, string> = {
  not_started: 'Chưa thi công',
  in_progress: 'Đang thi công',
  partial: 'Hoàn thành theo giai đoạn',
  operational: 'Đang khai thác',
};

@Component({
  selector: 'app-project-detail-page',
  imports: [
    ProjectCarrierContractsComponent,
    ProjectPortfolioSummaryComponent,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './project-detail.page.html',
  styleUrl: './project-detail.page.scss',
})
export class ProjectDetailPage {
  private readonly projects = inject(ProjectsService);
  private readonly tasks = inject(TasksService);
  private readonly contracts = inject(CarrierContractsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectId =
    this.route.snapshot.paramMap.get('projectId') ?? '';
  protected readonly auth = inject(AuthSessionStore);
  protected readonly state = signal<DetailState>({ kind: 'loading' });
  protected readonly editOpen = signal(false);
  protected readonly memberPanelOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly operationError = signal<string | null>(null);
  protected readonly carrierContracts =
    signal<CarrierContractListResponse | null>(null);
  protected readonly carrierContractsLoading = signal(false);
  protected readonly carrierContractsError = signal(false);
  protected readonly candidates = signal<ProjectMemberCandidate[]>([]);
  protected readonly candidatesLoading = signal(false);
  protected readonly pendingRemoval = signal<string | null>(null);
  protected readonly editForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    description: new FormControl('', { nonNullable: true }),
    status: new FormControl<ProjectStatus>('planning', { nonNullable: true }),
    operationalStatus: new FormControl<ProjectOperationalStatus>(
      'not_started',
      { nonNullable: true },
    ),
    investor: new FormControl('', { nonNullable: true }),
    province: new FormControl('', { nonNullable: true }),
    address: new FormControl('', { nonNullable: true }),
    projectType: new FormControl('', { nonNullable: true }),
    scaleDescription: new FormControl('', { nonNullable: true }),
    unitCount: new FormControl<number | null>(null, {
      validators: [Validators.min(0)],
    }),
    floorAreaM2: new FormControl<number | null>(null, {
      validators: [Validators.min(0)],
    }),
    landAreaHa: new FormControl<number | null>(null, {
      validators: [Validators.min(0)],
    }),
    capex: new FormControl<number | null>(null, {
      validators: [Validators.min(0)],
    }),
    dataConflict: new FormControl(false, { nonNullable: true }),
    sourceTeldata: new FormControl(false, { nonNullable: true }),
    sourceIbs: new FormControl(false, { nonNullable: true }),
    sourceRevenue: new FormControl(false, { nonNullable: true }),
    startDate: new FormControl('', { nonNullable: true }),
    dueDate: new FormControl('', { nonNullable: true }),
  });
  protected readonly memberForm = new FormGroup({
    userId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    role: new FormControl<ProjectMembershipRole>('member', {
      nonNullable: true,
    }),
  });
  protected readonly candidateSearch = new FormControl('', {
    nonNullable: true,
  });

  constructor() {
    this.load();
    if (this.auth.hasPermission('carrier-contracts.read')) {
      this.loadCarrierContracts();
    }
  }

  protected loadCarrierContracts(): void {
    this.carrierContractsLoading.set(true);
    this.carrierContractsError.set(false);
    this.contracts
      .list({ page: 1, limit: 20, projectId: this.projectId })
      .pipe(
        finalize(() => this.carrierContractsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.carrierContracts.set(response),
        error: () => this.carrierContractsError.set(true),
      });
  }

  protected load(): void {
    this.state.set({ kind: 'loading' });
    forkJoin({
      project: this.projects.getById(this.projectId),
      members: this.projects.listMembers(this.projectId),
      tasks: this.tasks.list(1, 5, this.projectId).pipe(
        map((response) => response.data),
        catchError(() => of([] as ProjectTask[])),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ project, members, tasks }) => {
          this.state.set({ kind: 'ready', project, members, tasks });
          this.editForm.reset({
            name: project.name,
            description: project.description ?? '',
            status: project.status,
            operationalStatus: project.operationalStatus ?? 'not_started',
            investor: project.investor ?? '',
            province: project.province ?? '',
            address: project.address ?? '',
            projectType: project.projectType ?? '',
            scaleDescription: project.scaleDescription ?? '',
            unitCount: project.unitCount ?? null,
            floorAreaM2: project.floorAreaM2 ?? null,
            landAreaHa: project.landAreaHa ?? null,
            capex: project.capex ?? null,
            dataConflict: project.dataConflict ?? false,
            sourceTeldata: project.dataSources?.includes('Teldata') ?? false,
            sourceIbs: project.dataSources?.includes('IBS') ?? false,
            sourceRevenue: project.dataSources?.includes('DoanhThu') ?? false,
            startDate: project.startDate?.slice(0, 10) ?? '',
            dueDate: project.dueDate?.slice(0, 10) ?? '',
          });
        },
        error: () => this.state.set({ kind: 'error' }),
      });
  }

  protected canManage(project: ProjectDetail): boolean {
    return (
      this.auth.hasPermission('projects.manage') ||
      project.myRole === 'owner' ||
      project.myRole === 'manager'
    );
  }

  protected saveProject(): void {
    if (this.editForm.invalid || this.saving()) return;
    const value = this.editForm.getRawValue();
    const dataSources = [
      ...(value.sourceTeldata ? (['Teldata'] as const) : []),
      ...(value.sourceIbs ? (['IBS'] as const) : []),
      ...(value.sourceRevenue ? (['DoanhThu'] as const) : []),
    ];
    this.saving.set(true);
    this.operationError.set(null);
    this.projects
      .update(this.projectId, {
        name: value.name,
        description: value.description,
        status: value.status,
        operationalStatus: value.operationalStatus,
        investor: value.investor || null,
        province: value.province || null,
        address: value.address || null,
        projectType: value.projectType || null,
        scaleDescription: value.scaleDescription || null,
        unitCount: value.unitCount,
        floorAreaM2: value.floorAreaM2,
        landAreaHa: value.landAreaHa,
        capex: value.capex,
        dataConflict: value.dataConflict,
        dataSources,
        startDate: value.startDate || null,
        dueDate: value.dueDate || null,
      })
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (project) => {
          const current = this.state();
          if (current.kind === 'ready') {
            this.state.set({ ...current, project });
          }
          this.editOpen.set(false);
        },
        error: () =>
          this.operationError.set(
            'Không thể cập nhật dự án. Kiểm tra thời gian và thử lại.',
          ),
      });
  }

  protected toggleMemberPanel(): void {
    const opening = !this.memberPanelOpen();
    this.memberPanelOpen.set(opening);
    if (opening && this.candidates().length === 0) this.loadCandidates();
  }

  protected loadCandidates(): void {
    this.candidatesLoading.set(true);
    this.projects
      .listMemberCandidates(
        this.projectId,
        this.candidateSearch.value.trim() || undefined,
        30,
      )
      .pipe(
        finalize(() => this.candidatesLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (candidates) => this.candidates.set(candidates),
        error: () =>
          this.operationError.set('Không thể tải danh sách người dùng.'),
      });
  }

  protected saveMember(): void {
    if (this.memberForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.operationError.set(null);
    this.projects
      .upsertMember(this.projectId, this.memberForm.getRawValue())
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (member) => {
          this.replaceMember(member);
          this.memberForm.reset({ role: 'member' });
          this.memberPanelOpen.set(false);
        },
        error: () =>
          this.operationError.set(
            'Không thể cập nhật thành viên. Dự án phải luôn có ít nhất một owner.',
          ),
      });
  }

  protected changeRole(member: ProjectMember, event: Event): void {
    const role = (event.target as HTMLSelectElement)
      .value as ProjectMembershipRole;
    if (role === member.role) return;
    this.projects
      .upsertMember(this.projectId, { userId: member.userId, role })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => this.replaceMember(updated),
        error: () => {
          (event.target as HTMLSelectElement).value = member.role;
          this.operationError.set(
            'Không thể đổi vai trò. Dự án phải luôn có ít nhất một owner.',
          );
        },
      });
  }

  protected removeMember(userId: string): void {
    this.projects
      .removeMember(this.projectId, userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const current = this.state();
          if (current.kind === 'ready') {
            this.state.set({
              kind: 'ready',
              project: {
                ...current.project,
                memberCount: Math.max(0, current.project.memberCount - 1),
              },
              members: current.members.filter(
                (member) => member.userId !== userId,
              ),
              tasks: current.tasks,
            });
          }
          this.pendingRemoval.set(null);
        },
        error: () => {
          this.pendingRemoval.set(null);
          this.operationError.set('Không thể xóa owner cuối cùng khỏi dự án.');
        },
      });
  }

  protected operationalStatusLabel(
    status: ProjectOperationalStatus | undefined,
  ): string {
    return OPERATIONAL_STATUS_LABELS[status ?? 'not_started'];
  }

  private replaceMember(member: ProjectMember): void {
    const current = this.state();
    if (current.kind !== 'ready') return;
    let replaced = false;
    const members = current.members.map((existing) => {
      if (existing.userId !== member.userId) return existing;
      replaced = true;
      return member;
    });
    if (!replaced) members.push(member);
    this.state.set({
      kind: 'ready',
      project: {
        ...current.project,
        memberCount: current.project.memberCount + (replaced ? 0 : 1),
      },
      members,
      tasks: current.tasks,
    });
  }
}
