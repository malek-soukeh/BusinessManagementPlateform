import { Component, OnInit, inject } from '@angular/core';

import { DashboardStats } from '../../core/models/dashboard.models';
import { DashboardService } from '../../core/services/dashboard.service';
import { extractErrorMessage } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private readonly dashboard = inject(DashboardService);

  readonly orderStatuses = [
    { key: 'PENDING', label: 'En attente' },
    { key: 'CONFIRMED', label: 'Confirmées' },
    { key: 'SHIPPED', label: 'Expédiées' },
    { key: 'DELIVERED', label: 'Livrées' },
    { key: 'CANCELLED', label: 'Annulées' }
  ];

  loading = true;
  errorMessage: string | null = null;
  stats: DashboardStats | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = null;

    this.dashboard.getStats().subscribe({
      next: stats => {
        this.stats = stats;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = extractErrorMessage(error, 'Impossible de charger le tableau de bord.');
      }
    });
  }

  /** Share of the orders in a given status, in percent, to size the bars. */
  percent(count: number, total: number): number {
    return total === 0 ? 0 : Math.round((count * 100) / total);
  }
}