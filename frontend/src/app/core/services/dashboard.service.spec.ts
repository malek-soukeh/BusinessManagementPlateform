import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { DashboardStats } from '../models/dashboard.models';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the statistics from the API', () => {
    const stats: DashboardStats = {
      totalCustomers: 4, totalProducts: 3, lowStockProducts: 1, totalOrders: 11, pendingOrders: 1,
      ordersByStatus: { PENDING: 1, CONFIRMED: 4, SHIPPED: 0, DELIVERED: 1, CANCELLED: 5 },
      unpaidInvoices: 1, overdueInvoices: 1,
      totalRevenue: 12378.38, totalCollected: 9303.785, totalOutstanding: 3074.595
    };
    let received: DashboardStats | undefined;

    service.getStats().subscribe(result => (received = result));

    const request = http.expectOne(`${environment.apiUrl}/dashboard/stats`);
    expect(request.request.method).toBe('GET');
    request.flush(stats);
    expect(received).toEqual(stats);
  });

  it('asks for the latest orders, newest first', () => {
    service.recentOrders().subscribe();

    const request = http.expectOne(req => req.url === `${environment.apiUrl}/orders`);
    expect(request.request.params.get('size')).toBe('5');
    expect(request.request.params.get('sort')).toBe('id,desc');
    request.flush({ content: [], page: 0, size: 5, totalElements: 0, totalPages: 0 });
  });

  it('asks for the overdue invoices, the oldest due date first', () => {
    service.overdueInvoices(3).subscribe();

    const request = http.expectOne(req => req.url === `${environment.apiUrl}/invoices`);
    expect(request.request.params.get('status')).toBe('OVERDUE');
    expect(request.request.params.get('size')).toBe('3');
    expect(request.request.params.get('sort')).toBe('dueDate,asc');
    request.flush({ content: [], page: 0, size: 3, totalElements: 0, totalPages: 0 });
  });

  it('asks for the active products in low stock, the emptiest first', () => {
    service.lowStockProducts().subscribe();

    const request = http.expectOne(req => req.url === `${environment.apiUrl}/products`);
    expect(request.request.params.get('lowStock')).toBe('true');
    expect(request.request.params.get('status')).toBe('ACTIVE');
    expect(request.request.params.get('sort')).toBe('quantity,asc');
    request.flush({ content: [], page: 0, size: 5, totalElements: 0, totalPages: 0 });
  });
});
