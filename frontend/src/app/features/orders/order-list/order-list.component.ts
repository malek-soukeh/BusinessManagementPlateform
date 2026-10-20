import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject, Subscription, catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap
} from 'rxjs';

import {
  ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_STATUS_TONES, OrderQuery, OrderStatus, OrderSummary
} from '../../../core/models/order.models';
import { Page } from '../../../core/models/page.models';
import { AuthService } from '../../../core/services/auth.service';
import { OrderService } from '../../../core/services/order.service';
import { extractErrorMessage } from '../../../core/utils/http-error.util';

type LoadResult = { page: Page<OrderSummary> } | { error: string };

@Component({
  selector: 'app-order-list',
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.scss']
})
export class OrderListComponent implements OnInit, OnDestroy {
  private readonly orders = inject(OrderService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly subscriptions = new Subscription();
  private readonly query$ = new BehaviorSubject<OrderQuery>({
    q: '',
    status: this.initialStatus(),
    // A customer page can open the list with ?customerId=<id>.
    customerId: this.initialCustomer(),
    page: 0,
    size: 10
  });

  /** The API only gives an employee his own orders: the author column says nothing to him. */
  readonly isEmployee = !this.auth.hasAnyRole(['ADMIN', 'MANAGER']);
  readonly columns = this.isEmployee
    ? ['number', 'customer', 'date', 'amount', 'status']
    : ['number', 'customer', 'date', 'amount', 'status', 'author'];
  readonly statuses = ORDER_STATUSES;
  readonly search = new FormControl('', { nonNullable: true });
  readonly skeletonRows = [0, 1, 2, 3, 4];

  rows: OrderSummary[] = [];
  total = 0;
  loading = true;
  errorMessage: string | null = null;

  get query(): OrderQuery {
    return this.query$.value;
  }

  /** Name of the customer the list is filtered on, read from the loaded orders. */
  get customerFilterName(): string | null {
    const id = this.query.customerId;
    return id === null ? null : this.rows.find(row => row.customerId === id)?.customerName ?? `#${id}`;
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.search.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged())
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
            this.orders.list(query).pipe(
              map((page): LoadResult => ({ page })),
              catchError((error: unknown) =>
                of<LoadResult>({ error: extractErrorMessage(error, 'Impossible de charger les commandes.') }))
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

  onStatusChange(status: OrderStatus | ''): void {
    this.patchQuery({ status, page: 0 });
  }

  clearCustomer(): void {
    this.patchQuery({ customerId: null, page: 0 });
    this.router.navigate([], { relativeTo: this.route, queryParams: { customerId: null }, queryParamsHandling: 'merge' });
  }

  onPage(event: PageEvent): void {
    this.patchQuery({ page: event.pageIndex, size: event.pageSize });
  }

  reload(): void {
    this.patchQuery({});
  }

  statusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status];
  }

  statusTone(status: OrderStatus): string {
    return `tone-${ORDER_STATUS_TONES[status]}`;
  }

  private initialStatus(): OrderStatus | '' {
    const status = this.route.snapshot.queryParamMap.get('status') as OrderStatus | null;
    return status && ORDER_STATUSES.includes(status) ? status : '';
  }

  private initialCustomer(): number | null {
    const id = Number(this.route.snapshot.queryParamMap.get('customerId'));
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  private patchQuery(partial: Partial<OrderQuery>): void {
    this.query$.next({ ...this.query$.value, ...partial });
  }
}
