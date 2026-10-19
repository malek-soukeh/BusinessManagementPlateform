import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Customer } from '../../../core/models/customer.models';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerService } from '../../../core/services/customer.service';

import { SharedModule } from '../../../shared/shared.module';
import { CustomerFormComponent } from './customer-form.component';

describe('CustomerFormComponent', () => {
  const existing: Customer = {
    id: 5, firstName: 'Ahmed', lastName: 'Ben Ali', email: 'ahmed@mail.tn', phone: '20123456',
    address: null, company: 'Acme', taxNumber: 'TN-1', status: 'INACTIVE',
    createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z'
  };

  let service: jasmine.SpyObj<CustomerService>;
  let router: Router;

  function create(options: { id?: string; manager?: boolean } = {}): ComponentFixture<CustomerFormComponent> {
    const params = options.id ? { id: options.id } : {};
    TestBed.configureTestingModule({
      declarations: [CustomerFormComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: CustomerService, useValue: service },
        { provide: AuthService, useValue: { hasAnyRole: () => options.manager ?? true } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params) } } }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    const fixture = TestBed.createComponent(CustomerFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    service = jasmine.createSpyObj<CustomerService>(
      'CustomerService', ['list', 'get', 'create', 'update', 'deactivate']);
  });

  it('does not call the API while the form is invalid', () => {
    const component = create().componentInstance;

    component.submit();

    expect(service.create).not.toHaveBeenCalled();
    expect(component.form.controls.firstName.touched).toBeTrue();
    expect(component.form.controls.email.touched).toBeTrue();
  });

  it('creates a customer, turning blank optional fields into null', () => {
    service.create.and.returnValue(of(existing));
    const component = create().componentInstance;
    component.form.patchValue({ firstName: ' Sami ', lastName: 'Trabelsi', email: 'sami@mail.tn', company: '  ' });

    component.submit();

    expect(service.create).toHaveBeenCalledWith({
      firstName: 'Sami', lastName: 'Trabelsi', email: 'sami@mail.tn',
      phone: null, address: null, company: null, taxNumber: null
    });
    expect(router.navigate).toHaveBeenCalledWith(['/customers']);
  });

  it('shows a duplicate email under the email field', () => {
    service.create.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'Email already in use: sami@mail.tn' }
    })));
    const component = create().componentInstance;
    component.form.patchValue({ firstName: 'Sami', lastName: 'Trabelsi', email: 'sami@mail.tn' });

    component.submit();

    expect(component.form.controls.email.hasError('taken')).toBeTrue();
    expect(component.errorMessage).toBeNull();
    expect(component.saving).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows a duplicate tax number under its field', () => {
    service.create.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'Tax number already in use: TN-1' }
    })));
    const component = create().componentInstance;
    component.form.patchValue({ firstName: 'Sami', lastName: 'Trabelsi', email: 'sami@mail.tn', taxNumber: 'TN-1' });

    component.submit();

    expect(component.form.controls.taxNumber.hasError('taken')).toBeTrue();
  });

  it('shows any other error above the buttons', () => {
    service.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    const fixture = create();
    fixture.componentInstance.form.patchValue({ firstName: 'Sami', lastName: 'Trabelsi', email: 'sami@mail.tn' });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error').textContent).toContain('Serveur injoignable');
  });

  it('loads a customer to edit and lets a manager change its status', () => {
    service.get.and.returnValue(of(existing));
    service.update.and.returnValue(of(existing));
    const fixture = create({ id: '5' });
    const component = fixture.componentInstance;

    expect(service.get).toHaveBeenCalledWith(5);
    expect(component.form.getRawValue().lastName).toBe('Ben Ali');
    expect(component.form.getRawValue().address).toBe('');
    expect(fixture.nativeElement.querySelector('mat-select[formControlName="status"]')).not.toBeNull();

    component.form.patchValue({ status: 'ACTIVE' });
    component.submit();

    expect(service.update).toHaveBeenCalledWith(5, jasmine.objectContaining({
      email: 'ahmed@mail.tn', taxNumber: 'TN-1', address: null, status: 'ACTIVE'
    }));
    expect(router.navigate).toHaveBeenCalledWith(['/customers']);
  });

  it('keeps the status away from an employee', () => {
    service.get.and.returnValue(of(existing));
    service.update.and.returnValue(of(existing));
    const fixture = create({ id: '5', manager: false });

    expect(fixture.nativeElement.querySelector('mat-select[formControlName="status"]')).toBeNull();

    fixture.componentInstance.submit();

    expect('status' in service.update.calls.mostRecent().args[1]).toBeFalse();
  });

  it('tells the user when the customer does not exist', () => {
    service.get.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    const fixture = create({ id: '99' });

    expect(fixture.componentInstance.loadError).toBe('Client introuvable.');
    expect(fixture.nativeElement.querySelector('.load-error').textContent).toContain('introuvable');
  });
});