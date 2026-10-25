import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, Validators
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Observable, Subject, Subscription, catchError, debounceTime, distinctUntilChanged, filter, forkJoin, map, of,
  switchMap
} from 'rxjs';

import { Customer } from '../../../core/models/customer.models';
import { MAX_ORDER_QUANTITY, Order, OrderPayload } from '../../../core/models/order.models';
import { Product } from '../../../core/models/product.models';
import { CustomerService } from '../../../core/services/customer.service';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { apiMessage, extractErrorMessage, apiErrorCode } from '../../../core/utils/http-error.util';
import { translateApiError } from '../../../core/utils/api-messages';
import { integer } from '../../../shared/validators';

/** A customer as chosen in the autocomplete (an order only knows its id and name). */
export interface CustomerOption {
  id: number;
  name: string;
  detail: string | null;
}

/** While typing, the autocomplete holds the text; once an option is picked, the object. */
type CustomerValue = CustomerOption | string | null;
type ProductValue = Product | string | null;

type LineForm = FormGroup<{
  product: FormControl<ProductValue>;
  quantity: FormControl<number | null>;
}>;

function isPicked(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === '') {
    return null;
  }
  return typeof value === 'object' && 'id' in value ? null : { notPicked: true };
}

function asProduct(value: ProductValue): Product | null {
  return value !== null && typeof value === 'object' ? value : null;
}

/** The quantity cannot exceed the stock of the product (checked again by the API). */
function enoughStock(group: AbstractControl): ValidationErrors | null {
  const product = asProduct(group.get('product')?.value ?? null);
  const quantity = Number(group.get('quantity')?.value) || 0;
  return product && quantity > product.quantity ? { insufficient: { available: product.quantity } } : null;
}

/** The API refuses an order where a product appears twice. */
function uniqueProducts(array: AbstractControl): ValidationErrors | null {
  const ids = (array as FormArray<LineForm>).controls
    .map(line => asProduct(line.controls.product.value)?.id)
    .filter((id): id is number => id !== undefined);
  return new Set(ids).size === ids.length ? null : { duplicate: true };
}

@Component({
  selector: 'app-order-form',
  templateUrl: './order-form.component.html',
  styleUrls: ['./order-form.component.scss']
})
export class OrderFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orders = inject(OrderService);
  private readonly customers = inject(CustomerService);
  private readonly products = inject(ProductService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly subscriptions = new Subscription();
  private readonly productSearch$ = new Subject<{ line: number; term: string }>();

  readonly maxQuantity = MAX_ORDER_QUANTITY;

  orderId: number | null = null;
  order: Order | null = null;
  loading = false;
  saving = false;
  loadError: string | null = null;
  errorMessage: string | null = null;
  customerOptions: CustomerOption[] = [];
  /** Product suggestions of each line, by line index. */
  productOptions: Product[][] = [];
  /** Error returned by the API for a given line, by line index. */
  lineErrors: Record<number, string> = {};

  readonly form = this.fb.group({
    customer: this.fb.control<CustomerValue>(null, [Validators.required, isPicked]),
    items: this.fb.array<LineForm>([], [Validators.required, uniqueProducts])
  });

  get isEdit(): boolean {
    return this.orderId !== null;
  }

  get lines(): LineForm[] {
    return this.form.controls.items.controls;
  }

  /** Estimated total excluding tax, at the current selling prices (the API computes the real one). */
  get total(): number {
    return this.lines.reduce((sum, line) => sum + this.subtotal(line), 0);
  }

  ngOnInit(): void {
    this.watchCustomerSearch();
    this.watchProductSearch();

    const id = this.route.snapshot.paramMap.get('id');
    if (id === null) {
      this.addLine();
      return;
    }
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      this.loadError = 'Commande introuvable.';
      return;
    }
    this.orderId = parsed;
    this.load(parsed);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  displayCustomer(value: CustomerValue): string {
    return value !== null && typeof value === 'object' ? value.name : value ?? '';
  }

  displayProduct(value: ProductValue): string {
    return value !== null && typeof value === 'object' ? `${value.name} (${value.reference})` : value ?? '';
  }

  product(line: LineForm): Product | null {
    return asProduct(line.controls.product.value);
  }

  subtotal(line: LineForm): number {
    const product = this.product(line);
    return product ? product.sellingPrice * (Number(line.controls.quantity.value) || 0) : 0;
  }

  isDuplicate(index: number): boolean {
    const id = this.product(this.lines[index])?.id;
    return id !== undefined && this.lines.some((line, i) => i !== index && this.product(line)?.id === id);
  }

  addLine(product: Product | null = null, quantity: number | null = 1): void {
    this.form.controls.items.push(this.fb.group({
      product: this.fb.control<ProductValue>(product, [Validators.required, isPicked]),
      quantity: this.fb.control<number | null>(quantity, [
        Validators.required, Validators.min(1), Validators.max(MAX_ORDER_QUANTITY), integer
      ])
    }, { validators: enoughStock }));
    this.productOptions.push([]);
  }

  removeLine(index: number): void {
    this.form.controls.items.removeAt(index);
    this.productOptions.splice(index, 1);
    this.lineErrors = {};
  }

  onProductInput(index: number, term: string): void {
    delete this.lineErrors[index];
    this.productSearch$.next({ line: index, term });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const customer = this.form.controls.customer.value as CustomerOption;
    const payload: OrderPayload = {
      customerId: customer.id,
      items: this.lines.map(line => ({
        productId: (this.product(line) as Product).id,
        quantity: Number(line.controls.quantity.value)
      }))
    };

    this.saving = true;
    this.errorMessage = null;
    this.lineErrors = {};
    const request$ = this.orderId === null ? this.orders.create(payload) : this.orders.update(this.orderId, payload);

    request$.subscribe({
      next: order => {
        this.snackBar.open(
          this.isEdit ? `Commande ${order.orderNumber} mise à jour.` : `Commande ${order.orderNumber} créée.`,
          'OK', { duration: 4000 });
        this.router.navigate(['/orders', order.id]);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.showError(error);
      }
    });
  }

  private load(id: number): void {
    this.loading = true;
    this.orders.get(id).pipe(
      switchMap(order => {
        // The lines are shown with the current price and stock of their products.
        const products$: Observable<Product[]> = order.items.length
          ? forkJoin(order.items.map(item => this.products.get(item.productId)))
          : of([]);
        return products$.pipe(map(products => ({ order, products })));
      })
    ).subscribe({
      next: ({ order, products }) => {
        this.order = order;
        if (order.status !== 'PENDING') {
          this.loadError = `La commande ${order.orderNumber} n'est plus en attente : elle ne peut plus être modifiée.`;
          this.loading = false;
          return;
        }
        this.form.controls.customer.setValue({ id: order.customerId, name: order.customerName, detail: null });
        order.items.forEach((item, i) => this.addLine(products[i], item.quantity));
        this.loading = false;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.loadError = error instanceof HttpErrorResponse && error.status === 404
          ? 'Commande introuvable.'
          : extractErrorMessage(error, 'Impossible de charger la commande.');
      }
    });
  }

  private watchCustomerSearch(): void {
    this.subscriptions.add(
      this.form.controls.customer.valueChanges.pipe(
        filter((value): value is string => typeof value === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => this.customers.list({ q: term, status: 'ACTIVE', page: 0, size: 8 }).pipe(
          map(page => page.content.map(customer => this.toCustomerOption(customer))),
          catchError(() => of<CustomerOption[]>([]))
        ))
      ).subscribe(options => (this.customerOptions = options))
    );
  }

  private watchProductSearch(): void {
    this.subscriptions.add(
      this.productSearch$.pipe(
        debounceTime(300),
        switchMap(({ line, term }) => this.products.list({
          q: term, categoryId: null, status: 'ACTIVE', lowStock: false, page: 0, size: 8
        }).pipe(
          map(page => ({ line, options: page.content })),
          catchError(() => of({ line, options: [] as Product[] }))
        ))
      ).subscribe(({ line, options }) => (this.productOptions[line] = options))
    );
  }

  private toCustomerOption(customer: Customer): CustomerOption {
    return { id: customer.id, name: `${customer.firstName} ${customer.lastName}`, detail: customer.company ?? customer.email };
  }

  /** A refused customer or product line is shown where it belongs; anything else above the buttons. */
  private showError(error: unknown): void {
    const message = apiMessage(error);
    const code = apiErrorCode(error);
    const translated = translateApiError(code, message);

    if (code === 'CUSTOMER_INACTIVE' || /^Customer not found/.test(message)) {
      this.form.controls.customer.setErrors({ unavailable: true });
      this.form.controls.customer.markAsTouched();
      return;
    }

    const reference = /^(?:Insufficient stock for|Product is inactive:) ([^:]+)/.exec(message)?.[1]?.trim();
    const productId = Number(/^Product not found with id (\d+)$/.exec(message)?.[1]);
    const index = this.lines.findIndex(line => {
      const product = this.product(line);
      return product !== null && (product.reference === reference || product.id === productId);
    });
    if (index >= 0) {
      this.lineErrors = { [index]: translated ?? 'Ce produit ne peut pas être commandé.' };
      return;
    }

    this.errorMessage = extractErrorMessage(error, 'Enregistrement impossible. Réessayez plus tard.');
  }
}
