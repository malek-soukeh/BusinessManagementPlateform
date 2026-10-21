import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute } from '@angular/router';
import {
  BehaviorSubject, Subscription, catchError, debounceTime, filter, map, of, switchMap, tap
} from 'rxjs';

import {
  INVOICE_STATUSES, INVOICE_STATUS_LABELS, INVOICE_STATUS_TONES, InvoiceQuery, InvoiceStatus, InvoiceSummary,
  PAYMENT_STATUSES, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONES, PaymentStatus, daysOverdue
} from '../../../core/models/invoice.models';
import { Page } from '../../../core/models/page.models';
import { AuthService } from '../../../core/services/auth.service';
import { InvoiceService } from '../../../core/services/invoice.service';
import { extractErrorMessage } from '../../../core/utils/http-error.util';

type LoadResult = { page: Page<InvoiceSummary> } | { error: string };

@Component({
  selector: 'app-invoice-list',
  templateUrl: './invoice-list.component.html',
  styleUrls: ['./invoice-list.component.scss']
})
export class InvoiceListComponent implements OnInit, OnDestroy {
  private readonly invoices = inject(InvoiceService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly subscriptions = new Subscription();
  private readonly query$ = new BehaviorSubject<InvoiceQuery>({
    q: '',
    // The dashboard opens this page with ?status=OVERDUE.
    status: this.param('status', INVOICE_STATUSES),
    paymentStatus: this.param('paymentStatus', PAYMENT_STATUSES),
    page: 0,
    size: 10
  });

  /** Only administrators and managers create invoices (the API refuses the others). */
  readonly canCreate = this.auth.hasAnyRole(['ADMIN', 'MANAGER']);
  readonly columns = ['number', 'customer', 'order', 'dueDate', 'amount', 'status', 'payment'];
  readonly statuses = INVOICE_STATUSES;
  readonly paymentStatuses = PAYMENT_STATUSES;
  readonly search = new FormControl('', { nonNullable: true });
  readonly skeletonRows = [0, 1, 2, 3, 4];

  rows: InvoiceSummary[] = [];
  total = 0;
  loading = true;
  errorMessage: string | null = null;

  get query(): InvoiceQuery {
    return this.query$.value;
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.search.valueChanges
        .pipe(
          debounceTime(300),
          map(q => q.trim()),
          // Compared with the current query, not with the previous keystroke: a reset changes the query.
          filter(q => q !== this.query$.value.q)
        )
        .subscribe(q => this.patchQuery({ q, page: 0 }))
    );

    this.subscriptions.add(
      this.query$
        .pipe(
          tap(() => {
            this.loading = true;
            this.errorMessage = null;
          }),
          switchMap(query =>
            this.invoices.list(query).pipe(
              map((page): LoadResult => ({ page })),
              catchError((error: unknown) =>
                of<LoadResult>({ error: extractErrorMessage(error, 'Impossible de charger les factures.') }))
            )
          )
        )
        .subscribe(result => {
          this.loading = false;
          if ('page' in result) {
            this.rows = result.page.content;
            this.total = result.page.totalElements;
          } else {
            this.errorMessage = result.error;
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get hasFilters(): boolean {
    return this.search.value.trim() !== '' || this.query.status !== '' || this.query.paymentStatus !== '';
  }

  resetFilters(): void {
    // Without event: the debounced search would send a second request.
    this.search.setValue('', { emitEvent: false });
    this.patchQuery({ q: '', status: '', paymentStatus: '', page: 0 });
  }

  statusFilterLabel(status: InvoiceStatus | ''): string {
    return status === '' ? 'Tous' : INVOICE_STATUS_LABELS[status];
  }

  paymentFilterLabel(status: PaymentStatus | ''): string {
    return status === '' ? 'Tous' : PAYMENT_STATUS_LABELS[status];
  }

  onStatusChange(status: InvoiceStatus | ''): void {
    this.patchQuery({ status, page: 0 });
  }

  onPaymentStatusChange(paymentStatus: PaymentStatus | ''): void {
    this.patchQuery({ paymentStatus, page: 0 });
  }

  onPage(event: PageEvent): void {
    this.patchQuery({ page: event.pageIndex, size: event.pageSize });
  }

  reload(): void {
    this.patchQuery({});
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

  /** Days of delay of an overdue invoice, shown under its due date. */
  delay(invoice: InvoiceSummary): number {
    return invoice.status === 'OVERDUE' ? daysOverdue(invoice.dueDate) : 0;
  }

  private param<T extends string>(name: string, allowed: T[]): T | '' {
    const value = this.route.snapshot.queryParamMap.get(name) as T | null;
    return value && allowed.includes(value) ? value : '';
  }

  private patchQuery(partial: Partial<InvoiceQuery>): void {
    this.query$.next({ ...this.query$.value, ...partial });
  }
}
