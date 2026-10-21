import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { User } from '../../../core/models/user.models';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SharedModule } from '../../../shared/shared.module';
import { UserFormComponent } from './user-form.component';

describe('UserFormComponent', () => {
  const existing: User = {
    id: 5, firstName: 'Leila', lastName: 'Ben Salah', email: 'leila@techdistrib.tn', phone: '20123456',
    role: 'EMPLOYEE', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
  };

  let service: jasmine.SpyObj<UserService>;
  let router: Router;
  let snackBar: { open: jasmine.Spy };

  function create(id?: string): ComponentFixture<UserFormComponent> {
    TestBed.configureTestingModule({
      declarations: [UserFormComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: UserService, useValue: service },
        { provide: AuthService, useValue: { email: 'admin@techdistrib.tn' } },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(UserFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  const fill = (component: UserFormComponent) => component.form.patchValue({
    firstName: ' Leila ', lastName: 'Ben Salah', email: 'Leila@TechDistrib.tn', phone: ' ',
    role: 'MANAGER', password: 'motdepasse1', confirmation: 'motdepasse1'
  });

  beforeEach(() => {
    service = jasmine.createSpyObj<UserService>('UserService', ['list', 'get', 'create', 'update', 'updateStatus', 'delete']);
    snackBar = { open: jasmine.createSpy('open') };
  });

  it('does not call the API while the form is invalid', () => {
    const fixture = create();

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(service.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Le mot de passe est obligatoire.');
  });

  it('requires a password of 8 characters, confirmed', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.form.patchValue({ password: 'court', confirmation: 'court' });
    expect(component.form.controls.password.hasError('minlength')).toBeTrue();

    component.form.patchValue({ password: 'motdepasse1', confirmation: 'motdepasse2' });
    fixture.detectChanges();
    expect(component.form.hasError('mismatch')).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Les mots de passe ne correspondent pas.');
  });

  it('creates the account, email in lower case, without the confirmation', () => {
    service.create.and.returnValue(of(existing));
    const component = create().componentInstance;

    fill(component);
    component.submit();

    expect(service.create).toHaveBeenCalledWith({
      firstName: 'Leila', lastName: 'Ben Salah', email: 'leila@techdistrib.tn', phone: null,
      role: 'MANAGER', password: 'motdepasse1'
    });
    expect(snackBar.open).toHaveBeenCalledWith('Compte de Leila Ben Salah créé.', 'OK', jasmine.anything());
    expect(router.navigate).toHaveBeenCalledWith(['/users']);
  });

  it('shows the password with the eye button', () => {
    const fixture = create();
    const input = () => fixture.nativeElement.querySelector('input[formcontrolname="password"]') as HTMLInputElement;

    expect(input().type).toBe('password');
    (fixture.nativeElement.querySelector('button[matsuffix]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(input().type).toBe('text');
  });

  it('edits a user without any password field', () => {
    service.get.and.returnValue(of(existing));
    service.update.and.returnValue(of(existing));
    const fixture = create('5');
    const component = fixture.componentInstance;

    expect(fixture.nativeElement.querySelector('input[formcontrolname="password"]')).toBeNull();
    expect(component.form.controls.email.enabled).toBeTrue();

    component.form.patchValue({ role: 'MANAGER' });
    component.submit();

    expect(service.update).toHaveBeenCalledWith(5, {
      firstName: 'Leila', lastName: 'Ben Salah', email: 'leila@techdistrib.tn', phone: '20123456', role: 'MANAGER'
    });
  });

  it('locks the email and the role of the own account', () => {
    service.get.and.returnValue(of({ ...existing, email: 'ADMIN@techdistrib.tn', role: 'ADMIN' }));
    const fixture = create('5');
    const component = fixture.componentInstance;

    expect(component.isSelf).toBeTrue();
    expect(component.form.controls.email.disabled).toBeTrue();
    expect(component.form.controls.role.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('.self-notice').textContent).toContain('votre email et votre rôle');
  });

  it('shows a duplicate email under its field', () => {
    service.create.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'Email already in use: leila@techdistrib.tn' }
    })));
    const fixture = create();

    fill(fixture.componentInstance);
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cet email est déjà utilisé.');
    expect(fixture.componentInstance.saving).toBeFalse();
  });

  it('says when the user does not exist', () => {
    service.get.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = create('42');

    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('Utilisateur introuvable.');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
});
