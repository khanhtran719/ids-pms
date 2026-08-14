import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type { ProjectActivityListResponse } from '@project-ql/api-contracts';
import { finalize } from 'rxjs';
import { ProjectActivitiesService } from '../../core/project-activities.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-project-activity',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './project-activity.component.html',
  styleUrl: './project-activity.component.scss',
})
export class ProjectActivityComponent implements OnInit {
  readonly projectId = input.required<string>();
  private readonly activities = inject(ProjectActivitiesService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly response = signal<ProjectActivityListResponse | null>(
    null,
  );
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly loadError = signal(false);
  protected readonly posting = signal(false);
  protected readonly postError = signal<string | null>(null);
  protected readonly comment = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(2_000)],
  });
  protected readonly commentForm = new FormGroup({
    comment: this.comment,
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    if (this.loadingMore()) return;
    this.loading.set(true);
    this.loadError.set(false);
    this.activities
      .list(this.projectId(), 1, PAGE_SIZE)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => this.response.set(response),
        error: () => this.loadError.set(true),
      });
  }

  protected loadMore(): void {
    const current = this.response();
    if (!current?.meta.hasNextPage || this.loadingMore()) return;
    const nextPage = current.meta.page + 1;
    this.loadingMore.set(true);
    this.loadError.set(false);
    this.activities
      .list(this.projectId(), nextPage, PAGE_SIZE)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingMore.set(false)),
      )
      .subscribe({
        next: (next) =>
          this.response.set({
            data: [...current.data, ...next.data],
            meta: next.meta,
          }),
        error: () => this.loadError.set(true),
      });
  }

  protected submit(): void {
    const content = this.comment.value.trim();
    if (!content) {
      this.comment.setErrors({ required: true });
      this.comment.markAsTouched();
      return;
    }
    if (this.comment.invalid || this.posting()) return;
    this.posting.set(true);
    this.postError.set(null);
    this.activities
      .createComment(this.projectId(), { content })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.posting.set(false)),
      )
      .subscribe({
        next: (created) => {
          const current = this.response();
          const totalItems = (current?.meta.totalItems ?? 0) + 1;
          const page = current?.meta.page ?? 1;
          const limit = current?.meta.limit ?? PAGE_SIZE;
          const totalPages = Math.ceil(totalItems / limit);
          this.response.set({
            data: [created, ...(current?.data ?? [])],
            meta: {
              page,
              limit,
              totalItems,
              totalPages,
              hasNextPage: page < totalPages,
              hasPreviousPage: page > 1,
            },
          });
          this.comment.reset('');
        },
        error: () =>
          this.postError.set('Không thể đăng bình luận. Vui lòng thử lại.'),
      });
  }
}
