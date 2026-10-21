import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Invoice, todayIso } from '../../../core/models/invoice.models';
import {
  PAYMENT_METHODS, PAYMENT_METHOD_ICONS, PAYMENT_METHOD_LABELS, Payment, PaymentMethod, toMillimes
} from '../../../core/models/payment.models';
import { PaymentService } from '../../../core/services/payment.service';
import { extractErrorMessage } from '../../../core/utils/http-error.util';
import { maxDecimals } from '../../../shared/validators';

export interface PaymentDialogData {
  invoice: Pick<Invoice, 'id' | 'invoiceNumber' | 'totalAmount'>;
  /** What is left to pay, in TND. */
  remaining: number;
}

/** The API refuses a payment date in the future. */
function notFuture(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  return value && value > todayIso() ? { future: true } : null;
}

/**
 * Records a payment on an invoice (ADMIN and MANAGER). Closes with the payment, or nothing when cancelled.
 * The amount is checked against what is left to pay here already; the API checks it again.
 */
@Component({
  selector: 'app-payment-dialog',
  templateUrl: './payment-dialog.component.html',
  styleUrls: ['./payment-dialog.component.scss']
})
export class PaymentDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly payments = inject(PaymentService);
  private readonly dialogRef = inject<MatDialogRef<PaymentDialogComponent, Payment>>(MatDialogRef);
  readonly data = inject<PaymentDialogData>(MAT_DIALOG_DATA);

  readonly methods = PAYMENT_METHODS;
  readonly today = todayIso();
  saving = false;
  errorMessage: string | null = null;

  readonly form = this.fb.group({
    amount: this.fb.control<number | null>(this.data.remaining, [
      Validators.required, Validators.min(0.001), maxDecimals(3), control => this.checkRemaining(control)
    ]),
    method: this.fb.nonNullable.control<PaymentMethod>('BANK_TRANSFER'),
    paymentDate: this.fb.nonNullable.control(todayIso(), [Validators.required, notFuture])
  });

  /** What will be left to pay after this payment, never negative. */
  get remainingAfter(): number {
    const amount = toMillimes(Number(this.form.controls.amount.value) || 0);
    return Math.max(toMillimes(this.data.remaining) - amount, 0) / 1000;
  }

  methodLabel(method: PaymentMethod): string {
    return PAYMENT_METHOD_LABELS[method];
  }

  methodIcon(method: PaymentMethod): string {
    return PAYMENT_METHOD_ICONS[method];
  }

  payAll(): void {
    this.form.controls.amount.setValue(this.data.remaining);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving = true;
    this.errorMessage = null;
    this.payments.record(this.data.invoice.id, {
      amount: Number(value.amount),
      method: value.method,
      paymentDate: this.toInstant(value.paymentDate)
    }).subscribe({
      next: payment => this.dialogRef.close(payment),
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = extractErrorMessage(error, 'Paiement impossible. Réessayez plus tard.');
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private checkRemaining(control: AbstractControl): ValidationErrors | null {
    const amount = Number(control.value) || 0;
    return toMillimes(amount) > toMillimes(this.data.remaining) ? { tooHigh: true } : null;
  }

  /**
   * Today is sent as null so that the API records the exact time. Another day is sent at noon local
   * time, which stays on that same day whatever the time zone of the server.
   */
  private toInstant(date: string): string | null {
    if (date === todayIso()) {
      return null;
    }
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day, 12).toISOString();
  }
}
