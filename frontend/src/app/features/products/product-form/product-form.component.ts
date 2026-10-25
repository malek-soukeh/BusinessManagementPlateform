import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';

import { CategoryNode, buildCategoryTree } from '../../../core/models/category.models';
import { Product, ProductStatus } from '../../../core/models/product.models';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { apiMessage, extractErrorMessage, apiErrorCode } from '../../../core/utils/http-error.util';
import { integer, maxDecimals } from '../../../shared/validators';

/** Same bounds as the API: up to 11 digits before the decimal point and 3 after. */
const PRICE_VALIDATORS = [Validators.required, Validators.min(0.001), Validators.max(99999999999.999), maxDecimals(3)];
const STOCK_VALIDATORS = [Validators.required, Validators.min(0), Validators.max(2147483647), integer];

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly products = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly snackBar = inject(MatSnackBar);

  productId: number | null = null;
  /** The product as read: its version is sent back on update, its stock is shown read-only. */
  product: Product | null = null;
  categories: CategoryNode[] = [];
  loading = true;
  saving = false;
  loadError: string | null = null;
  errorMessage: string | null = null;
  /** Someone else saved the product in the meantime: it must be reloaded before saving again. */
  stale = false;

  readonly form = this.fb.group({
    reference: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    description: this.fb.nonNullable.control('', [Validators.maxLength(2000)]),
    categoryId: this.fb.control<number | null>(null, [Validators.required]),
    purchasePrice: this.fb.control<number | null>(null, PRICE_VALIDATORS),
    sellingPrice: this.fb.control<number | null>(null, PRICE_VALIDATORS),
    quantity: this.fb.control<number | null>(0, STOCK_VALIDATORS),
    minimumStock: this.fb.control<number | null>(0, STOCK_VALIDATORS),
    status: this.fb.nonNullable.control<ProductStatus>('ACTIVE')
  });

  get isEdit(): boolean {
    return this.productId !== null;
  }

  /** Margin per unit, shown as a hint; null until both prices are valid. */
  get margin(): { amount: number; rate: number } | null {
    const { purchasePrice, sellingPrice } = this.form.getRawValue();
    if (!purchasePrice || !sellingPrice || purchasePrice <= 0) {
      return null;
    }
    const amount = sellingPrice - purchasePrice;
    return { amount, rate: (amount * 100) / purchasePrice };
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id !== null) {
      const parsed = Number(id);
      if (!Number.isInteger(parsed)) {
        this.loading = false;
        this.loadError = 'Produit introuvable.';
        return;
      }
      this.productId = parsed;
      // The quantity is only given at creation: afterwards it changes through stock movements.
      this.form.controls.quantity.disable();
    }
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = null;
    this.errorMessage = null;
    this.stale = false;
    const product$ = this.productId === null ? of(null) : this.products.get(this.productId);

    forkJoin({ categories: this.categoryService.list(), product: product$ }).subscribe({
      next: ({ categories, product }) => {
        this.categories = buildCategoryTree(categories);
        this.product = product;
        if (product) {
          this.form.patchValue({
            reference: product.reference,
            name: product.name,
            description: product.description ?? '',
            categoryId: product.categoryId,
            purchasePrice: product.purchasePrice ?? null,
            sellingPrice: product.sellingPrice,
            quantity: product.quantity,
            minimumStock: product.minimumStock,
            status: product.status
          });
        }
        this.loading = false;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.loadError = error instanceof HttpErrorResponse && error.status === 404
          ? 'Produit introuvable.'
          : extractErrorMessage(error, 'Impossible de charger le produit.');
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = null;
    const value = this.form.getRawValue();
    const description = value.description.trim();
    const common = {
      reference: value.reference.trim().toUpperCase(),
      name: value.name.trim(),
      description: description === '' ? null : description,
      purchasePrice: Number(value.purchasePrice),
      sellingPrice: Number(value.sellingPrice),
      minimumStock: Number(value.minimumStock),
      categoryId: Number(value.categoryId)
    };

    const request$ = this.product === null
      ? this.products.create({ ...common, quantity: Number(value.quantity) })
      : this.products.update(this.product.id, { ...common, status: value.status, version: this.product.version });

    request$.subscribe({
      next: () => {
        this.snackBar.open(this.isEdit ? 'Produit mis à jour.' : 'Produit créé.', 'OK', { duration: 4000 });
        this.router.navigate(['/products']);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.showError(error);
      }
    });
  }

  /** A duplicate reference or a vanished category is shown under its field, any other error above the buttons. */
  private showError(error: unknown): void {
    const code = apiErrorCode(error);
    if (code === 'REFERENCE_ALREADY_USED') {
      this.form.controls.reference.setErrors({ taken: true });
      this.form.controls.reference.markAsTouched();
      return;
    }
    if (apiMessage(error).startsWith('Category not found')) {
      this.form.controls.categoryId.setErrors({ missing: true });
      this.form.controls.categoryId.markAsTouched();
      return;
    }
    this.stale = code === 'CONCURRENT_MODIFICATION';
    this.errorMessage = extractErrorMessage(error, 'Enregistrement impossible. Réessayez plus tard.');
  }
}
