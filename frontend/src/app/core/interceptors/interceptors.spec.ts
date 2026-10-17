import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';

describe('HTTP interceptors', () => {
  const authStub = { token: 'jwt' as string | null, logout: jasmine.createSpy('logout') };
  const ordersUrl = `${environment.apiUrl}/orders`;

  let http: HttpClient;
  let controller: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    authStub.token = 'jwt';
    authStub.logout.calls.reset();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authStub }
      ]
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => controller.verify());

  it('adds the bearer token to the calls made to the API', () => {
    http.get(ordersUrl).subscribe();

    const request = controller.expectOne(ordersUrl);
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt');
    request.flush({});
  });

  it('does not add a token when nobody is logged in', () => {
    authStub.token = null;

    http.get(ordersUrl).subscribe();

    const request = controller.expectOne(ordersUrl);
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
  });

  it('does not send the token to the login call nor to another host', () => {
    http.post(`${environment.apiUrl}/auth/login`, {}).subscribe();
    const login = controller.expectOne(`${environment.apiUrl}/auth/login`);
    expect(login.request.headers.has('Authorization')).toBeFalse();
    login.flush({});

    http.get('https://other.example/api/orders').subscribe();
    const other = controller.expectOne('https://other.example/api/orders');
    expect(other.request.headers.has('Authorization')).toBeFalse();
    other.flush({});
  });

  it('ends the session and goes to the login page on a 401', () => {
    http.get(ordersUrl).subscribe({ error: () => undefined });

    controller.expectOne(ordersUrl).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authStub.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: {} });
  });

  it('keeps the session on a 401 from the login call itself', () => {
    http.post(`${environment.apiUrl}/auth/login`, {}).subscribe({ error: () => undefined });

    controller
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authStub.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('lets the other errors reach the caller without ending the session', () => {
    let status = 0;

    http.get(ordersUrl).subscribe({ error: error => (status = error.status) });
    controller.expectOne(ordersUrl).flush({}, { status: 409, statusText: 'Conflict' });

    expect(status).toBe(409);
    expect(authStub.logout).not.toHaveBeenCalled();
  });
});
