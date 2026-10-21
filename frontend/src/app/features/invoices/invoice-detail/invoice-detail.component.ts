import { DOCUMENT, formatNumber } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, LOCALE_ID, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { catchError, filter, of, switchMap, tap } from 'rxjs';

import {
  INVOICE_STATUS_LABELS, INVOICE_STATUS_TONES, Invoice, InvoiceStatus, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONES,
  PaymentStatus, canCancelInvoice, daysOverdue
} from '../../../core/models/invoice.models';
import {
  PAYMENT_METHOD_ICONS, PAYMENT_METHOD_LABELS, Payment, PaymentMethod, paidAmount, remainingAmount
} from '../../../core/models/payment.models';
import { AuthService } from '../../../core/services/auth.service';
import { InvoiceService } from '../../../core/services/invoice.service';
import { PaymentService } from '../../../core/services/payment.service';
import { extractErrorMessage } from '../../../core/utils/http-error.util';
import {
  ConfirmDialogComponent, ConfirmDialogData
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaymentDialogComponent, PaymentDialogData } from '../payment-dialog/payment-dialog.component';

@Component({
  selector: 'app-invoice-detail',
  templateUrl: './invoice-detail.component.html',
  styleUrls: ['./invoice-detail.component.scss']
})
export class InvoiceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly invoices = inject(InvoiceService);
  private readonly paymentService = inject(PaymentService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly document = inject(DOCUMENT);
  private readonly locale = inject(LOCALE_ID);

  /** Only administrators and managers cancel an invoice (the API refuses the others). */
  readonly canManage = this.auth.hasAnyRole(['ADMIN', 'MANAGER']);
  readonly columns = ['product', 'quantity', 'unitPrice', 'subtotal'];

  invoiceId: number | null = null;
  invoice: Invoice | null = null;
  loading = true;
  loadError: string | null = null;
  busy = false;
  actionError: string | null = null;

  payments: Payment[] = [];
  paymentsLoading = true;
  paymentsError: string | null = null;

  get canCancel(): boolean {
    return this.canManage && this.invoice !== null && canCancelInvoice(this.invoice);
  }

  /** The API takes payments on an issued or overdue invoice, from an administrator or a manager. */
  get canPay(): boolean {
    return this.canManage && this.remaining > 0
      && (this.invoice?.status === 'ISSUED' || this.invoice?.status === 'OVERDUE');
  }

  get paid(): number {
    return paidAmount(this.payments);
  }

  get remaining(): number {
    return this.invoice ? remainingAmount(this.invoice.totalAmount, this.payments) : 0;
  }

  /** Share of the invoice already paid, in percent. */
  get paidRate(): number {
    const total = this.invoice?.totalAmount ?? 0;
    return total > 0 ? Math.min((this.paid * 100) / total, 100) : 100;
  }

  get delay(): number {
    return this.invoice?.status === 'OVERDUE' ? daysOverdue(this.invoice.dueDate) : 0;
  }

  /** Effective tax rate of the invoice, from its own amounts. */
  get taxRate(): number | null {
    if (!this.invoice) {
      return null;
    }
    const taxable = this.invoice.subtotal - this.invoice.discount;
    return taxable > 0 ? Math.round((this.invoice.taxAmount * 1000) / taxable) / 10 : null;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.loading = false;
      this.loadError = 'Facture introuvable.';
      return;
    }
    this.invoiceId = id;
    this.load();
    this.loadPayments();
  }

  load(): void {
    if (this.invoiceId === null) {
      return;
    }
    this.loading = true;
    this.loadError = null;
    this.invoices.get(this.invoiceId).subscribe({
      next: invoice => {
        this.invoice = invoice;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.loading = false;
        // The API answers 404 as well when an employee opens the invoice of an order he did not create.
        this.loadError = error instanceof HttpErrorResponse && error.status === 404
          ? 'Facture introuvable.'
          : extractErrorMessage(error, 'Impossible de charger la facture.');
      }
    });
  }

  loadPayments(): void {
    if (this.invoiceId === null) {
      return;
    }
    this.paymentsLoading = true;
    this.paymentsError = null;
    this.paymentService.list(this.invoiceId).pipe(
      catchError((error: unknown) => {
        this.paymentsError = extractErrorMessage(error, 'Impossible de charger les paiements.');
        return of<Payment[]>([]);
      })
    ).subscribe(payments => {
      this.payments = payments;
      this.paymentsLoading = false;
    });
  }

  methodLabel(method: PaymentMethod): string {
    return PAYMENT_METHOD_LABELS[method];
  }

  methodIcon(method: PaymentMethod): string {
    return PAYMENT_METHOD_ICONS[method];
  }

  recordPayment(): void {
    const invoice = this.invoice;
    if (!invoice) {
      return;
    }
    this.dialog
      .open<PaymentDialogComponent, PaymentDialogData, Payment>(PaymentDialogComponent, {
        data: { invoice, remaining: this.remaining }, width: '480px', maxWidth: '95vw'
      })
      .afterClosed()
      .pipe(filter((payment): payment is Payment => !!payment))
      .subscribe(payment => {
        const amount = formatNumber(payment.amount, this.locale, '1.3-3');
        this.snackBar.open(`Paiement de ${amount} TND enregistré.`, 'OK', { duration: 4000 });
        // The status of the invoice changes once it is fully paid: both are read again.
        this.load();
        this.loadPayments();
      });
  }

  statusLabel(status: InvoiceStatus): string {
    return INVOICE_STATUS_LABELS[status];
  }

  statusTone(status: InvoiceStatus): string {
    return `tone-${INVOICE_STATUS_TONES[status]}`;
  }

  paymentLabel(status: PaymentStatus): string {
    return PAYMENT_STATUS_LABELS[status];
  }

  paymentTone(status: PaymentStatus): string {
    return `tone-${PAYMENT_STATUS_TONES[status]}`;
  }

  print(): void {
    this.document.defaultView?.print();
  }

  cancel(): void {
    const invoice = this.invoice;
    if (!invoice) {
      return;
    }
    const data: ConfirmDialogData = {
      title: 'Annuler la facture',
      message: `La facture ${invoice.invoiceNumber} sera annulée et ne pourra plus recevoir de paiement. `
        + `La commande ${invoice.orderNumber} ne pourra pas être facturée à nouveau. Cette action est définitive.`,
      confirmLabel: 'Annuler la facture',
      destructive: true
    };

    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, { data })
      .afterClosed()
      .pipe(
        filter(confirmed => confirmed === true),
        tap(() => {
          this.busy = true;
          this.actionError = null;
        }),
        switchMap(() => this.invoices.cancel(invoice.id))
      )
      .subscribe({
        next: updated => {
          this.busy = false;
          this.invoice = updated;
          this.snackBar.open(`Facture ${updated.invoiceNumber} annulée.`, 'OK', { duration: 4000 });
        },
        error: (error: unknown) => {
          this.busy = false;
          this.actionError = extractErrorMessage(error, 'Annulation impossible.');
        }
      });
  }
}
