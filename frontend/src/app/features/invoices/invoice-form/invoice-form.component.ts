import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Subscription, catchError, debounceTime, distinctUntilChanged, filter, map, of, switchMap
} from 'rxjs';

import {
  DEFAULT_TAX_RATE, INVOICEABLE_ORDER_STATUSES, InvoiceSummary, todayIso
} from '../../../core/models/invoice.models';
import { ORDER_STATUS_LABELS, OrderStatus, OrderSummary } from '../../../core/models/order.models';
import { InvoiceService } from '../../../core/services/invoice.service';
import { OrderService } from '../../../core/services/order.service';
import { apiMessage, extractErrorMessage } from '../../../core/utils/http-error.util';
import { maxDecimals } from '../../../shared/validators';

type OrderValue = OrderSummary | string | null;

function isPicked(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === '') {
    return null;
  }
  return typeof value === 'object' && 'id' in value ? null : { notPicked: true };
}

/** The API refuses a due date before the issue date, which is today. */
function notPast(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  return value && value < todayIso() ? { past: true } : null;
}

/** Invoice of an order (ADMIN and MANAGER): the API computes the tax and the total. */
@Component({
  selector: 'app-invoice-form',
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.scss']
})
export class InvoiceFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invoices = inject(InvoiceService);
  private readonly orders = inject(OrderService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly subscriptions = new Subscription();

  readonly taxRate = DEFAULT_TAX_RATE;
  readonly today = todayIso();

  orderOptions: OrderSummary[] = [];
  /** The invoice the chosen order already has: the API allows a single invoice per order. */
  existingInvoice: InvoiceSummary | null = null;
  checkingOrder = false;
  loadingOrder = false;
  saving = false;
  errorMessage: string | null = null;

  readonly form = this.fb.group({
    order: this.fb.control<OrderValue>(null, [Validators.required, isPicked]),
    discount: this.fb.control<number | null>(null, [Validators.min(0), maxDecimals(3)]),
    dueDate: this.fb.nonNullable.control('', [notPast])
  }, { validators: group => this.checkDiscount(group) });

  get order(): OrderSummary | null {
    const value = this.form.controls.order.value;
    return value !== null && typeof value === 'object' ? value : null;
  }

  /** Estimate shown before creation, with the default tax rate; the invoice gives the real amounts. */
  get preview(): { subtotal: number; discount: number; taxable: number; tax: number; total: number } | null {
    const order = this.order;
    if (!order) {
      return null;
    }
    const discount = Math.max(Number(this.form.controls.discount.value) || 0, 0);
    const taxable = Math.max(order.totalAmount - discount, 0);
    const tax = Math.round(taxable * this.taxRate * 10) / 1000;
    return { subtotal: order.totalAmount, discount, taxable, tax, total: taxable + tax };
  }

  get canSubmit(): boolean {
    return !this.saving && !this.checkingOrder && this.existingInvoice === null && this.isInvoiceable(this.order);
  }

  ngOnInit(): void {
    this.watchOrderSearch();
    this.watchChosenOrder();

    const orderId = Number(this.route.snapshot.queryParamMap.get('orderId'));
    if (Number.isInteger(orderId) && orderId > 0) {
      this.loadingOrder = true;
      this.orders.get(orderId).subscribe({
        next: order => {
          this.loadingOrder = false;
          this.form.controls.order.setValue(order);
        },
        error: (error: unknown) => {
          this.loadingOrder = false;
          this.errorMessage = error instanceof HttpErrorResponse && error.status === 404
            ? 'Commande introuvable : choisissez-en une autre.'
            : extractErrorMessage(error, 'Impossible de charger la commande.');
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  displayOrder(value: OrderValue): string {
    return value !== null && typeof value === 'object' ? `${value.orderNumber} · ${value.customerName}` : value ?? '';
  }

  statusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status];
  }

  isInvoiceable(order: OrderSummary | null): boolean {
    return order !== null && INVOICEABLE_ORDER_STATUSES.includes(order.status);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const order = this.order;
    if (!order || !this.canSubmit) {
      return;
    }

    const value = this.form.getRawValue();
    this.saving = true;
    this.errorMessage = null;
    this.invoices.create({
      orderId: order.id,
      discount: value.discount === null ? null : Number(value.discount),
      dueDate: value.dueDate || null
    }).subscribe({
      next: invoice => {
        this.snackBar.open(`Facture ${invoice.invoiceNumber} créée.`, 'OK', { duration: 4000 });
        this.router.navigate(['/invoices', invoice.id]);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.showError(error);
      }
    });
  }

  private watchOrderSearch(): void {
    this.subscriptions.add(
      this.form.controls.order.valueChanges.pipe(
        filter((value): value is string => typeof value === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => this.orders.list({ q: term, status: '', customerId: null, page: 0, size: 8 }).pipe(
          map(page => page.content),
          catchError(() => of<OrderSummary[]>([]))
        ))
      ).subscribe(options => (this.orderOptions = options))
    );
  }

  /** When an order is chosen, checks whether it already has an invoice. */
  private watchChosenOrder(): void {
    this.subscriptions.add(
      this.form.controls.order.valueChanges.pipe(
        map(() => this.order),
        distinctUntilChanged((a, b) => a?.id === b?.id),
        switchMap(order => {
          this.existingInvoice = null;
          if (!order) {
            return of(null);
          }
          this.checkingOrder = true;
          return this.invoices.findByOrder(order.id, order.orderNumber).pipe(catchError(() => of(null)));
        })
      ).subscribe(invoice => {
        this.checkingOrder = false;
        this.existingInvoice = invoice;
      })
    );
  }

  private checkDiscount(group: AbstractControl): ValidationErrors | null {
    // Reads the group itself: this validator also runs while the form is being built.
    const discount = Number(group.get('discount')?.value) || 0;
    const order = group.get('order')?.value as OrderValue;
    return order !== null && typeof order === 'object' && discount > order.totalAmount ? { discountTooHigh: true } : null;
  }

  private showError(error: unknown): void {
    const message = apiMessage(error);
    if (message.startsWith('Discount cannot exceed')) {
      this.form.controls.discount.setErrors({ tooHigh: true });
      this.form.controls.discount.markAsTouched();
      return;
    }
    if (message.startsWith('Due date cannot be before')) {
      this.form.controls.dueDate.setErrors({ past: true });
      this.form.controls.dueDate.markAsTouched();
      return;
    }
    if (message.startsWith('Cannot invoice an order with status')) {
      this.form.controls.order.setErrors({ notInvoiceable: true });
      this.form.controls.order.markAsTouched();
      return;
    }
    this.errorMessage = extractErrorMessage(error, 'Création impossible. Réessayez plus tard.');
  }
}
