import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Customer,
  CustomerPayload,
  CustomerQuery,
  CustomerUpdatePayload
} from '../models/customer.models';
import { Page } from '../models/page.models';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly url = `${environment.apiUrl}/customers`;

  constructor(private readonly http: HttpClient) {}

  list(query: CustomerQuery): Observable<Page<Customer>> {
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
    return this.http.get<Page<Customer>>(this.url, { params });
  }

  get(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.url}/${id}`);
  }

  create(payload: CustomerPayload): Observable<Customer> {
    return this.http.post<Customer>(this.url, payload);
  }

  update(id: number, payload: CustomerUpdatePayload): Observable<Customer> {
    return this.http.put<Customer>(`${this.url}/${id}`, payload);
  }

  /** Soft delete: the customer becomes INACTIVE and keeps its history. */
  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}