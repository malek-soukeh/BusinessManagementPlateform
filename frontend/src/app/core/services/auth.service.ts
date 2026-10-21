import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthSession, LoginRequest, LoginResponse, Role, UserProfile } from '../models/auth.models';

const STORAGE_KEY = 'bmp.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(this.readStoredSession());

  /** Emits the current session, or null when nobody is logged in. */
  readonly session$ = this.sessionSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, request)
      .pipe(tap(response => this.startSession(response)));
  }

  me(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${environment.apiUrl}/auth/me`);
  }

  logout(): void {
    this.removeStoredSession();
    this.sessionSubject.next(null);
  }

  get token(): string | null {
    return this.currentSession()?.accessToken ?? null;
  }

  get role(): Role | null {
    return this.currentSession()?.role ?? null;
  }

  get email(): string | null {
    return this.currentSession()?.email ?? null;
  }

  /** End of the session (expiration of the token), or null when nobody is logged in. */
  get expiresAt(): Date | null {
    const session = this.currentSession();
    return session ? new Date(session.expiresAt) : null;
  }

  isAuthenticated(): boolean {
    return this.currentSession() !== null;
  }

  hasAnyRole(roles: Role[]): boolean {
    const role = this.role;
    return role !== null && roles.includes(role);
  }

  /** Returns the session, or logs out first when its token has expired. */
  private currentSession(): AuthSession | null {
    const session = this.sessionSubject.value;
    if (session && session.expiresAt <= Date.now()) {
      this.logout();
      return null;
    }
    return session;
  }

  private startSession(response: LoginResponse): void {
    const session: AuthSession = {
      accessToken: response.accessToken,
      email: response.email,
      role: response.role,
      expiresAt: Date.now() + response.expiresIn * 1000
    };
    this.storeSession(session);
    this.sessionSubject.next(session);
  }

  private readStoredSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const session = JSON.parse(raw) as AuthSession;
      return session.accessToken && session.expiresAt > Date.now() ? session : null;
    } catch {
      return null;
    }
  }

  private storeSession(session: AuthSession): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage unavailable (private mode, quota): the session then lasts until the page is reloaded.
    }
  }

  private removeStoredSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clean up.
    }
  }
}
