import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import {
  BehaviorSubject, Subscription, catchError, debounceTime, filter, map, of, switchMap, tap
} from 'rxjs';

import { Page } from '../../../core/models/page.models';
import { Product, ProductQuery, StockLevel, stockLevel } from '../../../core/models/product.models';
import { StockMovement } from '../../../core/models/stock.models';
import { AuthService } from '../../../core/services/auth.service';
import { ProductService } from '../../../core/services/product.service';
import { extractErrorMessage } from '../../../core/utils/http-error.util';
import {
  StockAdjustDialogComponent, StockAdjustDialogData
} from '../stock-adjust-dialog/stock-adjust-dialog.component';

type LoadResult = { page: Page<Product> } | { error: string };

/** Stock of the active products, with their value at purchase price. */
@Component({
  selector: 'app-inventory-list',
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.scss']
})
export class InventoryListComponent implements OnInit, OnDestroy {
  private readonly products = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly subscriptions = new Subscription();
  private readonly query$ = new BehaviorSubject<ProductQuery>({
    q: '',
    categoryId: null,
    status: 'ACTIVE',
    lowStock: this.route.snapshot.queryParamMap.get('lowStock') === 'true',
    page: 0,
    size: 10
  });

  /** Only administrators and managers adjust the stock (the API refuses the others). */
  readonly canAdjust = this.auth.hasAnyRole(['ADMIN', 'MANAGER']);
  /** The stock value is computed from the purchase price, which the API only gives to ADMIN and MANAGER. */
  readonly columns = this.canAdjust
    ? ['product', 'stock', 'minimum', 'value', 'actions']
    : ['product', 'stock', 'minimum', 'actions'];
  readonly search = new FormControl('', { nonNullable: true });
  readonly skeletonRows = [0, 1, 2, 3, 4];

  rows: Product[] = [];
  total = 0;
  loading = true;
  errorMessage: string | null = null;

  get query(): ProductQuery {
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
            this.products.list(query).pipe(
              map((page): LoadResult => ({ page })),
              catchError((error: unknown) =>
                of<LoadResult>({ error: extractErrorMessage(error, 'Impossible de charger le stock.') }))
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
    return this.search.value.trim() !== '' || this.query.lowStock;
  }

  resetFilters(): void {
    // Without event: the debounced search would send a second request.
    this.search.setValue('', { emitEvent: false });
    this.patchQuery({ q: '', lowStock: false, page: 0 });
  }

  onLowStockChange(lowStock: boolean): void {
    this.patchQuery({ lowStock, page: 0 });
  }

  onPage(event: PageEvent): void {
    this.patchQuery({ page: event.pageIndex, size: event.pageSize });
  }

  reload(): void {
    this.patchQuery({});
  }

  /** Value of the stock at purchase price, or null when the cost is not given. */
  stockValue(product: Product): number | null {
    return product.purchasePrice === undefined ? null : product.quantity * product.purchasePrice;
  }

  level(product: Product): StockLevel {
    return stockLevel(product);
  }

  chipClass(product: Product): string {
    const level = stockLevel(product);
    return level === 'out' ? 'tone-danger' : level === 'low' ? 'tone-warning' : 'tone-success';
  }

  adjust(product: Product): void {
    this.dialog
      .open<StockAdjustDialogComponent, StockAdjustDialogData, StockMovement>(
        StockAdjustDialogComponent, { data: { product }, width: '480px', maxWidth: '95vw' })
      .afterClosed()
      .pipe(filter((movement): movement is StockMovement => !!movement))
      .subscribe(movement => {
        this.snackBar.open(`Stock de ${product.name} : ${movement.quantityAfter}.`, 'OK', { duration: 4000 });
        this.reload();
      });
  }

  private patchQuery(partial: Partial<ProductQuery>): void {
    this.query$.next({ ...this.query$.value, ...partial });
  }
}
