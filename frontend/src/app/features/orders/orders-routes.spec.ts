import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { Role } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { orderRoutes } from './orders.module';

/** Every role creates and reads orders; modifying one follows the rights of the API. */
describe('order routes', () => {
  function open(path: string, role: Role): unknown[] {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [{ provide: AuthService, useValue: { hasAnyRole: (roles: Role[]) => roles.includes(role) } }]
    });
    const route = orderRoutes.find(candidate => candidate.path === path);
    const guards = (route?.canActivate ?? []) as CanActivateFn[];
    return guards.map(guard => TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url: `/orders/${path}` } as RouterStateSnapshot)));
  }

  it('lets every role list, create and read orders', () => {
    expect(open('', 'EMPLOYEE')).toEqual([]);
    expect(open('new', 'EMPLOYEE')).toEqual([]);
    expect(open(':id', 'EMPLOYEE')).toEqual([]);
  });

  it('lets an administrator and a manager modify an order', () => {
    expect(open(':id/edit', 'ADMIN')).toEqual([true]);
    expect(open(':id/edit', 'MANAGER')).toEqual([true]);
  });

  it('sends an employee back to the dashboard from the modification', () => {
    expect(String(open(':id/edit', 'EMPLOYEE')[0])).toBe('/dashboard');
  });
});
