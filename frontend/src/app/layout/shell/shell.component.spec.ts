import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Role, UserProfile } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { SharedModule } from '../../shared/shared.module';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  const profile: UserProfile = {
    id: 1, firstName: 'Aziz', lastName: 'Ben', email: 'manager@techdistrib.tn',
    phone: null, role: 'MANAGER', status: 'ACTIVE'
  };

  let auth: { role: Role | null; me: jasmine.Spy; logout: jasmine.Spy };
  let router: Router;

  function create(role: Role | null, meFails = false): ComponentFixture<ShellComponent> {
    auth = {
      role,
      me: jasmine.createSpy('me').and.returnValue(
        meFails ? throwError(() => new Error('boom')) : of(profile)),
      logout: jasmine.createSpy('logout')
    };
    TestBed.configureTestingModule({
      declarations: [ShellComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: auth }]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    return fixture;
  }

  function labels(fixture: ComponentFixture<ShellComponent>): string[] {
    return Array.from<Element>(fixture.nativeElement.querySelectorAll('.nav-label'))
      .map(element => element.textContent?.trim() ?? '');
  }

  it('shows the whole menu to an administrator', () => {
    const fixture = create('ADMIN');

    expect(labels(fixture)).toContain('Utilisateurs');
    expect(labels(fixture)).toContain('Catégories');
    expect(labels(fixture).length).toBe(8);
  });

  it('hides the users from a manager', () => {
    const fixture = create('MANAGER');

    expect(labels(fixture)).toContain('Catégories');
    expect(labels(fixture)).not.toContain('Utilisateurs');
  });

  it('hides the categories and the users from an employee', () => {
    const fixture = create('EMPLOYEE');

    expect(labels(fixture)).toContain('Commandes');
    expect(labels(fixture)).not.toContain('Catégories');
    expect(labels(fixture)).not.toContain('Utilisateurs');
  });

  it('shows the name of the logged-in user', () => {
    const fixture = create('MANAGER');

    expect(fixture.nativeElement.querySelector('.user-name').textContent).toContain('Aziz Ben');
    expect(fixture.nativeElement.querySelector('.user-role').textContent).toContain('Manager');
  });

  it('logs out and goes back to the login page', () => {
    const fixture = create('MANAGER');

    fixture.nativeElement.querySelector('#logout-button').click();

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('only links the pages that exist', () => {
    const fixture = create('ADMIN');

    const links = Array.from<Element>(fixture.nativeElement.querySelectorAll('mat-nav-list a[href]'));

    expect(links.map(link => link.getAttribute('href'))).toEqual(['/dashboard', '/customers', '/products', '/categories', '/inventory', '/orders', '/invoices', '/users']);
  });

  it('keeps working when the profile cannot be loaded', () => {
    const fixture = create('MANAGER', true);

    expect(fixture.nativeElement.querySelector('.user-name')).toBeNull();
    expect(fixture.nativeElement.querySelector('#logout-button')).not.toBeNull();
  });
});