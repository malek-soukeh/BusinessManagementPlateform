import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
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
      providers: [
        { provide: AuthService, useValue: auth },
        // A desktop screen: the headless browser of the tests is narrow enough to look like a phone.
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false, breakpoints: {} }) } }
      ]
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

  /** Opens the account menu, which Material renders in an overlay outside the component. */
  function openMenu(fixture: ComponentFixture<ShellComponent>): HTMLElement {
    fixture.nativeElement.querySelector('#user-menu-button').click();
    fixture.detectChanges();
    return TestBed.inject(OverlayContainer).getContainerElement();
  }

  it('shows the name, the role and the initials of the logged-in user', () => {
    const fixture = create('MANAGER');

    expect(fixture.nativeElement.querySelector('.user-name').textContent).toContain('Aziz Ben');
    expect(fixture.nativeElement.querySelector('.user-role').textContent).toContain('Manager');
    expect(fixture.nativeElement.querySelector('.avatar').textContent.trim()).toBe('AB');
  });

  it('offers the profile and the logout in the account menu', () => {
    const fixture = create('MANAGER');

    const menu = openMenu(fixture);

    expect(menu.querySelector('.menu-email')?.textContent).toContain('manager@techdistrib.tn');
    expect(menu.querySelector('#profile-link')?.getAttribute('href')).toBe('/profile');
    expect(menu.querySelector('#logout-button')).not.toBeNull();
  });

  it('logs out and goes back to the login page', () => {
    const fixture = create('MANAGER');

    (openMenu(fixture).querySelector('#logout-button') as HTMLButtonElement).click();

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('only links the pages that exist', () => {
    const fixture = create('ADMIN');

    const links = Array.from<Element>(fixture.nativeElement.querySelectorAll('.nav a[href]'));

    expect(links.map(link => link.getAttribute('href'))).toEqual(['/dashboard', '/customers', '/products', '/categories', '/inventory', '/orders', '/invoices', '/users']);
  });

  it('keeps working when the profile cannot be loaded', () => {
    const fixture = create('MANAGER', true);

    expect(fixture.nativeElement.querySelector('.user-name')).toBeNull();
    expect(openMenu(fixture).querySelector('#logout-button')).not.toBeNull();
  });

  it('groups the menu by section', () => {
    const fixture = create('ADMIN');

    const groups = Array.from<Element>(fixture.nativeElement.querySelectorAll('.nav-group-label'))
      .map(label => label.textContent?.trim());
    expect(groups).toEqual(['Gestion', 'Ventes', 'Administration']);
  });

  it('collapses the menu to its icons and remembers it', () => {
    localStorage.removeItem('bmp.nav-collapsed');
    const fixture = create('MANAGER');
    const sidenav = () => fixture.nativeElement.querySelector('.sidenav') as HTMLElement;

    expect(sidenav().classList).not.toContain('collapsed');

    (fixture.nativeElement.querySelector('.collapse-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(sidenav().classList).toContain('collapsed');
    expect(localStorage.getItem('bmp.nav-collapsed')).toBe('true');
    localStorage.removeItem('bmp.nav-collapsed');
  });
});
