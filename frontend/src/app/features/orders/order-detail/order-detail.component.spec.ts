import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Role } from '../../../core/models/auth.models';
import { Order, OrderStatus } from '../../../core/models/order.models';
import { InvoiceSummary } from '../../../core/models/invoice.models';
import { AuthService } from '../../../core/services/auth.service';
import { InvoiceService } from '../../../core/services/invoice.service';
import { OrderService } from '../../../core/services/order.service';
import { SharedModule } from '../../../shared/shared.module';
import { OrderDetailComponent } from './order-detail.component';

registerLocaleData(localeFr);

describe('OrderDetailComponent', () => {
  const order = (status: OrderStatus = 'PENDING'): Order => ({
    id: 7, orderNumber: 'ORD-2026-00007', customerId: 3, customerName: 'Sami Trabelsi',
    orderDate: '2026-10-18T09:30:00Z', status, totalAmount: 4300, createdBy: 'employee@techdistrib.tn',
    createdAt: '2026-10-18T09:30:00Z', updatedAt: '2026-10-18T09:30:00Z',
    items: [
      { id: 1, productId: 4, productReference: 'LAP-001', productName: 'Portable Pro', quantity: 2, unitPrice: 2100, subtotal: 4200 },
      { id: 2, productId: 5, productReference: 'MOU-001', productName: 'Souris', quantity: 1, unitPrice: 100, subtotal: 100 }
    ]
  });

  let service: jasmine.SpyObj<OrderService>;
  let invoices: jasmine.SpyObj<InvoiceService>;
  let dialog: { open: jasmine.Spy };
  let snackBar: { open: jasmine.Spy };

  function create(role: Role = 'MANAGER', id = '7'): ComponentFixture<OrderDetailComponent> {
    TestBed.configureTestingModule({
      declarations: [OrderDetailComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: OrderService, useValue: service },
        { provide: InvoiceService, useValue: invoices },
        { provide: AuthService, useValue: { hasAnyRole: (roles: Role[]) => roles.includes(role) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: LOCALE_ID, useValue: 'fr' }
      ]
    });
    const fixture = TestBed.createComponent(OrderDetailComponent);
    fixture.detectChanges();
    return fixture;
  }

  const actions = (fixture: ComponentFixture<OrderDetailComponent>) =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('button.action'))
      .map(button => button.getAttribute('data-target'));

  const click = (fixture: ComponentFixture<OrderDetailComponent>, target: OrderStatus) => {
    (fixture.nativeElement.querySelector(`button[data-target="${target}"]`) as HTMLButtonElement).click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<OrderService>('OrderService', ['list', 'get', 'create', 'update', 'changeStatus']);
    service.get.and.returnValue(of(order()));
    invoices = jasmine.createSpyObj<InvoiceService>('InvoiceService', ['findByOrder']);
    invoices.findByOrder.and.returnValue(of(null));
    dialog = { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(true) }) };
    snackBar = { open: jasmine.createSpy('open') };
  });

  it('shows the order, its lines and its total', () => {
    const fixture = create();
    const text = (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');

    expect(service.get).toHaveBeenCalledWith(7);
    expect(text).toContain('ORD-2026-00007');
    expect(text).toContain('Sami Trabelsi');
    expect(text).toContain('Lignes (3 articles)');
    expect(fixture.nativeElement.querySelectorAll('tr[mat-row]').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.total').textContent).toMatch(/4\D300,000 TND/);
  });

  it('offers a manager the moves of the workflow and the modification while pending', () => {
    const fixture = create('MANAGER');

    expect(actions(fixture)).toEqual(['CONFIRMED', 'CANCELLED']);
    expect(fixture.nativeElement.querySelector('#edit-button')).not.toBeNull();
  });

  it('offers the next moves only, without modification, once confirmed', () => {
    service.get.and.returnValue(of(order('CONFIRMED')));
    const fixture = create('MANAGER');

    expect(actions(fixture)).toEqual(['SHIPPED', 'CANCELLED']);
    expect(fixture.nativeElement.querySelector('#edit-button')).toBeNull();
  });

  it('offers nothing on a delivered or cancelled order', () => {
    service.get.and.returnValue(of(order('DELIVERED')));
    expect(actions(create('MANAGER'))).toEqual([]);

    TestBed.resetTestingModule();
    service.get.and.returnValue(of(order('CANCELLED')));
    const cancelled = create('MANAGER');
    expect(actions(cancelled)).toEqual([]);
    expect(cancelled.nativeElement.querySelector('.cancelled').textContent).toContain('annulée');
  });

  it('keeps an employee to reading', () => {
    const fixture = create('EMPLOYEE');

    expect(actions(fixture)).toEqual([]);
    expect(fixture.nativeElement.querySelector('#edit-button')).toBeNull();
  });

  it('marks the steps already reached', () => {
    service.get.and.returnValue(of(order('SHIPPED')));
    const fixture = create();

    const done = Array.from<Element>(fixture.nativeElement.querySelectorAll('.step'))
      .map(step => step.classList.contains('done'));
    expect(done).toEqual([true, true, true, false]);
    expect(fixture.nativeElement.querySelector('.step.current').textContent).toContain('Expédiée');
  });

  it('confirms the order after confirmation, warning about the stock', () => {
    service.changeStatus.and.returnValue(of(order('CONFIRMED')));
    const fixture = create();

    click(fixture, 'CONFIRMED');

    expect(dialog.open.calls.mostRecent().args[1].data.message).toContain('stock');
    expect(service.changeStatus).toHaveBeenCalledWith(7, 'CONFIRMED');
    expect(snackBar.open).toHaveBeenCalledWith('Commande ORD-2026-00007 : confirmée.', 'OK', jasmine.anything());
    expect(actions(fixture)).toEqual(['SHIPPED', 'CANCELLED']);
  });

  it('asks a destructive confirmation to cancel, mentioning the stock given back', () => {
    service.get.and.returnValue(of(order('CONFIRMED')));
    service.changeStatus.and.returnValue(of(order('CANCELLED')));
    const fixture = create();

    click(fixture, 'CANCELLED');

    const data = dialog.open.calls.mostRecent().args[1].data;
    expect(data.destructive).toBeTrue();
    expect(data.message).toContain('stock restitué');
    expect(service.changeStatus).toHaveBeenCalledWith(7, 'CANCELLED');
  });

  it('does nothing when the move is not confirmed', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(false) });
    const fixture = create();

    click(fixture, 'CONFIRMED');

    expect(service.changeStatus).not.toHaveBeenCalled();
  });

  it('explains in French why the API refused the move', () => {
    service.get.and.returnValue(of(order('CONFIRMED')));
    service.changeStatus.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { message: 'Cannot cancel order ORD-2026-00007: it has an active invoice, cancel the invoice first' }
    })));
    const fixture = create();

    click(fixture, 'CANCELLED');

    expect(fixture.nativeElement.querySelector('.action-error').textContent)
      .toContain('Impossible d\'annuler la commande ORD-2026-00007 : annulez d\'abord sa facture.');
    expect(fixture.componentInstance.busy).toBeFalse();
  });

  it('says when the order does not exist or belongs to someone else', () => {
    service.get.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = create('EMPLOYEE');

    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('Commande introuvable.');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('does not look for an invoice while the order is pending', () => {
    const fixture = create();

    expect(invoices.findByOrder).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.billing')).toBeNull();
  });

  it('offers a manager to invoice a confirmed order without invoice', () => {
    service.get.and.returnValue(of(order('CONFIRMED')));
    const fixture = create('MANAGER');

    expect(invoices.findByOrder).toHaveBeenCalledWith(7, 'ORD-2026-00007');
    const button = fixture.nativeElement.querySelector('#invoice-button') as HTMLAnchorElement;
    expect(button.getAttribute('href')).toBe('/invoices/new?orderId=7');
  });

  it('links the invoice of the order instead', () => {
    const invoice: InvoiceSummary = {
      id: 4, invoiceNumber: 'INV-2026-00004', orderId: 7, orderNumber: 'ORD-2026-00007', customerId: 3,
      customerName: 'Sami Trabelsi', issueDate: '2026-10-19', dueDate: '2026-11-18', totalAmount: 5117,
      status: 'ISSUED', paymentStatus: 'UNPAID'
    };
    invoices.findByOrder.and.returnValue(of(invoice));
    service.get.and.returnValue(of(order('DELIVERED')));
    const fixture = create('MANAGER');

    expect(fixture.nativeElement.querySelector('#invoice-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.invoice-link').getAttribute('href')).toBe('/invoices/4');
    expect(fixture.nativeElement.querySelector('.billing').textContent).toContain('Émise');
  });

  it('does not offer the invoice to an employee', () => {
    service.get.and.returnValue(of(order('CONFIRMED')));
    const fixture = create('EMPLOYEE');

    expect(fixture.nativeElement.querySelector('#invoice-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.billing').textContent).toContain('pas facturée');
  });
});
