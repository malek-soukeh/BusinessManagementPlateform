import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Order, OrderPayload, OrderQuery, OrderStatus, OrderSummary } from '../models/order.models';
import { Page } from '../models/page.models';

/**
 * Orders. Every role creates and reads them (an EMPLOYEE only his own: the API filters them);
 * only ADMIN and MANAGER modify them or change their status.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly url = `${environment.apiUrl}/orders`;

  constructor(private readonly http: HttpClient) {}

  list(query: OrderQuery): Observable<Page<OrderSummary>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size)
      .set('sort', 'id,desc');
    if (query.q.trim()) {
      params = params.set('q', query.q.trim());
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.customerId !== null) {
      params = params.set('customerId', query.customerId);
    }
    return this.http.get<Page<OrderSummary>>(this.url, { params });
  }

  get(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.url}/${id}`);
  }

  create(payload: OrderPayload): Observable<Order> {
    return this.http.post<Order>(this.url, payload);
  }

  /** Only while the order is PENDING; the lines are replaced and priced again at the current selling price. */
  update(id: number, payload: OrderPayload): Observable<Order> {
    return this.http.put<Order>(`${this.url}/${id}`, payload);
  }

  /** Moves the order in its workflow; confirming takes the stock, cancelling a confirmed order gives it back. */
  changeStatus(id: number, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`${this.url}/${id}/status`, { status });
  }
}
