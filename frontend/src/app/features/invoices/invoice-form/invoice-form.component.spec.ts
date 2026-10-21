import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Invoice, InvoiceSummary } from '../../../core/models/invoice.models';
import { Order, OrderSummary } from '../../../core/models/order.models';
import { Page } from '../../../core/models/page.models';
import { InvoiceService } from '../../../core/services/invoice.service';
import { OrderService } from '../../../core/services/order.service';
import { SharedModule } from '../../../shared/shared.module';
import { InvoiceFormComponent } from './invoice-form.component';

describe('InvoiceFormComponent', () => {
  const summary = (changes: Partial<OrderSummary> = {}): OrderSummary => ({
    id: 7, orderNumber: 'ORD-2026-00007', customerId: 3, customerName: 'Sami Trabelsi',
    orderDate: '2026-10-18T09:30:00Z', status: 'CONFIRMED', totalAmount: 1000, createdBy: 'manager@techdistrib.tn',
    ...changes
  });
  const order: Order = { ...summary(), items: [], createdAt: '2026-10-18T09:30:00Z', updatedAt: '2026-10-18T09:30:00Z' };
  const created = { id: 4, invoiceNumber: 'INV-2026-00004' } as Invoice;
  const page = <T>(content: T[]): Page<T> => ({ content, page: 0, size: 8, totalElements: content.length, totalPages: 1 });

  let invoices: jasmine.SpyObj<InvoiceService>;
  let orders: jasmine.SpyObj<OrderService>;
  let router: Router;
  let snackBar: { open: jasmine.Spy };

  function create(orderId?: string): ComponentFixture<InvoiceFormComponent> {
    TestBed.configureTestingModule({
      declarations: [InvoiceFormComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: InvoiceService, useValue: invoices },
        { provide: OrderService, useValue: orders },
        { provide: MatSnackBar, useValue: snackBar },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(orderId ? { orderId } : {}) } }
        }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(InvoiceFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  const conflict = (message: string) => throwError(() => new HttpErrorResponse({ status: 409, error: { message } }));

  beforeEach(() => {
    invoices = jasmine.createSpyObj<InvoiceService>('InvoiceService', ['list', 'get', 'create', 'cancel', 'findByOrder']);
    invoices.findByOrder.and.returnValue(of(null));
    orders = jasmine.createSpyObj<OrderService>('OrderService', ['list', 'get']);
    orders.get.and.returnValue(of(order));
    orders.list.and.returnValue(of(page([summary(), summary({ id: 8, orderNumber: 'ORD-2026-00008', status: 'PENDING' })])));
    snackBar = { open: jasmine.createSpy('open') };
  });

  it('requires an order', () => {
    const fixture = create();

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(invoices.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('La commande est obligatoire.');
  });

  it('preselects the order given by the order page and checks it has no invoice yet', () => {
    const component = create('7').componentInstance;

    expect(orders.get).toHaveBeenCalledWith(7);
    expect(component.order?.id).toBe(7);
    expect(invoices.findByOrder).toHaveBeenCalledWith(7, 'ORD-2026-00007');
    expect(component.canSubmit).toBeTrue();
  });

  it('suggests the orders after a pause in typing', fakeAsync(() => {
    const component = create().componentInstance;

    component.form.controls.order.setValue('ORD');
    tick(300);

    expect(orders.list).toHaveBeenCalledWith({ q: 'ORD', status: '', customerId: null, page: 0, size: 8 });
    expect(component.orderOptions.length).toBe(2);
    expect(component.isInvoiceable(component.orderOptions[1])).toBeFalse();
    flush();
  }));

  it('previews the amounts with the tax and the discount', () => {
    const component = create('7').componentInstance;

    component.form.controls.discount.setValue(100);

    expect(component.preview).toEqual({ subtotal: 1000, discount: 100, taxable: 900, tax: 171, total: 1071 });
  });

  it('refuses a discount above the order total or with too many decimals', () => {
    const component = create('7').componentInstance;

    component.form.controls.discount.setValue(1000.5);
    expect(component.form.hasError('discountTooHigh')).toBeTrue();

    component.form.controls.discount.setValue(1.2345);
    expect(component.form.controls.discount.hasError('maxDecimals')).toBeTrue();
  });

  it('refuses a past due date', () => {
    const component = create('7').componentInstance;

    component.form.controls.dueDate.setValue('2000-01-01');

    expect(component.form.controls.dueDate.hasError('past')).toBeTrue();
  });

  it('blocks an order that already has an invoice and links it', () => {
    invoices.findByOrder.and.returnValue(of({ id: 2, invoiceNumber: 'INV-2026-00002' } as InvoiceSummary));
    const fixture = create('7');

    expect(fixture.componentInstance.canSubmit).toBeFalse();
    expect(fixture.nativeElement.querySelector('.existing-invoice').textContent).toContain('INV-2026-00002');
  });

  it('blocks an order that cannot be invoiced', () => {
    orders.get.and.returnValue(of({ ...order, status: 'PENDING' }));
    const fixture = create('7');

    expect(fixture.componentInstance.canSubmit).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('elle doit être confirmée, expédiée ou livrée');
  });

  it('creates the invoice, without the empty conditions, and opens it', () => {
    invoices.create.and.returnValue(of(created));
    const component = create('7').componentInstance;

    component.submit();

    expect(invoices.create).toHaveBeenCalledWith({ orderId: 7, discount: null, dueDate: null });
    expect(snackBar.open).toHaveBeenCalledWith('Facture INV-2026-00004 créée.', 'OK', jasmine.anything());
    expect(router.navigate).toHaveBeenCalledWith(['/invoices', 4]);
  });

  it('sends the discount and the due date when given', () => {
    invoices.create.and.returnValue(of(created));
    const component = create('7').componentInstance;

    component.form.patchValue({ discount: 50.5, dueDate: '2099-12-31' });
    component.submit();

    expect(invoices.create).toHaveBeenCalledWith({ orderId: 7, discount: 50.5, dueDate: '2099-12-31' });
  });

  it('shows a refused discount under its field', () => {
    invoices.create.and.returnValue(conflict('Discount cannot exceed the order total: 1000.000'));
    const component = create('7').componentInstance;

    component.form.controls.discount.setValue(10);
    component.submit();

    expect(component.form.controls.discount.hasError('tooHigh')).toBeTrue();
    expect(component.saving).toBeFalse();
  });

  it('shows any other refusal in French', () => {
    invoices.create.and.returnValue(conflict('Order already invoiced: ORD-2026-00007'));
    const fixture = create('7');

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.form-error').textContent)
      .toContain('La commande ORD-2026-00007 est déjà facturée.');
  });
});
