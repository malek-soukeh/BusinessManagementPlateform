import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Role, UserProfile } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { SharedModule } from '../../shared/shared.module';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  const profile: UserProfile = {
    id: 2, firstName: 'Aziz', lastName: 'Ben', email: 'manager@techdistrib.tn', phone: null,
    role: 'MANAGER', status: 'ACTIVE'
  };

  let auth: { role: Role; expiresAt: Date; me: jasmine.Spy; logout: jasmine.Spy };
  let router: Router;

  function create(role: Role = 'MANAGER', me = of(profile)): ComponentFixture<ProfileComponent> {
    auth = {
      role,
      expiresAt: new Date(2026, 9, 21, 15, 30),
      me: jasmine.createSpy('me').and.returnValue(me),
      logout: jasmine.createSpy('logout')
    };
    TestBed.configureTestingModule({
      declarations: [ProfileComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: auth }]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    return fixture;
  }

  const text = (fixture: ComponentFixture<ProfileComponent>) =>
    (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');

  it('shows the identity, the role and its rights', () => {
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.avatar').textContent.trim()).toBe('AB');
    expect(text(fixture)).toContain('Aziz Ben');
    expect(text(fixture)).toContain('Manager');
    expect(text(fixture)).toContain('Catalogue, stock, commandes, factures et paiements');
    expect(text(fixture)).toContain('manager@techdistrib.tn');
    const session = Array.from<Element>(fixture.nativeElement.querySelectorAll('.info-item'))
      .find(item => item.textContent?.includes('Session'));
    expect(session?.querySelector('.info-value')?.textContent?.trim()).toBe('15:30');
  });

  it('lists the pages the role may open, without the dashboard', () => {
    const labels = (role: Role) => {
      TestBed.resetTestingModule();
      return Array.from<Element>(create(role).nativeElement.querySelectorAll('.access a'))
        .map(link => (link.textContent ?? '').replace(link.querySelector('mat-icon')?.textContent ?? '', '').trim());
    };

    expect(labels('MANAGER')).toContain('Catégories');
    expect(labels('MANAGER')).not.toContain('Utilisateurs');
    expect(labels('EMPLOYEE')).not.toContain('Catégories');
    expect(labels('ADMIN')).toContain('Utilisateurs');
    expect(labels('ADMIN')).not.toContain('Tableau de bord');
  });

  it('explains that the profile is changed by an administrator', () => {
    expect(text(create())).toContain('contactez un administrateur');
  });

  it('logs out', () => {
    const fixture = create();

    fixture.nativeElement.querySelector('#profile-logout').click();

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('shows the error and reloads on demand', () => {
    const fixture = create('MANAGER', throwError(() => new HttpErrorResponse({ status: 0 })));

    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('Serveur injoignable');

    auth.me.and.returnValue(of(profile));
    fixture.nativeElement.querySelector('.error-panel button').click();
    fixture.detectChanges();

    expect(text(fixture)).toContain('Aziz Ben');
  });
});
