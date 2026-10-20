import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Customer } from '../../../core/models/customer.models';
import { Order } from '../../../core/models/order.models';
import { Page } from '../../../core/models/page.models';
import { Product } from '../../../core/models/product.models';
import { CustomerService } from '../../../core/services/customer.service';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { SharedModule } from '../../../shared/shared.module';
import { CustomerOption, OrderFormComponent } from './order-form.component';

describe('OrderFormComponent', () => {
  const product = (id: number, changes: Partial<Product> = {}): Product => ({
    id, reference: `REF-${id}`, name: `Produit ${id}`, description: null, purchasePrice: 50, sellingPrice: 100,
    quantity: 10, minimumStock: 1, lowStock: false, categoryId: 1, categoryName: 'Informatique', status: 'ACTIVE',
    version: 0, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...changes
  });
  const customer: Customer = {
    id: 3, firstName: 'Sami', lastName: 'Trabelsi', email: 'sami@mail.tn', phone: null, address: null,
    company: 'Acme', taxNumber: null, status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
  };
  const sami: CustomerOption = { id: 3, name: 'Sami Trabelsi', detail: 'Acme' };
  const order = (changes: Partial<Order> = {}): Order => ({
    id: 7, orderNumber: 'ORD-2026-00007', customerId: 3, customerName: 'Sami Trabelsi',
    orderDate: '2026-10-18T09:30:00Z', status: 'PENDING', totalAmount: 300, createdBy: 'manager@techdistrib.tn',
    createdAt: '2026-10-18T09:30:00Z', updatedAt: '2026-10-18T09:30:00Z',
    items: [{ id: 1, productId: 1, productReference: 'REF-1', productName: 'Produit 1', quantity: 3, unitPrice: 100, subtotal: 300 }],
    ...changes
  });
  const page = <T>(content: T[]): Page<T> => ({ content, page: 0, size: 8, totalElements: content.length, totalPages: 1 });

  let orders: jasmine.SpyObj<OrderService>;
  let customers: jasmine.SpyObj<CustomerService>;
  let products: jasmine.SpyObj<ProductService>;
  let router: Router;
  let snackBar: { open: jasmine.Spy };

  function create(id?: string): ComponentFixture<OrderFormComponent> {
    TestBed.configureTestingModule({
      declarations: [OrderFormComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: OrderService, useValue: orders },
        { provide: CustomerService, useValue: customers },
        { provide: ProductService, useValue: products },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(OrderFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  /** Fills a valid order: Sami, 2 × product 1 and 1 × product 2. */
  function fill(component: OrderFormComponent): void {
    component.form.controls.customer.setValue(sami);
    component.lines[0].setValue({ product: product(1), quantity: 2 });
    component.addLine(product(2, { sellingPrice: 49.5 }), 1);
  }

  const conflict = (message: string) => throwError(() => new HttpErrorResponse({ status: 409, error: { message } }));

  beforeEach(() => {
    orders = jasmine.createSpyObj<OrderService>('OrderService', ['list', 'get', 'create', 'update', 'changeStatus']);
    customers = jasmine.createSpyObj<CustomerService>('CustomerService', ['list']);
    customers.list.and.returnValue(of(page([customer])));
    products = jasmine.createSpyObj<ProductService>('ProductService', ['list', 'get']);
    products.list.and.returnValue(of(page([product(1), product(2)])));
    products.get.and.callFake(id => of(product(id)));
    snackBar = { open: jasmine.createSpy('open') };
  });

  it('starts with one empty line and does not call the API while invalid', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    expect(component.lines.length).toBe(1);
    component.submit();
    fixture.detectChanges();

    expect(orders.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Le client est obligatoire.');
    expect(fixture.nativeElement.textContent).toContain('Choisissez un produit.');
  });

  it('suggests the active customers after a pause in typing', fakeAsync(() => {
    const component = create().componentInstance;

    component.form.controls.customer.setValue('sami');
    tick(300);

    expect(customers.list).toHaveBeenCalledWith({ q: 'sami', status: 'ACTIVE', page: 0, size: 8 });
    expect(component.customerOptions).toEqual([sami]);
    flush();
  }));

  it('suggests the active products of the line being typed', fakeAsync(() => {
    const component = create().componentInstance;

    component.onProductInput(0, 'prod');
    tick(300);

    expect(products.list).toHaveBeenCalledWith(
      { q: 'prod', categoryId: null, status: 'ACTIVE', lowStock: false, page: 0, size: 8 });
    expect(component.productOptions[0].length).toBe(2);
    flush();
  }));

  it('refuses a text that was not picked in the list', () => {
    const component = create().componentInstance;

    component.form.controls.customer.setValue('Sami');

    expect(component.form.controls.customer.hasError('notPicked')).toBeTrue();
  });

  it('computes the subtotals and the estimated total', () => {
    const component = create().componentInstance;

    fill(component);

    expect(component.subtotal(component.lines[0])).toBe(200);
    expect(component.total).toBe(249.5);
  });

  it('refuses a quantity above the stock', () => {
    const fixture = create();
    const line = fixture.componentInstance.lines[0];

    line.setValue({ product: product(1, { quantity: 2 }), quantity: 3 });
    fixture.detectChanges();

    expect(line.hasError('insufficient')).toBeTrue();
    expect(fixture.nativeElement.querySelector('.line-error').textContent).toContain('2 disponible(s)');
  });

  it('refuses the same product twice', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    fill(component);
    component.lines[1].controls.product.setValue(product(1));
    fixture.detectChanges();

    expect(component.form.controls.items.hasError('duplicate')).toBeTrue();
    expect(component.isDuplicate(1)).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Ce produit est déjà dans la commande.');
  });

  it('adds and removes lines, keeping at least one', () => {
    const component = create().componentInstance;

    component.addLine();
    expect(component.lines.length).toBe(2);
    component.removeLine(0);
    expect(component.lines.length).toBe(1);
  });

  it('creates the order and opens it', () => {
    orders.create.and.returnValue(of(order()));
    const component = create().componentInstance;

    fill(component);
    component.submit();

    expect(orders.create).toHaveBeenCalledWith({
      customerId: 3, items: [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }]
    });
    expect(snackBar.open).toHaveBeenCalledWith('Commande ORD-2026-00007 créée.', 'OK', jasmine.anything());
    expect(router.navigate).toHaveBeenCalledWith(['/orders', 7]);
  });

  it('loads a pending order with the current products, then updates it', () => {
    orders.get.and.returnValue(of(order()));
    orders.update.and.returnValue(of(order()));
    const component = create('7').componentInstance;

    expect(products.get).toHaveBeenCalledWith(1);
    expect(component.form.controls.customer.value).toEqual({ id: 3, name: 'Sami Trabelsi', detail: null });
    expect(component.lines.length).toBe(1);
    expect(component.lines[0].controls.quantity.value).toBe(3);

    component.lines[0].controls.quantity.setValue(4);
    component.submit();

    expect(orders.update).toHaveBeenCalledWith(7, { customerId: 3, items: [{ productId: 1, quantity: 4 }] });
  });

  it('refuses to modify an order that is no longer pending', () => {
    orders.get.and.returnValue(of(order({ status: 'CONFIRMED' })));
    const fixture = create('7');

    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('ne peut plus être modifiée');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('shows a stock refused by the API under its line', () => {
    orders.create.and.returnValue(conflict('Insufficient stock for REF-2: available 0, requested 1'));
    const fixture = create();

    fill(fixture.componentInstance);
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.componentInstance.lineErrors).toEqual({ 1: 'Stock insuffisant pour REF-2 : 0 disponible(s), 1 demandé(s).' });
    expect(fixture.nativeElement.textContent).toContain('Stock insuffisant pour REF-2');
    expect(fixture.componentInstance.saving).toBeFalse();
  });

  it('shows an inactive customer under the customer field', () => {
    orders.create.and.returnValue(conflict('Customer is inactive: 3'));
    const component = create().componentInstance;

    fill(component);
    component.submit();

    expect(component.form.controls.customer.hasError('unavailable')).toBeTrue();
  });

  it('shows any other error in French above the buttons', () => {
    orders.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    const fixture = create();

    fill(fixture.componentInstance);
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.form-error').textContent).toContain('Serveur injoignable');
  });
});
