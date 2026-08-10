import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type {
  PaginatedResponse,
  ProjectDetail,
  ProjectTask,
  TaskListResponse,
  TaskStatus,
  UpdateTaskRequest,
} from '@project-ql/api-contracts';
import { distinctUntilChanged, finalize } from 'rxjs';
import { AuthSessionStore } from '../../core/auth-session.store';
import { ProjectsService } from '../../core/projects.service';
import { TasksService } from '../../core/tasks.service';

type TasksState =
  | { kind: 'loading' }
  | { kind: 'ready'; value: TaskListResponse }
  | { kind: 'error' };

interface TaskGroup {
  projectId: string;
  projectCode: string;
  projectName: string;
  completed: number;
  tasks: ProjectTask[];
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Lên kế hoạch',
  in_progress: 'Đang thực hiện',
  done: 'Hoàn thành',
};

@Component({
  selector: 'app-tasks-page',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './tasks.page.html',
  styleUrl: './tasks.page.scss',
})
export class TasksPage {
  private readonly tasks = inject(TasksService);
  private readonly projects = inject(ProjectsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthSessionStore);
  protected readonly state = signal<TasksState>({ kind: 'loading' });
  protected readonly projectChoices = signal<ProjectDetail[]>([]);
  protected readonly projectsLoading = signal(false);
  protected readonly selectedProjectId = signal('');
  protected readonly initializing = signal(false);
  protected readonly initializeError = signal<string | null>(null);
  protected readonly editingTaskId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly editError = signal<string | null>(null);
  protected readonly statusFilter = new FormControl<TaskStatus | ''>('', {
    nonNullable: true,
  });
  protected readonly editForm = new FormGroup({
    department: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    plannedStartDate: new FormControl('', { nonNullable: true }),
    plannedEndDate: new FormControl('', { nonNullable: true }),
    actualEndDate: new FormControl('', { nonNullable: true }),
    status: new FormControl<TaskStatus>('todo', { nonNullable: true }),
  });
  protected readonly groups = computed<TaskGroup[]>(() => {
    const current = this.state();
    if (current.kind !== 'ready') return [];
    const byProject = new Map<string, TaskGroup>();
    for (const task of current.value.data) {
      let group = byProject.get(task.projectId);
      if (!group) {
        group = {
          projectId: task.projectId,
          projectCode: task.projectCode,
          projectName: task.projectName,
          completed: 0,
          tasks: [],
        };
        byProject.set(task.projectId, group);
      }
      group.tasks.push(task);
      if (task.status === 'done') group.completed += 1;
    }
    return [...byProject.values()];
  });

  constructor() {
    this.load();
    if (this.auth.hasPermission('tasks.manage')) this.loadProjectChoices();
    this.statusFilter.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.load());
  }

  protected load(): void {
    this.state.set({ kind: 'loading' });
    this.tasks
      .list(1, 50, undefined, this.statusFilter.value || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => this.state.set({ kind: 'ready', value }),
        error: () => this.state.set({ kind: 'error' }),
      });
  }

  protected initializePlan(): void {
    const projectId = this.selectedProjectId();
    if (!projectId || this.initializing()) return;
    this.initializing.set(true);
    this.initializeError.set(null);
    this.tasks
      .initializePlan(projectId)
      .pipe(
        finalize(() => this.initializing.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.load(),
        error: () =>
          this.initializeError.set(
            'Không thể khởi tạo kế hoạch. Vui lòng thử lại.',
          ),
      });
  }

  protected editTask(task: ProjectTask): void {
    this.editingTaskId.set(task.id);
    this.editError.set(null);
    this.editForm.setValue({
      department: task.department,
      plannedStartDate: this.toDateInput(task.plannedStartDate),
      plannedEndDate: this.toDateInput(task.plannedEndDate),
      actualEndDate: this.toDateInput(task.actualEndDate),
      status: task.status,
    });
  }

  protected cancelEdit(): void {
    this.editingTaskId.set(null);
    this.editError.set(null);
  }

  protected saveTask(): void {
    const taskId = this.editingTaskId();
    if (!taskId || this.editForm.invalid || this.saving()) {
      this.editForm.markAllAsTouched();
      return;
    }
    const value = this.editForm.getRawValue();
    if (value.status === 'done' && !value.actualEndDate) {
      this.editError.set('Ngày hoàn thành thực tế là bắt buộc khi hoàn thành.');
      return;
    }
    if (value.status !== 'done' && value.actualEndDate) {
      this.editError.set(
        'Chỉ ghi ngày hoàn thành thực tế khi công việc đã hoàn thành.',
      );
      return;
    }
    const input: UpdateTaskRequest = {
      department: value.department,
      plannedStartDate: value.plannedStartDate || null,
      plannedEndDate: value.plannedEndDate || null,
      actualEndDate: value.actualEndDate || null,
      status: value.status,
    };
    this.saving.set(true);
    this.editError.set(null);
    this.tasks
      .update(taskId, input)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.editingTaskId.set(null);
          this.load();
        },
        error: () =>
          this.editError.set(
            'Không thể cập nhật công việc. Kiểm tra ngày và thử lại.',
          ),
      });
  }

  protected statusLabel(status: TaskStatus): string {
    return STATUS_LABELS[status];
  }

  protected isOverdue(task: ProjectTask): boolean {
    return Boolean(
      task.status !== 'done' &&
        task.plannedEndDate &&
        new Date(task.plannedEndDate) < new Date(),
    );
  }

  private loadProjectChoices(): void {
    this.projectsLoading.set(true);
    this.projects
      .list({ page: 1, limit: 100 })
      .pipe(
        finalize(() => this.projectsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (value: PaginatedResponse<ProjectDetail>) =>
          this.projectChoices.set(value.data),
        error: () => this.projectChoices.set([]),
      });
  }

  private toDateInput(value?: string): string {
    return value ? value.slice(0, 10) : '';
  }
}
