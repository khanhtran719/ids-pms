import {
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
  PercentPipe,
} from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  CarrierContractListResponse,
  CarrierPaymentCycle,
} from '@project-ql/api-contracts';

const PAYMENT_CYCLE_LABELS: Record<CarrierPaymentCycle, string> = {
  monthly: 'Hàng tháng',
  quarterly: 'Hàng quý',
  semi_annual: '6 tháng',
  annual: 'Hàng năm',
  one_time: 'Một lần',
};

@Component({
  selector: 'app-project-carrier-contracts',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, PercentPipe, RouterLink],
  templateUrl: './project-carrier-contracts.component.html',
  styleUrl: './project-carrier-contracts.component.scss',
})
export class ProjectCarrierContractsComponent {
  readonly projectId = input.required<string>();
  readonly response = input<CarrierContractListResponse | null>(null);
  readonly loading = input(false);
  readonly error = input(false);
  readonly retry = output<void>();

  protected paymentCycleLabel(cycle: CarrierPaymentCycle | undefined): string {
    return cycle ? PAYMENT_CYCLE_LABELS[cycle] : 'Chưa có chu kỳ';
  }

  protected contractUnitLabel(unit: 'apartment' | 'm2'): string {
    return unit === 'apartment' ? 'căn hộ' : 'm²';
  }
}
