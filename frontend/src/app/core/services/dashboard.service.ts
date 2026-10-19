import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { DashboardStats } from '../models/dashboard.models';
import { InvoiceSummary } from '../models/invoice.models';
import { OrderSummary } from '../models/order.models';
import { Page } from '../models/page.models';
import { Product } from '../models/product.models';

/**
 * Data of the dashboard. Besides the statistics, the short lists reuse the paginated endpoints;
 * the API restricts orders and invoices to his own ones for an employee.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.api}/dashboard/stats`);
  }

  recentOrders(size = 5): Observable<Page<OrderSummary>> {
    const params = new HttpParams().set('page', 0).set('size', size).set('sort', 'id,desc');
    return this.http.get<Page<OrderSummary>>(`${this.api}/orders`, { params });
  }

  /** The most overdue first. */
  overdueInvoices(size = 5): Observable<Page<InvoiceSummary>> {
    const params = new HttpParams()
      .set('status', 'OVERDUE').set('page', 0).set('size', size).set('sort', 'dueDate,asc');
    return this.http.get<Page<InvoiceSummary>>(`${this.api}/invoices`, { params });
  }

  /** Active products at or under their minimum stock, the emptiest first. */
  lowStockProducts(size = 5): Observable<Page<Product>> {
    const params = new HttpParams()
      .set('lowStock', true).set('status', 'ACTIVE').set('page', 0).set('size', size).set('sort', 'quantity,asc');
    return this.http.get<Page<Product>>(`${this.api}/products`, { params });
  }
}
