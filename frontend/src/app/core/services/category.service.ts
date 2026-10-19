import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Category, CategoryPayload } from '../models/category.models';

/** Categories (ADMIN and MANAGER only). The API returns the whole list, sorted by name, without paging. */
@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly url = `${environment.apiUrl}/categories`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(this.url);
  }

  get(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.url}/${id}`);
  }

  create(payload: CategoryPayload): Observable<Category> {
    return this.http.post<Category>(this.url, payload);
  }

  update(id: number, payload: CategoryPayload): Observable<Category> {
    return this.http.put<Category>(`${this.url}/${id}`, payload);
  }

  /** Hard delete: refused by the API (409) while the category has sub-categories or products. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
