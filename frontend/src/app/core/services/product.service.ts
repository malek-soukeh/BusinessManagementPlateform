import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page } from '../models/page.models';
import { Product, ProductCreatePayload, ProductQuery, ProductUpdatePayload } from '../models/product.models';

/** Products: every role reads them, only ADMIN and MANAGER write them. */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly url = `${environment.apiUrl}/products`;

  constructor(private readonly http: HttpClient) {}

  list(query: ProductQuery): Observable<Page<Product>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size)
      .set('sort', 'name,asc');
    if (query.q.trim()) {
      params = params.set('q', query.q.trim());
    }
    if (query.categoryId !== null) {
      params = params.set('categoryId', query.categoryId);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.lowStock) {
      params = params.set('lowStock', true);
    }
    return this.http.get<Page<Product>>(this.url, { params });
  }

  get(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.url}/${id}`);
  }

  create(payload: ProductCreatePayload): Observable<Product> {
    return this.http.post<Product>(this.url, payload);
  }

  update(id: number, payload: ProductUpdatePayload): Observable<Product> {
    return this.http.put<Product>(`${this.url}/${id}`, payload);
  }

  /** Soft delete: the product becomes INACTIVE, it can no longer be ordered but keeps its history. */
  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
