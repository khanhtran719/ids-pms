import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type {
  ProjectActivity,
  ProjectActivityListResponse,
} from '@project-ql/api-contracts';
import { of, Subject, throwError } from 'rxjs';
import { ProjectActivitiesService } from '../../core/project-activities.service';
import { ProjectActivityComponent } from './project-activity.component';

const ACTIVITY: ProjectActivity = {
  id: 'activity-1',
  projectId: 'project-1',
  type: 'comment',
  content: 'Đã xác nhận mặt bằng thi công.',
  authorId: 'user-1',
  authorDisplayName: 'Nguyễn An',
  authorEmail: 'an@example.com',
  createdAt: '2026-08-14T05:00:00.000Z',
};

const RESPONSE: ProjectActivityListResponse = {
  data: [ACTIVITY],
  meta: {
    page: 1,
    limit: 20,
    totalItems: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

describe('ProjectActivityComponent', () => {
  async function createFixture(
    list: jest.Mock = jest.fn(() => of(RESPONSE)),
    createComment: jest.Mock = jest.fn(() =>
      of({
        ...ACTIVITY,
        id: 'activity-2',
        content: 'Bình luận mới',
      }),
    ),
  ): Promise<{
    fixture: ComponentFixture<ProjectActivityComponent>;
    service: { list: jest.Mock; createComment: jest.Mock };
  }> {
    const service = { list, createComment };
    await TestBed.configureTestingModule({
      imports: [ProjectActivityComponent],
      providers: [{ provide: ProjectActivitiesService, useValue: service }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectActivityComponent);
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.detectChanges();
    return { fixture, service };
  }

  it('shows loading then renders an accessible project timeline', async () => {
    const response = new Subject<ProjectActivityListResponse>();
    const { fixture } = await createFixture(jest.fn(() => response));

    expect(fixture.nativeElement.textContent).toContain('Đang tải hoạt động');
    response.next(RESPONSE);
    response.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ol')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Nguyễn An');
    expect(fixture.nativeElement.textContent).toContain(
      'Đã xác nhận mặt bằng thi công.',
    );
  });

  it('posts trimmed content, prepends the new comment and resets the form', async () => {
    const { fixture, service } = await createFixture();
    const textarea = fixture.nativeElement.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;

    textarea.value = '  Bình luận mới  ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(service.createComment).toHaveBeenCalledWith('project-1', {
      content: 'Bình luận mới',
    });
    expect(
      fixture.nativeElement.querySelector('ol li:first-child').textContent,
    ).toContain('Bình luận mới');
    expect(textarea.value).toBe('');
  });

  it('renders a retryable failure without hiding the comment composer', async () => {
    const { fixture, service } = await createFixture(
      jest.fn(() => throwError(() => new Error('offline'))),
    );

    expect(fixture.nativeElement.textContent).toContain(
      'Không thể tải hoạt động dự án',
    );
    expect(fixture.nativeElement.querySelector('textarea')).not.toBeNull();
    fixture.nativeElement.querySelector('button[data-action="retry"]').click();

    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('appends older activities without replacing the current timeline', async () => {
    const older = { ...ACTIVITY, id: 'activity-older', content: 'Cũ hơn' };
    const list = jest
      .fn()
      .mockReturnValueOnce(
        of({
          ...RESPONSE,
          meta: { ...RESPONSE.meta, totalItems: 2, hasNextPage: true },
        }),
      )
      .mockReturnValueOnce(
        of({
          data: [older],
          meta: {
            ...RESPONSE.meta,
            page: 2,
            totalItems: 2,
            hasPreviousPage: true,
          },
        }),
      );
    const { fixture } = await createFixture(list);

    fixture.nativeElement
      .querySelector('button[data-action="load-more"]')
      .click();
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('ol li');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain(ACTIVITY.content);
    expect(items[1].textContent).toContain('Cũ hơn');
    expect(list).toHaveBeenLastCalledWith('project-1', 2, 20);
  });

  it('keeps the current timeline when loading older activities fails', async () => {
    const list = jest
      .fn()
      .mockReturnValueOnce(
        of({
          ...RESPONSE,
          meta: { ...RESPONSE.meta, totalItems: 2, hasNextPage: true },
        }),
      )
      .mockReturnValueOnce(throwError(() => new Error('offline')));
    const { fixture } = await createFixture(list);

    fixture.nativeElement
      .querySelector('button[data-action="load-more"]')
      .click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('ol li')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain(
      'Không thể tải hoạt động cũ hơn',
    );
  });

  it('retains comment content and reports a posting failure', async () => {
    const { fixture, service } = await createFixture(
      undefined,
      jest.fn(() => throwError(() => new Error('offline'))),
    );
    const textarea = fixture.nativeElement.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;

    textarea.value = 'Cập nhật chưa gửi được';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(service.createComment).toHaveBeenCalled();
    expect(textarea.value).toBe('Cập nhật chưa gửi được');
    expect(fixture.nativeElement.textContent).toContain(
      'Không thể đăng bình luận',
    );
  });
});
