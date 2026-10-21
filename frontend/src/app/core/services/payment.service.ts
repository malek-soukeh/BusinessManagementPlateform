import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Payment, PaymentPayload } from '../models/payment.models';

/**
 * Payments of an invoice. The API has no global payment list: they are read invoice by invoice.
 * Every role reads them (an EMPLOYEE only for the invoices of his orders); only ADMIN and MANAGER record one.
 */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private readonly http: HttpClient) {}

  /** The payments of an invoice, the newest first. */
  list(invoiceId: number): Observable<Payment[]> {
    return this.http.get<Payment[]>(this.url(invoiceId));
  }

  /** Refused (409) on an invoice that is not issued nor overdue, or above what is left to pay. */
  record(invoiceId: number, payload: PaymentPayload): Observable<Payment> {
    return this.http.post<Payment>(this.url(invoiceId), payload);
  }

  private url(invoiceId: number): string {
    return `${environment.apiUrl}/invoices/${invoiceId}/payments`;
  }
}
