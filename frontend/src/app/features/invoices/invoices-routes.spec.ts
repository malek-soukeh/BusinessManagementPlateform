import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { Role } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { invoiceRoutes } from './invoices.module';

/** Every role reads the invoices; creating one follows the rights of the API. */
describe('invoice routes', () => {
  function open(path: string, role: Role): unknown[] {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [{ provide: AuthService, useValue: { hasAnyRole: (roles: Role[]) => roles.includes(role) } }]
    });
    const route = invoiceRoutes.find(candidate => candidate.path === path);
    const guards = (route?.canActivate ?? []) as CanActivateFn[];
    return guards.map(guard => TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url: `/invoices/${path}` } as RouterStateSnapshot)));
  }

  it('lets every role list and read invoices', () => {
    expect(open('', 'EMPLOYEE')).toEqual([]);
    expect(open(':id', 'EMPLOYEE')).toEqual([]);
  });

  it('lets an administrator and a manager create an invoice', () => {
    expect(open('new', 'ADMIN')).toEqual([true]);
    expect(open('new', 'MANAGER')).toEqual([true]);
  });

  it('sends an employee back to the dashboard from the creation', () => {
    expect(String(open('new', 'EMPLOYEE')[0])).toBe('/dashboard');
  });
});
