import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type KpiTone = 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface Kpi {
  id: string;
  label: string;
  icon: string;
  value: number;
  /** Decimals shown (3 for amounts in TND). */
  decimals?: number;
  suffix?: string;
  tone: KpiTone;
  hint?: string;
  /** Draws attention to the hint (something needs an action). */
  alert?: boolean;
  /** Fills a small gauge, in percent. */
  progress?: number | null;
  /** Page opened by a click on the card, null when it does not exist yet or is not allowed. */
  link?: string | null;
}

/** One key figure of the dashboard. */
@Component({
  selector: 'app-kpi-card',
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KpiCardComponent {
  @Input({ required: true }) kpi!: Kpi;
}
