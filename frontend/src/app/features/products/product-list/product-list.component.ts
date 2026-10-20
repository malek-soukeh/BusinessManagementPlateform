import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import {
  BehaviorSubject, Subscription, catchError, debounceTime, distinctUntilChanged,
  filter, map, of, switchMap, tap
} from 'rxjs';

import { CategoryNode, buildCategoryTree } from '../../../core/models/category.models';
import { Page } from '../../../core/models/page.models';
import {
  PRODUCT_STATUS_LABELS, Product, ProductQuery, ProductStatus, StockLevel, productToUpdatePayload, stockLevel
} from '../../../core/models/product.models';
import { AuthService } from '../../../core/services/auth.service';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { extractErrorMessage } from '../../../core/utils/http-error.util';
import {
  ConfirmDialogComponent, ConfirmDialogData
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

type LoadResult = { page: Page<Product> } | { error: string };

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit, OnDestroy {
  private readonly products = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly subscriptions = new Subscription();
  private readonly query$ = new BehaviorSubject<ProductQuery>({
    q: '',
    categoryId: null,
    status: 'ACTIVE',
    // The dashboard opens this page with ?lowStock=true.
    lowStock: this.route.snapshot.queryParamMap.get('lowStock') === 'true',
    page: 0,
    size: 10
  });

  /** Only administrators and managers create, edit and deactivate products (the API refuses the others). */
  readonly canManage = this.auth.hasAnyRole(['ADMIN', 'MANAGER']);
  readonly columns = this.canManage
    ? ['product', 'category', 'price', 'stock', 'status', 'actions']
    : ['product', 'category', 'price', 'stock', 'status'];
  readonly search = new FormControl('', { nonNullable: true });
  readonly stockLevel = stockLevel;
  readonly skeletonRows = [0, 1, 2, 3, 4];

  /** The category filter needs GET /api/categories, which the API keeps for ADMIN and MANAGER. */
  categories: CategoryNode[] = [];
  productsOnPage: Product[] = [];
  total = 0;
  loading = true;
  errorMessage: string | null = null;

  get query(): ProductQuery {
    return this.query$.value;
  }

  ngOnInit(): void {
    if (this.canManage) {
      this.categoryService.list().subscribe({
        next: categories => (this.categories = buildCategoryTree(categories)),
        error: () => (this.categories = [])
      });
    }

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
            this.products.list(query).pipe(
              map((page): LoadResult => ({ page })),
              catchError((error: unknown) =>
                of<LoadResult>({ error: extractErrorMessage(error, 'Impossible de charger les produits.') }))
            )
          )
        )
        .subscribe(result => {
          this.loading = false;
          if ('page' in result) {
            this.productsOnPage = result.page.content;
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

  onCategoryChange(categoryId: number | null): void {
    this.patchQuery({ categoryId, page: 0 });
  }

  onStatusChange(status: ProductStatus | ''): void {
    this.patchQuery({ status, page: 0 });
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

  statusLabel(status: ProductStatus): string {
    return PRODUCT_STATUS_LABELS[status];
  }

  stockChipClass(level: StockLevel): string {
    return level === 'out' ? 'tone-danger' : level === 'low' ? 'tone-warning' : 'tone-success';
  }

  deactivate(product: Product): void {
    const data: ConfirmDialogData = {
      title: 'Désactiver le produit',
      message: `« ${product.name} » (${product.reference}) ne pourra plus être ajouté à une commande. `
        + 'Son stock et son historique sont conservés.',
      confirmLabel: 'Désactiver',
      destructive: true
    };

    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, { data })
      .afterClosed()
      .pipe(
        filter(confirmed => confirmed === true),
        switchMap(() => this.products.deactivate(product.id))
      )
      .subscribe({
        next: () => {
          this.notify('Produit désactivé.');
          this.reload();
        },
        error: (error: unknown) => this.notify(extractErrorMessage(error, 'Désactivation impossible.'))
      });
  }

  reactivate(product: Product): void {
    this.products.update(product.id, { ...productToUpdatePayload(product), status: 'ACTIVE' }).subscribe({
      next: () => {
        this.notify('Produit réactivé.');
        this.reload();
      },
      error: (error: unknown) => this.notify(extractErrorMessage(error, 'Réactivation impossible.'))
    });
  }

  private patchQuery(partial: Partial<ProductQuery>): void {
    this.query$.next({ ...this.query$.value, ...partial });
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 4000 });
  }
}
