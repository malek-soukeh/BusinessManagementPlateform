import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Customer, CustomerStatus } from '../../../core/models/customer.models';
import { Page } from '../../../core/models/page.models';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerService } from '../../../core/services/customer.service';
import { SharedModule } from '../../../shared/shared.module';
import { CustomerListComponent } from './customer-list.component';

describe('CustomerListComponent', () => {
  const customer = (id: number, status: CustomerStatus = 'ACTIVE'): Customer => ({
    id, firstName: 'Ahmed', lastName: `Ben Ali ${id}`, email: `c${id}@mail.tn`, phone: null,
    address: null, company: id === 1 ? 'Acme' : null, taxNumber: null, status,
    createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z'
  });
  const page = (customers: Customer[]): Page<Customer> => ({
    content: customers, page: 0, size: 10, totalElements: customers.length, totalPages: 1
  });

  let service: jasmine.SpyObj<CustomerService>;
  let dialog: { open: jasmine.Spy };

  function create(manager = true): ComponentFixture<CustomerListComponent> {
    TestBed.configureTestingModule({
      declarations: [CustomerListComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: CustomerService, useValue: service },
        { provide: AuthService, useValue: { hasAnyRole: () => manager } },
        { provide: MatDialog, useValue: dialog }
      ]
    });
    const fixture = TestBed.createComponent(CustomerListComponent);
    fixture.detectChanges();
    return fixture;
  }

  const rows = (fixture: ComponentFixture<CustomerListComponent>) =>
    fixture.nativeElement.querySelectorAll('tr[mat-row]');

  beforeEach(() => {
    service = jasmine.createSpyObj<CustomerService>(
      'CustomerService', ['list', 'get', 'create', 'update', 'deactivate']);
    dialog = { open: jasmine.createSpy('open') };
  });

  it('loads the active customers on start', () => {
    service.list.and.returnValue(of(page([customer(1), customer(2)])));

    const fixture = create();

    expect(service.list).toHaveBeenCalledWith({ q: '', status: 'ACTIVE', page: 0, size: 10 });
    expect(rows(fixture).length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Ben Ali 1');
    expect(fixture.nativeElement.textContent).toContain('Acme');
  });

  it('says so when there is no customer', () => {
    service.list.and.returnValue(of(page([])));

    const fixture = create();

    expect(rows(fixture).length).toBe(0);
    expect(fixture.nativeElement.querySelector('.empty').textContent).toContain('Aucun client trouvé');
  });

  it('searches after a short pause and goes back to the first page', fakeAsync(() => {
    service.list.and.returnValue(of(page([])));
    const fixture = create();

    fixture.componentInstance.search.setValue('ali');
    tick(299);
    expect(service.list).toHaveBeenCalledTimes(1);
    tick(1);

    expect(service.list).toHaveBeenCalledTimes(2);
    expect(service.list.calls.mostRecent().args[0]).toEqual({ q: 'ali', status: 'ACTIVE', page: 0, size: 10 });
  }));

  it('filters by status and goes back to the first page', () => {
    service.list.and.returnValue(of(page([])));
    const fixture = create();

    fixture.componentInstance.onStatusChange('');

    expect(service.list.calls.mostRecent().args[0]).toEqual({ q: '', status: '', page: 0, size: 10 });
  });

  it('changes page and page size', () => {
    service.list.and.returnValue(of(page([])));
    const fixture = create();

    fixture.componentInstance.onPage({ pageIndex: 1, pageSize: 20, length: 30, previousPageIndex: 0 });

    expect(service.list.calls.mostRecent().args[0]).toEqual({ q: '', status: 'ACTIVE', page: 1, size: 20 });
  });

  it('deactivates a customer once confirmed, then reloads', () => {
    service.list.and.returnValue(of(page([customer(1)])));
    service.deactivate.and.returnValue(of(undefined));
    dialog.open.and.returnValue({ afterClosed: () => of(true) });
    const fixture = create();

    fixture.nativeElement.querySelector('button[aria-label="Désactiver"]').click();

    expect(dialog.open).toHaveBeenCalled();
    expect(service.deactivate).toHaveBeenCalledWith(1);
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('does nothing when the confirmation is cancelled', () => {
    service.list.and.returnValue(of(page([customer(1)])));
    dialog.open.and.returnValue({ afterClosed: () => of(false) });
    const fixture = create();

    fixture.nativeElement.querySelector('button[aria-label="Désactiver"]').click();

    expect(service.deactivate).not.toHaveBeenCalled();
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it('reactivates an inactive customer', () => {
    service.list.and.returnValue(of(page([customer(2, 'INACTIVE')])));
    service.update.and.returnValue(of(customer(2)));
    const fixture = create();

    fixture.nativeElement.querySelector('button[aria-label="Réactiver"]').click();

    expect(service.update).toHaveBeenCalledWith(
      2, jasmine.objectContaining({ email: 'c2@mail.tn', status: 'ACTIVE' }));
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('gives an employee no way to deactivate or reactivate', () => {
    service.list.and.returnValue(of(page([customer(1), customer(2, 'INACTIVE')])));

    const fixture = create(false);

    expect(fixture.nativeElement.querySelector('button[aria-label="Désactiver"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('button[aria-label="Réactiver"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[aria-label="Modifier"]')).not.toBeNull();
  });

  it('shows the error and lets the user retry', () => {
    service.list.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 0 })),
      of(page([customer(1)])));

    const fixture = create();

    expect(fixture.nativeElement.querySelector('.error-banner').textContent).toContain('Serveur injoignable');

    fixture.nativeElement.querySelector('.error-banner button').click();
    fixture.detectChanges();

    expect(service.list).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.error-banner')).toBeNull();
    expect(rows(fixture).length).toBe(1);
  });
});