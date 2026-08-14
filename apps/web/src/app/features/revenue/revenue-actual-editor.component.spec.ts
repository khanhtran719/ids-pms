import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ProjectDetail } from '@project-ql/api-contracts';
import { RevenueActualEditorComponent } from './revenue-actual-editor.component';

describe('RevenueActualEditorComponent', () => {
  let fixture: ComponentFixture<RevenueActualEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevenueActualEditorComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(RevenueActualEditorComponent);
    fixture.componentRef.setInput('fiscalYear', 2025);
    fixture.componentRef.setInput('projects', [
      {
        id: 'project-1',
        code: 'IDS-01',
        name: 'IDS Riverside',
      } as ProjectDetail,
    ]);
    fixture.componentRef.setInput('initialValue', {
      projectId: '',
      quarter: 1,
      revenue: 0,
      cost: 0,
    });
    fixture.detectChanges();
  });

  it('blocks invalid input and emits one complete quarterly value', () => {
    const submitted = jest.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    const component = fixture.componentInstance as unknown as {
      form: {
        setValue(value: {
          projectId: string;
          quarter: 2;
          revenue: number;
          cost: number;
        }): void;
      };
      submit(): void;
    };

    component.submit();
    expect(submitted).not.toHaveBeenCalled();
    component.form.setValue({
      projectId: 'project-1',
      quarter: 2,
      revenue: 150,
      cost: 90,
    });
    component.submit();
    expect(submitted).toHaveBeenCalledWith({
      projectId: 'project-1',
      quarter: 2,
      revenue: 150,
      cost: 90,
    });
  });

  it('prevents duplicate submission while saving and emits close', () => {
    const submitted = jest.fn();
    const closed = jest.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentInstance.closed.subscribe(closed);
    fixture.componentRef.setInput('saving', true);
    fixture.componentRef.setInput('initialValue', {
      projectId: 'project-1',
      quarter: 1,
      revenue: 120,
      cost: 80,
    });
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { submit(): void }).submit();
    expect(submitted).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('header button').click();
    expect(closed).toHaveBeenCalledTimes(1);
  });
});
