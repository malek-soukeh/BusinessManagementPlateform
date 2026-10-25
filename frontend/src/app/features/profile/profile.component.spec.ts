import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
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

  let auth: { role: Role; expiresAt: Date; me: jasmine.Spy; logout: jasmine.Spy; changePassword: jasmine.Spy };
  let router: Router;
  let snackBar: MatSnackBar;

  function create(role: Role = 'MANAGER', me = of(profile)): ComponentFixture<ProfileComponent> {
    auth = {
      role,
      expiresAt: new Date(2026, 9, 21, 15, 30),
      me: jasmine.createSpy('me').and.returnValue(me),
      logout: jasmine.createSpy('logout'),
      changePassword: jasmine.createSpy('changePassword').and.returnValue(of(undefined))
    };
    TestBed.configureTestingModule({
      declarations: [ProfileComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: auth }]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    snackBar = TestBed.inject(MatSnackBar);
    spyOn(snackBar, 'open');
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

  it('explains that the other data is changed by an administrator', () => {
    expect(text(create())).toContain('contactez un administrateur');
  });

  describe('password change', () => {
    const fill = (fixture: ComponentFixture<ProfileComponent>, current: string, next: string, confirm = next) => {
      fixture.componentInstance.passwordForm.setValue({
        currentPassword: current, newPassword: next, confirmPassword: confirm
      });
      fixture.detectChanges();
    };

    it('refuses an empty form and a confirmation that differs', () => {
      const fixture = create();

      fixture.componentInstance.changePassword();
      expect(auth.changePassword).not.toHaveBeenCalled();
      expect(fixture.componentInstance.passwordForm.controls.currentPassword.hasError('required')).toBeTrue();

      fill(fixture, 'Old@1234', 'New@12345', 'Other@123');
      fixture.componentInstance.changePassword();

      expect(fixture.componentInstance.passwordForm.controls.confirmPassword.hasError('mismatch')).toBeTrue();
      expect(auth.changePassword).not.toHaveBeenCalled();
    });

    it('refuses a new password that is too short or equal to the current one', () => {
      const fixture = create();

      fill(fixture, 'Old@1234', 'abc');
      expect(fixture.componentInstance.passwordForm.controls.newPassword.hasError('minlength')).toBeTrue();

      fill(fixture, 'Same@1234', 'Same@1234');
      expect(fixture.componentInstance.passwordForm.controls.newPassword.hasError('sameAsCurrent')).toBeTrue();
    });

    it('changes the password, empties the form and confirms', () => {
      const fixture = create();
      fill(fixture, 'Old@1234', 'New@12345');

      fixture.componentInstance.changePassword();

      expect(auth.changePassword).toHaveBeenCalledWith({ currentPassword: 'Old@1234', newPassword: 'New@12345' });
      expect(snackBar.open).toHaveBeenCalledWith('Mot de passe modifié.', 'OK', { duration: 4000 });
      expect(fixture.componentInstance.passwordForm.getRawValue())
        .toEqual({ currentPassword: '', newPassword: '', confirmPassword: '' });
    });

    it('shows a wrong current password under its field', () => {
      const fixture = create();
      auth.changePassword.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409, error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect' }
      })));
      fill(fixture, 'Wrong@123', 'New@12345');

      fixture.componentInstance.changePassword();
      fixture.detectChanges();

      expect(fixture.componentInstance.passwordForm.controls.currentPassword.hasError('incorrect')).toBeTrue();
      expect(text(fixture)).toContain('Mot de passe actuel incorrect');
      expect(snackBar.open).not.toHaveBeenCalled();
    });

    it('shows any other error above the button', () => {
      const fixture = create();
      auth.changePassword.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      fill(fixture, 'Old@1234', 'New@12345');

      fixture.componentInstance.changePassword();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.password-error').textContent).toContain('Serveur injoignable');
    });
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
