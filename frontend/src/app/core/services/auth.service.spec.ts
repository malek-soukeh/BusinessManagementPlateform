import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { LoginResponse } from '../models/auth.models';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const STORAGE_KEY = 'bmp.session';
  const loginUrl = `${environment.apiUrl}/auth/login`;
  const credentials = { email: 'admin@techdistrib.tn', password: 'secret' };
  const response: LoginResponse = {
    accessToken: 'jwt-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    email: 'admin@techdistrib.tn',
    role: 'ADMIN'
  };

  let service: AuthService;
  let http: HttpTestingController;

  /** The service reads the storage when it is created, so tests prepare the storage first. */
  function setup(): void {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('starts a session and stores it after a successful login', () => {
    setup();

    service.login(credentials).subscribe();
    const request = http.expectOne(loginUrl);
    expect(request.request.method).toBe('POST');
    request.flush(response);

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.token).toBe('jwt-token');
    expect(service.role).toBe('ADMIN');
    expect(service.email).toBe('admin@techdistrib.tn');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('jwt-token');
  });

  it('keeps nobody logged in when the login fails', () => {
    setup();
    let status = 0;

    service.login(credentials).subscribe({ error: error => (status = error.status) });
    http.expectOne(loginUrl).flush({ message: 'Bad credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clears the session on logout', () => {
    setup();
    service.login(credentials).subscribe();
    http.expectOne(loginUrl).flush(response);

    service.logout();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.token).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('restores a valid session found in the storage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: 'stored', email: 'a@b.tn', role: 'MANAGER', expiresAt: Date.now() + 60_000 })
    );
    setup();

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.token).toBe('stored');
    expect(service.role).toBe('MANAGER');
  });

  it('ignores an expired session found in the storage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: 'old', email: 'a@b.tn', role: 'ADMIN', expiresAt: Date.now() - 1000 })
    );
    setup();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.token).toBeNull();
  });

  it('gives the end of the session, or null once logged out', () => {
    const expiresAt = Date.now() + 60_000;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: 'stored', email: 'a@b.tn', role: 'MANAGER', expiresAt })
    );
    setup();

    expect(service.expiresAt?.getTime()).toBe(expiresAt);

    service.logout();

    expect(service.expiresAt).toBeNull();
  });

  it('checks the role of the current user', () => {
    setup();
    service.login(credentials).subscribe();
    http.expectOne(loginUrl).flush(response);

    expect(service.hasAnyRole(['MANAGER', 'ADMIN'])).toBeTrue();
    expect(service.hasAnyRole(['EMPLOYEE'])).toBeFalse();
  });

  it('loads the profile of the current user', () => {
    setup();

    service.me().subscribe(profile => expect(profile.email).toBe('admin@techdistrib.tn'));
    const request = http.expectOne(`${environment.apiUrl}/auth/me`);
    expect(request.request.method).toBe('GET');
    request.flush({
      id: 1, firstName: 'Admin', lastName: 'Root', email: 'admin@techdistrib.tn',
      phone: null, role: 'ADMIN', status: 'ACTIVE'
    });
  });
});
