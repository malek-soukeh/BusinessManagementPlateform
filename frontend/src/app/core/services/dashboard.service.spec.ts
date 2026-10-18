import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { DashboardStats } from '../models/dashboard.models';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('reads the statistics from the API', () => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    const service = TestBed.inject(DashboardService);
    const http = TestBed.inject(HttpTestingController);
    const stats: DashboardStats = {
      totalCustomers: 4, totalProducts: 3, lowStockProducts: 1, totalOrders: 11, pendingOrders: 1,
      ordersByStatus: { PENDING: 1 }, unpaidInvoices: 1, overdueInvoices: 1,
      totalRevenue: 12378.38, totalCollected: 9303.785, totalOutstanding: 3074.595
    };
    let received: DashboardStats | undefined;

    service.getStats().subscribe(result => (received = result));

    const request = http.expectOne(`${environment.apiUrl}/dashboard/stats`);
    expect(request.request.method).toBe('GET');
    request.flush(stats);
    expect(received).toEqual(stats);
    http.verify();
  });
});