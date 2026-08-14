import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { CarrierContract, Receivable } from '@project-ql/api-contracts';
import { ReceivableEditorComponent } from './receivable-editor.component';

const CONTRACT: CarrierContract = {
  id: 'contract-1',
  projectId: 'project-1',
  projectCode: 'IDS-01',
  projectName: 'Eco Green',
  carrier: 'Viettel',
  serviceType: 'teldata',
  quantity: 100,
  unit: 'apartment',
  termsComplete: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const RECEIVABLE: Receivable = {
  id: 'receivable-1',
  projectId: 'project-1',
  projectCode: 'IDS-01',
  projectName: 'Eco Green',
  carrierContractId: 'contract-1',
  carrier: 'Viettel',
  periodLabel: 'Q3/2026',
  amountDue: 100,
  amountPaid: 40,
  outstandingAmount: 60,
  dueDate: '2026-08-01T00:00:00.000Z',
  status: 'partial',
  overdue: false,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

describe('ReceivableEditorComponent', () => {
  let fixture: ComponentFixture<ReceivableEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceivableEditorComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ReceivableEditorComponent);
    fixture.componentRef.setInput('contracts', [CONTRACT]);
    fixture.componentRef.setInput('receivable', null);
    fixture.detectChanges();
  });

  it('emits a valid manual receivable from labeled controls', () => {
    const submitted = jest.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    const set = (label: string, value: string) => {
      const input = fixture.nativeElement.querySelector(
        `[aria-label="${label}"]`,
      ) as HTMLInputElement | HTMLSelectElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
    };

    set('Hợp đồng nhà mạng', CONTRACT.id);
    set('Kỳ phải thu', 'Q3/2026');
    set('Phải thu (VND)', '100');
    set('Đã thu (VND)', '40');
    set('Hạn thanh toán', '2026-08-01');
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(submitted).toHaveBeenCalledWith({
      carrierContractId: CONTRACT.id,
      periodLabel: 'Q3/2026',
      amountDue: 100,
      amountPaid: 40,
      dueDate: '2026-08-01',
    });
  });

  it('blocks overpayment and full collection without a paid date', () => {
    const submitted = jest.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue(value: Record<string, unknown>): void;
      };
      submit(): void;
    };

    component.form.patchValue({
      carrierContractId: CONTRACT.id,
      periodLabel: 'Q3/2026',
      amountDue: 100,
      amountPaid: 101,
      dueDate: '2026-08-01',
    });
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Số đã thu không được lớn hơn phải thu',
    );

    component.form.patchValue({ amountPaid: 100 });
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Cần nhập ngày thu đủ tiền',
    );
    expect(submitted).not.toHaveBeenCalled();
  });

  it('loads an existing record without allowing its contract to change', () => {
    fixture.componentRef.setInput('receivable', RECEIVABLE);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Cập nhật khoản phải thu',
    );
    expect(
      fixture.nativeElement.querySelector('[aria-label="Hợp đồng nhà mạng"]'),
    ).toBeNull();
    expect(
      (
        fixture.nativeElement.querySelector(
          '[aria-label="Kỳ phải thu"]',
        ) as HTMLInputElement
      ).value,
    ).toBe('Q3/2026');
  });

  it('can reset paid fields and clear optional values while editing', () => {
    const submitted = jest.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentRef.setInput('receivable', {
      ...RECEIVABLE,
      paidDate: '2026-07-20T00:00:00.000Z',
      note: 'Đã đối soát',
    });
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      form: { patchValue(value: Record<string, unknown>): void };
      submit(): void;
    };

    component.form.patchValue({ amountPaid: 0, paidDate: '', note: '' });
    component.submit();

    expect(submitted).toHaveBeenCalledWith({
      periodLabel: 'Q3/2026',
      amountDue: 100,
      amountPaid: 0,
      dueDate: '2026-08-01',
      paidDate: null,
      note: null,
    });
  });
});
