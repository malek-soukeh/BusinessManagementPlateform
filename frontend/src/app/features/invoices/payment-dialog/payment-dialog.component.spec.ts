import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { todayIso } from '../../../core/models/invoice.models';
import { Payment } from '../../../core/models/payment.models';
import { PaymentService } from '../../../core/services/payment.service';
import { SharedModule } from '../../../shared/shared.module';
import { PaymentDialogComponent, PaymentDialogData } from './payment-dialog.component';

registerLocaleData(localeFr);

describe('PaymentDialogComponent', () => {
  const data: PaymentDialogData = {
    invoice: { id: 4, invoiceNumber: 'INV-2026-00004', totalAmount: 1071 },
    remaining: 571
  };
  const payment: Payment = {
    id: 9, invoiceId: 4, invoiceNumber: 'INV-2026-00004', amount: 200, method: 'CASH',
    paymentDate: '2026-10-21T10:00:00Z', createdBy: 'manager@techdistrib.tn', createdAt: '2026-10-21T10:00:00Z'
  };

  let payments: jasmine.SpyObj<PaymentService>;
  let dialogRef: { close: jasmine.Spy };

  function create(): ComponentFixture<PaymentDialogComponent> {
    TestBed.configureTestingModule({
      declarations: [PaymentDialogComponent],
      imports: [SharedModule, NoopAnimationsModule],
      providers: [
        { provide: PaymentService, useValue: payments },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: LOCALE_ID, useValue: 'fr' }
      ]
    });
    const fixture = TestBed.createComponent(PaymentDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    payments = jasmine.createSpyObj<PaymentService>('PaymentService', ['list', 'record']);
    dialogRef = { close: jasmine.createSpy('close') };
  });

  it('proposes to pay what is left, by transfer, today', () => {
    const component = create().componentInstance;

    expect(component.form.getRawValue()).toEqual({ amount: 571, method: 'BANK_TRANSFER', paymentDate: todayIso() });
    expect(component.remainingAfter).toBe(0);
  });

  it('refuses an amount above what is left to pay, zero or with too many decimals', () => {
    const component = create().componentInstance;
    const amount = component.form.controls.amount;

    amount.setValue(571.001);
    expect(amount.hasError('tooHigh')).toBeTrue();
    amount.setValue(0);
    expect(amount.hasError('min')).toBeTrue();
    amount.setValue(10.1234);
    expect(amount.hasError('maxDecimals')).toBeTrue();
  });

  it('refuses a date in the future', () => {
    const component = create().componentInstance;

    component.form.controls.paymentDate.setValue('2999-01-01');

    expect(component.form.controls.paymentDate.hasError('future')).toBeTrue();
  });

  it('shows what will be left after a partial payment', () => {
    const fixture = create();

    fixture.componentInstance.form.controls.amount.setValue(200);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.preview').textContent.replace(/\s/g, ' ')).toContain('371,000 TND');
  });

  it('fills what is left with "Tout régler"', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.form.controls.amount.setValue(10);
    (fixture.nativeElement.querySelector('.pay-all') as HTMLButtonElement).click();

    expect(component.form.controls.amount.value).toBe(571);
  });

  it('records a payment of today without date, so that the API keeps the exact time', () => {
    payments.record.and.returnValue(of(payment));
    const component = create().componentInstance;

    component.form.patchValue({ amount: 200, method: 'CASH' });
    component.submit();

    expect(payments.record).toHaveBeenCalledWith(4, { amount: 200, method: 'CASH', paymentDate: null });
    expect(dialogRef.close).toHaveBeenCalledWith(payment);
  });

  it('sends an earlier date at noon, local time', () => {
    payments.record.and.returnValue(of(payment));
    const component = create().componentInstance;

    component.form.patchValue({ amount: 200, paymentDate: '2026-01-15' });
    component.submit();

    const sent = payments.record.calls.mostRecent().args[1].paymentDate as string;
    expect(new Date(sent).getTime()).toBe(new Date(2026, 0, 15, 12).getTime());
  });

  it('does not call the API while the form is invalid', () => {
    const component = create().componentInstance;

    component.form.controls.amount.setValue(null);
    component.submit();

    expect(payments.record).not.toHaveBeenCalled();
  });

  it('shows the API refusal in French and stays open', () => {
    payments.record.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'Payment exceeds the remaining balance: 1100.000 left on invoice INV-2026-00004' }
    })));
    const fixture = create();

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.form-error').textContent.replace(/\s/g, ' '))
      .toContain('Le paiement dépasse le reste à payer de la facture INV-2026-00004 (1 100,000 TND).');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(fixture.componentInstance.saving).toBeFalse();
  });
});
