import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { Role } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { productRoutes } from './products.module';

/** Every role reads the products; creating and editing follow the rights of the API. */
describe('product routes', () => {
  function open(path: string, role: Role): unknown[] {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [{ provide: AuthService, useValue: { hasAnyRole: (roles: Role[]) => roles.includes(role) } }]
    });
    const route = productRoutes.find(candidate => candidate.path === path);
    const guards = (route?.canActivate ?? []) as CanActivateFn[];
    return guards.map(guard => TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url: `/products/${path}` } as RouterStateSnapshot)));
  }

  it('lets every role read the list', () => {
    expect(open('', 'EMPLOYEE')).toEqual([]);
  });

  it('lets an administrator and a manager create and edit', () => {
    for (const role of ['ADMIN', 'MANAGER'] as Role[]) {
      expect(open('new', role)).toEqual([true]);
      expect(open(':id/edit', role)).toEqual([true]);
    }
  });

  it('sends an employee back to the dashboard from the forms', () => {
    expect(String(open('new', 'EMPLOYEE')[0])).toBe('/dashboard');
    expect(String(open(':id/edit', 'EMPLOYEE')[0])).toBe('/dashboard');
  });
});
