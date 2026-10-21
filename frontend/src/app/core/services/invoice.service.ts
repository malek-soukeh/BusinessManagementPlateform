import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Invoice, InvoiceCreatePayload, InvoiceQuery, InvoiceSummary } from '../models/invoice.models';
import { Page } from '../models/page.models';

/**
 * Invoices. Every role reads them (an EMPLOYEE only those of his orders: the API filters them);
 * only ADMIN and MANAGER create or cancel them.
 */
@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly url = `${environment.apiUrl}/invoices`;

  constructor(private readonly http: HttpClient) {}

  list(query: InvoiceQuery): Observable<Page<InvoiceSummary>> {
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
    if (query.paymentStatus) {
      params = params.set('paymentStatus', query.paymentStatus);
    }
    return this.http.get<Page<InvoiceSummary>>(this.url, { params });
  }

  get(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.url}/${id}`);
  }

  /**
   * The invoice of an order, or null. The API has no "invoice of an order" endpoint: the search
   * also looks in the order number, so the result is narrowed to the exact order.
   */
  findByOrder(orderId: number, orderNumber: string): Observable<InvoiceSummary | null> {
    return this.list({ q: orderNumber, status: '', paymentStatus: '', page: 0, size: 20 }).pipe(
      map(page => page.content.find(invoice => invoice.orderId === orderId) ?? null)
    );
  }

  create(payload: InvoiceCreatePayload): Observable<Invoice> {
    return this.http.post<Invoice>(this.url, payload);
  }

  /** Refused (409) unless the invoice is issued or overdue and has received no payment. */
  cancel(id: number): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.url}/${id}/cancel`, {});
  }
}
