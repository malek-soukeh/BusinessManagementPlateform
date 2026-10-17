/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';
import { roleGuard } from './role.guard';

describe('route guards', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated', 'hasAnyRole']);
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [{ provide: AuthService, useValue: auth }]
    });
    router = TestBed.inject(Router);
  });

  function run(guard: CanActivateFn, url = '/orders'): unknown {
    return TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot)
    );
  }

  it('authGuard lets an authenticated user in', () => {
    auth.isAuthenticated.and.returnValue(true);

    expect(run(authGuard)).toBe(true);
  });

  it('authGuard redirects an anonymous user to the login page with the wanted url', () => {
    auth.isAuthenticated.and.returnValue(false);

    const result = run(authGuard, '/orders') as UrlTree;

    expect(router.serializeUrl(result)).toContain('/login');
    expect(result.queryParams['returnUrl']).toBe('/orders');
  });

  it('guestGuard lets an anonymous user see the login page', () => {
    auth.isAuthenticated.and.returnValue(false);

    expect(run(guestGuard)).toBe(true);
  });

  it('guestGuard sends an authenticated user to the dashboard', () => {
    auth.isAuthenticated.and.returnValue(true);

    const result = run(guestGuard) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/dashboard');
  });

  it('roleGuard lets an allowed role in', () => {
    auth.hasAnyRole.and.returnValue(true);

    expect(run(roleGuard(['ADMIN', 'MANAGER']))).toBe(true);
    expect(auth.hasAnyRole).toHaveBeenCalledWith(['ADMIN', 'MANAGER']);
  });

  it('roleGuard sends a forbidden role to the dashboard', () => {
    auth.hasAnyRole.and.returnValue(false);

    const result = run(roleGuard(['ADMIN'])) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/dashboard');
  });
});
