import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page } from '../models/page.models';
import { User, UserCreatePayload, UserStatus, UserUpdatePayload } from '../models/user.models';

/** User accounts, reserved to ADMIN by the API. The list has neither search nor filter. */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly url = `${environment.apiUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  list(page: number, size: number): Observable<Page<User>> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'id,asc');
    return this.http.get<Page<User>>(this.url, { params });
  }

  get(id: number): Observable<User> {
    return this.http.get<User>(`${this.url}/${id}`);
  }

  create(payload: UserCreatePayload): Observable<User> {
    return this.http.post<User>(this.url, payload);
  }

  update(id: number, payload: UserUpdatePayload): Observable<User> {
    return this.http.put<User>(`${this.url}/${id}`, payload);
  }

  /** An inactive user can no longer log in; refused (409) on one's own account. */
  updateStatus(id: number, status: UserStatus): Observable<User> {
    return this.http.patch<User>(`${this.url}/${id}/status`, { status });
  }

  /** Hard delete, refused (409) when the user is linked to records or is oneself: deactivate instead. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
