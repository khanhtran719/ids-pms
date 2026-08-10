import { DatePipe } from '@angular/common';
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
  ProjectDetail,
  ProjectMember,
  ProjectMemberCandidate,
  ProjectMembershipRole,
  ProjectStatus,
} from '@project-ql/api-contracts';
import { finalize, forkJoin } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { ProjectsService } from '../../core/projects.service';

type DetailState =
  | { kind: 'loading' }
  | { kind: 'ready'; project: ProjectDetail; members: ProjectMember[] }
  | { kind: 'error' };

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Lập kế hoạch',
  active: 'Đang thực hiện',
  on_hold: 'Tạm dừng',
  completed: 'Hoàn thành',
  archived: 'Lưu trữ',
};

@Component({
  selector: 'app-project-detail-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './project-detail.page.html',
  styleUrl: './project-detail.page.scss',
})
export class ProjectDetailPage {
  private readonly projects = inject(ProjectsService);
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
  }

  protected load(): void {
    this.state.set({ kind: 'loading' });
    forkJoin({
      project: this.projects.getById(this.projectId),
      members: this.projects.listMembers(this.projectId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ project, members }) => {
          this.state.set({ kind: 'ready', project, members });
          this.editForm.reset({
            name: project.name,
            description: project.description ?? '',
            status: project.status,
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
    this.saving.set(true);
    this.operationError.set(null);
    this.projects
      .update(this.projectId, {
        name: value.name,
        description: value.description,
        status: value.status,
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

  protected statusLabel(status: ProjectStatus): string {
    return STATUS_LABELS[status];
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
    });
  }
}
