import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Route, RouterStateSnapshot } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { Role } from '../core/models/auth.models';
import { AuthService } from '../core/services/auth.service';
import { layoutRoutes } from './layout.module';

/** The pages follow the rights of the API: a role that the API refuses is sent back to the dashboard. */
describe('layout routes', () => {
  function child(path: string): Route {
    const route = layoutRoutes[0].children?.find(candidate => candidate.path === path);
    if (!route) {
      throw new Error(`No route ${path}`);
    }
    return route;
  }

  /** Runs the guards of a page for a role: true when it may open it, otherwise where it is sent. */
  function open(path: string, role: Role): unknown[] {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [{ provide: AuthService, useValue: { hasAnyRole: (roles: Role[]) => roles.includes(role) } }]
    });
    const guards = (child(path).canActivate ?? []) as CanActivateFn[];
    return guards.map(guard => TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url: `/${path}` } as RouterStateSnapshot)));
  }

  it('opens the categories to an administrator and a manager', () => {
    expect(open('categories', 'ADMIN')).toEqual([true]);
    expect(open('categories', 'MANAGER')).toEqual([true]);
  });

  it('sends an employee back to the dashboard from the categories', () => {
    const [result] = open('categories', 'EMPLOYEE');

    expect(String(result)).toBe('/dashboard');
  });

  it('opens the users to an administrator only', () => {
    expect(open('users', 'ADMIN')).toEqual([true]);
    expect(String(open('users', 'MANAGER')[0])).toBe('/dashboard');
    expect(String(open('users', 'EMPLOYEE')[0])).toBe('/dashboard');
  });

  it('opens the dashboard and the customers to every role', () => {
    expect(child('dashboard').canActivate).toBeUndefined();
    expect(child('customers').canActivate).toBeUndefined();
  });
});
