import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { LoginResponse } from '../../../core/models/auth.models';
import { AuthService } from '../../../core/services/auth.service';
import { SharedModule } from '../../../shared/shared.module';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const loginResponse: LoginResponse = {
    accessToken: 'jwt',
    tokenType: 'Bearer',
    expiresIn: 3600,
    email: 'admin@techdistrib.tn',
    role: 'ADMIN'
  };

  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: auth }]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not call the API while the form is invalid', () => {
    component.submit();

    expect(auth.login).not.toHaveBeenCalled();
    expect(component.form.controls.email.touched).toBeTrue();
    expect(component.form.controls.password.touched).toBeTrue();
  });

  it('rejects a malformed email', () => {
    component.form.setValue({ email: 'not-an-email', password: 'secret' });

    expect(component.form.controls.email.hasError('email')).toBeTrue();
    expect(component.form.invalid).toBeTrue();
  });

  it('logs in and goes to the dashboard', () => {
    auth.login.and.returnValue(of(loginResponse));
    component.form.setValue({ email: 'admin@techdistrib.tn', password: 'secret' });

    component.submit();

    expect(auth.login).toHaveBeenCalledWith({ email: 'admin@techdistrib.tn', password: 'secret' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('shows a clear message when the credentials are wrong', () => {
    auth.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    component.form.setValue({ email: 'admin@techdistrib.tn', password: 'wrong' });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Email ou mot de passe incorrect.');
    expect(component.loading).toBeFalse();
    expect(fixture.nativeElement.querySelector('.error').textContent).toContain('incorrect');
  });

  it('tells the user when the server cannot be reached', () => {
    auth.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    component.form.setValue({ email: 'admin@techdistrib.tn', password: 'secret' });

    component.submit();

    expect(component.errorMessage).toContain('Serveur injoignable');
  });
});
