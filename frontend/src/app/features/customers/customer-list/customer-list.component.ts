import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject, Subscription, catchError, debounceTime,
  filter, map, of, switchMap, tap
} from 'rxjs';

import { Customer, CustomerQuery, CustomerStatus, customerToPayload } from '../../../core/models/customer.models';
import { Page } from '../../../core/models/page.models';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerService } from '../../../core/services/customer.service';
import { extractErrorMessage } from '../../../core/utils/http-error.util';
import {
  ConfirmDialogComponent, ConfirmDialogData
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

type LoadResult = { page: Page<Customer> } | { error: string };

@Component({
  selector: 'app-customer-list',
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss']
})
export class CustomerListComponent implements OnInit, OnDestroy {
  private readonly customerService = inject(CustomerService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly subscriptions = new Subscription();
  private readonly query$ = new BehaviorSubject<CustomerQuery>({
    q: '', status: 'ACTIVE', page: 0, size: 10
  });

  readonly columns = ['name', 'email', 'phone', 'status', 'actions'];
  readonly search = new FormControl('', { nonNullable: true });
  /** Only administrators and managers may deactivate or reactivate a customer. */
  readonly canManage = this.auth.hasAnyRole(['ADMIN', 'MANAGER']);

  customers: Customer[] = [];
  total = 0;
  loading = true;
  errorMessage: string | null = null;

  get status(): CustomerStatus | '' {
    return this.query$.value.status;
  }

  get pageIndex(): number {
    return this.query$.value.page;
  }

  get pageSize(): number {
    return this.query$.value.size;
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
            this.customerService.list(query).pipe(
              map((page): LoadResult => ({ page })),
              catchError((error: unknown) =>
                of<LoadResult>({ error: extractErrorMessage(error, 'Impossible de charger les clients.') }))
            )
          )
        )
        .subscribe(result => {
          this.loading = false;
          if ('page' in result) {
            this.customers = result.page.content;
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

  /** A search or a status other than the default one (active customers) is in use. */
  get hasFilters(): boolean {
    return this.search.value.trim() !== '' || this.status !== 'ACTIVE';
  }

  statusLabel(status: CustomerStatus | ''): string {
    return status === 'ACTIVE' ? 'Actifs' : status === 'INACTIVE' ? 'Inactifs' : 'Tous';
  }

  resetFilters(): void {
    // Without event: the debounced search would send a second request.
    this.search.setValue('', { emitEvent: false });
    this.patchQuery({ q: '', status: 'ACTIVE', page: 0 });
  }

  onStatusChange(status: CustomerStatus | ''): void {
    this.patchQuery({ status, page: 0 });
  }

  onPage(event: PageEvent): void {
    this.patchQuery({ page: event.pageIndex, size: event.pageSize });
  }

  reload(): void {
    this.patchQuery({});
  }

  deactivate(customer: Customer): void {
    const data: ConfirmDialogData = {
      title: 'Désactiver le client',
      message: `${customer.firstName} ${customer.lastName} ne pourra plus être choisi pour de nouvelles `
        + 'commandes. Son historique est conservé.',
      confirmLabel: 'Désactiver',
      destructive: true
    };

    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, { data })
      .afterClosed()
      .pipe(
        filter(confirmed => confirmed === true),
        switchMap(() => this.customerService.deactivate(customer.id))
      )
      .subscribe({
        next: () => {
          this.notify('Client désactivé.');
          this.reload();
        },
        error: (error: unknown) => this.notify(extractErrorMessage(error, 'Désactivation impossible.'))
      });
  }

  reactivate(customer: Customer): void {
    this.customerService
      .update(customer.id, { ...customerToPayload(customer), status: 'ACTIVE' })
      .subscribe({
        next: () => {
          this.notify('Client réactivé.');
          this.reload();
        },
        error: (error: unknown) => this.notify(extractErrorMessage(error, 'Réactivation impossible.'))
      });
  }

  private patchQuery(partial: Partial<CustomerQuery>): void {
    this.query$.next({ ...this.query$.value, ...partial });
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 4000 });
  }
}