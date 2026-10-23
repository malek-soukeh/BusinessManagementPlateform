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
import { Invoice } from '../../../core/models/invoice.models';
import { Payment } from '../../../core/models/payment.models';
import { AuthService } from '../../../core/services/auth.service';
import { InvoiceService } from '../../../core/services/invoice.service';
import { PaymentService } from '../../../core/services/payment.service';
import { SharedModule } from '../../../shared/shared.module';
import { InvoiceDetailComponent } from './invoice-detail.component';

registerLocaleData(localeFr);

describe('InvoiceDetailComponent', () => {
  const invoice = (changes: Partial<Invoice> = {}): Invoice => ({
    id: 4, invoiceNumber: 'INV-2026-00004', orderId: 7, orderNumber: 'ORD-2026-00007', customerId: 3,
    customerName: 'Sami Trabelsi', issueDate: '2026-10-01', dueDate: '2099-10-31',
    subtotal: 1000, discount: 100, taxAmount: 171, totalAmount: 1071, paidAmount: 0, remainingAmount: 1071,
    status: 'ISSUED', paymentStatus: 'UNPAID',
    createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z',
    items: [{ id: 1, productId: 4, productReference: 'LAP-001', productName: 'Portable Pro', quantity: 1, unitPrice: 1000, subtotal: 1000 }],
    ...changes
  });

  let service: jasmine.SpyObj<InvoiceService>;
  let payments: jasmine.SpyObj<PaymentService>;
  let dialog: { open: jasmine.Spy };
  let snackBar: { open: jasmine.Spy };

  function create(role: Role = 'MANAGER', id = '4'): ComponentFixture<InvoiceDetailComponent> {
    TestBed.configureTestingModule({
      declarations: [InvoiceDetailComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: InvoiceService, useValue: service },
        { provide: PaymentService, useValue: payments },
        { provide: AuthService, useValue: { hasAnyRole: (roles: Role[]) => roles.includes(role) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: LOCALE_ID, useValue: 'fr' }
      ]
    });
    const fixture = TestBed.createComponent(InvoiceDetailComponent);
    fixture.detectChanges();
    return fixture;
  }

  const text = (fixture: ComponentFixture<InvoiceDetailComponent>) =>
    (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');

  beforeEach(() => {
    service = jasmine.createSpyObj<InvoiceService>('InvoiceService', ['list', 'get', 'create', 'cancel', 'findByOrder']);
    service.get.and.returnValue(of(invoice()));
    payments = jasmine.createSpyObj<PaymentService>('PaymentService', ['list', 'record']);
    payments.list.and.returnValue(of([]));
    dialog = { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(true) }) };
    snackBar = { open: jasmine.createSpy('open') };
  });

  it('shows the invoice, its statuses, its lines and its totals', () => {
    const fixture = create();
    const content = text(fixture);

    expect(service.get).toHaveBeenCalledWith(4);
    expect(content).toContain('INV-2026-00004');
    expect(content).toContain('Émise');
    expect(content).toContain('Non payée');
    expect(content).toContain('Portable Pro');
    const totals = Array.from<Element>(fixture.nativeElement.querySelectorAll('.totals > div')).map(row =>
      `${row.querySelector('dt')?.textContent?.trim()} = ${row.querySelector('dd')?.textContent?.trim()}`.replace(/\s/g, ' '));
    expect(totals).toEqual([
      'Sous-total HT = 1 000,000 TND', 'Remise = − 100,000 TND', 'TVA (19 %) = 171,000 TND', 'Total TTC = 1 071,000 TND'
    ]);
  });

  it('links the order of the invoice', () => {
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.order-link').textContent).toContain('ORD-2026-00007');
  });

  it('warns about an overdue invoice', () => {
    service.get.and.returnValue(of(invoice({ status: 'OVERDUE', dueDate: '2000-01-01' })));
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.overdue').textContent).toContain('Échéance dépassée');
  });

  it('lets a manager cancel an unpaid invoice after a destructive confirmation', () => {
    service.cancel.and.returnValue(of(invoice({ status: 'CANCELLED', remainingAmount: 0 })));
    const fixture = create('MANAGER');

    (fixture.nativeElement.querySelector('#cancel-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(dialog.open.calls.mostRecent().args[1].data.destructive).toBeTrue();
    expect(dialog.open.calls.mostRecent().args[1].data.message).toContain('ne pourra pas être facturée à nouveau');
    expect(service.cancel).toHaveBeenCalledWith(4);
    expect(snackBar.open).toHaveBeenCalledWith('Facture INV-2026-00004 annulée.', 'OK', jasmine.anything());
    expect(fixture.nativeElement.querySelector('#cancel-button')).toBeNull();
    expect(text(fixture)).toContain('Annulée');
  });

  it('does not offer to cancel a paid, partly paid or cancelled invoice', () => {
    for (const changes of [
      { status: 'PAID', paymentStatus: 'PAID' },
      { status: 'OVERDUE', paymentStatus: 'PARTIALLY_PAID' },
      { status: 'CANCELLED', paymentStatus: 'UNPAID' }
    ] as Partial<Invoice>[]) {
      TestBed.resetTestingModule();
      service.get.and.returnValue(of(invoice(changes)));
      expect(create('MANAGER').nativeElement.querySelector('#cancel-button')).toBeNull();
    }
  });

  it('keeps an employee to reading', () => {
    const fixture = create('EMPLOYEE');

    expect(fixture.nativeElement.querySelector('#cancel-button')).toBeNull();
    expect(text(fixture)).toContain('Imprimer');
  });

  it('explains in French why the cancellation was refused', () => {
    service.cancel.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'Cannot cancel an invoice that already has payments: INV-2026-00004' }
    })));
    const fixture = create();

    (fixture.nativeElement.querySelector('#cancel-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.action-error').textContent)
      .toContain('Une facture qui a déjà reçu des paiements ne peut pas être annulée.');
  });

  it('prints the page', () => {
    const fixture = create();
    const print = spyOn(window, 'print');

    fixture.componentInstance.print();

    expect(print).toHaveBeenCalled();
  });

  it('says when the invoice does not exist or belongs to someone else', () => {
    service.get.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = create('EMPLOYEE');

    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('Facture introuvable.');
  });

  describe('payments', () => {
    const payment = (id: number, amount: number): Payment => ({
      id, invoiceId: 4, invoiceNumber: 'INV-2026-00004', amount, method: 'BANK_TRANSFER',
      paymentDate: '2026-10-10T10:00:00Z', createdBy: 'manager@techdistrib.tn', createdAt: '2026-10-10T10:00:00Z'
    });

    const amounts = (fixture: ComponentFixture<InvoiceDetailComponent>) => ({
      paid: (fixture.nativeElement.querySelector('.paid').textContent as string).replace(/\s/g, ' ').trim(),
      remaining: (fixture.nativeElement.querySelector('.remaining').textContent as string).replace(/\s/g, ' ').trim()
    });

    it('lists the payments with what is paid and what is left', () => {
      payments.list.and.returnValue(of([payment(2, 300), payment(1, 200.5)]));
      service.get.and.returnValue(of(invoice({
        paymentStatus: 'PARTIALLY_PAID', paidAmount: 500.5, remainingAmount: 570.5
      })));
      const fixture = create();

      expect(payments.list).toHaveBeenCalledWith(4);
      expect(fixture.nativeElement.querySelectorAll('.payments .compact-row').length).toBe(2);
      expect(fixture.nativeElement.querySelector('.payments').textContent).toContain('Virement');
      expect(amounts(fixture)).toEqual({ paid: '500,500 TND', remaining: '570,500 TND' });
    });

    it('reads what is paid and what is left from the API, not from the payments list', () => {
      payments.list.and.returnValue(of([payment(1, 999)]));
      service.get.and.returnValue(of(invoice({
        paymentStatus: 'PARTIALLY_PAID', paidAmount: 100, remainingAmount: 971
      })));
      const fixture = create();

      expect(amounts(fixture)).toEqual({ paid: '100,000 TND', remaining: '971,000 TND' });
    });

    it('still shows the balance when the payments cannot be loaded', () => {
      payments.list.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      service.get.and.returnValue(of(invoice({
        paymentStatus: 'PARTIALLY_PAID', paidAmount: 100, remainingAmount: 971
      })));
      const fixture = create();

      expect(amounts(fixture)).toEqual({ paid: '100,000 TND', remaining: '971,000 TND' });
      expect(fixture.nativeElement.querySelector('.payments .error-line')).not.toBeNull();
    });

    it('says when no payment was received', () => {
      const fixture = create();

      expect(fixture.nativeElement.querySelector('.payments .empty').textContent).toContain('Aucun paiement');
      expect(amounts(fixture)).toEqual({ paid: '0,000 TND', remaining: '1 071,000 TND' });
    });

    it('lets a manager record a payment on an issued invoice, then reloads', () => {
      dialog.open.and.returnValue({ afterClosed: () => of(payment(3, 1071)) });
      const fixture = create('MANAGER');

      (fixture.nativeElement.querySelector('#pay-button') as HTMLButtonElement).click();

      expect(dialog.open.calls.mostRecent().args[1].data.remaining).toBe(1071);
      expect(snackBar.open.calls.mostRecent().args[0].replace(/\s/g, ' ')).toBe('Paiement de 1 071,000 TND enregistré.');
      expect(service.get).toHaveBeenCalledTimes(2);
      expect(payments.list).toHaveBeenCalledTimes(2);
    });

    it('does not reload when the payment is cancelled', () => {
      dialog.open.and.returnValue({ afterClosed: () => of(undefined) });
      const fixture = create('MANAGER');

      (fixture.nativeElement.querySelector('#pay-button') as HTMLButtonElement).click();

      expect(payments.list).toHaveBeenCalledTimes(1);
    });

    it('offers no payment on a paid or cancelled invoice, nor to an employee', () => {
      service.get.and.returnValue(of(invoice({
        status: 'PAID', paymentStatus: 'PAID', paidAmount: 1071, remainingAmount: 0
      })));
      payments.list.and.returnValue(of([payment(1, 1071)]));
      expect(create('MANAGER').nativeElement.querySelector('#pay-button')).toBeNull();

      TestBed.resetTestingModule();
      service.get.and.returnValue(of(invoice({ status: 'CANCELLED', remainingAmount: 0 })));
      payments.list.and.returnValue(of([]));
      expect(create('MANAGER').nativeElement.querySelector('#pay-button')).toBeNull();

      TestBed.resetTestingModule();
      service.get.and.returnValue(of(invoice()));
      expect(create('EMPLOYEE').nativeElement.querySelector('#pay-button')).toBeNull();
    });

    it('offers no payment when nothing is left to pay', () => {
      service.get.and.returnValue(of(invoice({ paymentStatus: 'PAID', paidAmount: 1071, remainingAmount: 0 })));

      expect(create('MANAGER').nativeElement.querySelector('#pay-button')).toBeNull();
    });

    it('shows the error of the payments and reloads them on demand', () => {
      payments.list.and.returnValues(throwError(() => new HttpErrorResponse({ status: 0 })), of([payment(1, 100)]));
      const fixture = create();

      expect(fixture.nativeElement.querySelector('.payments .error-line').textContent).toContain('Serveur injoignable');

      (fixture.nativeElement.querySelector('.payments .error-line button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.payments .compact-row').length).toBe(1);
    });
  });
});