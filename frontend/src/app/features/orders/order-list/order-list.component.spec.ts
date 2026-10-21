import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Role } from '../../../core/models/auth.models';
import { OrderSummary } from '../../../core/models/order.models';
import { Page } from '../../../core/models/page.models';
import { AuthService } from '../../../core/services/auth.service';
import { OrderService } from '../../../core/services/order.service';
import { SharedModule } from '../../../shared/shared.module';
import { OrderListComponent } from './order-list.component';

registerLocaleData(localeFr);

describe('OrderListComponent', () => {
  const order = (id: number, changes: Partial<OrderSummary> = {}): OrderSummary => ({
    id, orderNumber: `ORD-2026-0000${id}`, customerId: 3, customerName: 'Sami Trabelsi',
    orderDate: '2026-10-18T09:30:00Z', status: 'PENDING', totalAmount: 1250.5, createdBy: 'employee@techdistrib.tn',
    ...changes
  });
  const page = (orders: OrderSummary[]): Page<OrderSummary> => ({
    content: orders, page: 0, size: 10, totalElements: orders.length, totalPages: 1
  });

  let service: jasmine.SpyObj<OrderService>;

  function create(role: Role = 'MANAGER', queryParams: Record<string, string> = {}): ComponentFixture<OrderListComponent> {
    TestBed.configureTestingModule({
      declarations: [OrderListComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: OrderService, useValue: service },
        { provide: AuthService, useValue: { hasAnyRole: (roles: Role[]) => roles.includes(role) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        { provide: LOCALE_ID, useValue: 'fr' }
      ]
    });
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(OrderListComponent);
    fixture.detectChanges();
    return fixture;
  }

  const cells = (fixture: ComponentFixture<OrderListComponent>, column: string) =>
    Array.from<Element>(fixture.nativeElement.querySelectorAll(`td.mat-column-${column}`))
      .map(cell => (cell.textContent ?? '').replace(/\s+/g, ' ').trim());

  beforeEach(() => {
    service = jasmine.createSpyObj<OrderService>('OrderService', ['list', 'get', 'create', 'update', 'changeStatus']);
    service.list.and.returnValue(of(page([order(1), order(2, { status: 'DELIVERED', totalAmount: 99.9 })])));
  });

  it('loads every order, newest first, on start', () => {
    const fixture = create();

    expect(service.list).toHaveBeenCalledWith({ q: '', status: '', customerId: null, page: 0, size: 10 });
    expect(cells(fixture, 'number')).toEqual(['ORD-2026-00001', 'ORD-2026-00002']);
    expect(cells(fixture, 'status')).toEqual(['En attente', 'Livrée']);
    expect(cells(fixture, 'amount')[0]).toMatch(/^1\D250,500 TND$/);
  });

  it('shows the author to a manager only', () => {
    expect(cells(create('MANAGER'), 'author')).toEqual(['employee@techdistrib.tn', 'employee@techdistrib.tn']);
  });

  it('calls them "my orders" for an employee, without the author column', () => {
    const fixture = create('EMPLOYEE');

    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Mes commandes');
    expect(cells(fixture, 'author')).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Nouvelle commande');
  });

  it('searches the order number after a pause in typing', fakeAsync(() => {
    const fixture = create();

    fixture.componentInstance.search.setValue('ORD-2026');
    tick(300);

    expect(service.list.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ q: 'ORD-2026', page: 0 }));
    flush();
  }));

  it('filters by status', () => {
    const fixture = create();

    fixture.componentInstance.onStatusChange('CONFIRMED');

    expect(service.list.calls.mostRecent().args[0].status).toBe('CONFIRMED');
  });

  it('opens on a customer and a status given in the address, and removes the customer filter', () => {
    const fixture = create('MANAGER', { customerId: '3', status: 'SHIPPED' });

    expect(service.list.calls.first().args[0]).toEqual(jasmine.objectContaining({ customerId: 3, status: 'SHIPPED' }));
    expect(fixture.nativeElement.querySelector('.customer-filter').textContent).toContain('Sami Trabelsi');

    (fixture.nativeElement.querySelector('.clear-customer') as HTMLButtonElement).click();

    expect(service.list.calls.mostRecent().args[0].customerId).toBeNull();
  });

  it('ignores an invalid status in the address', () => {
    create('MANAGER', { status: 'LOST' });

    expect(service.list.calls.first().args[0].status).toBe('');
  });

  it('shows the error and reloads on demand', () => {
    service.list.and.returnValues(throwError(() => new HttpErrorResponse({ status: 0 })), of(page([order(1)])));
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('Serveur injoignable');

    (fixture.nativeElement.querySelector('.error-panel button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(cells(fixture, 'number')).toEqual(['ORD-2026-00001']);
  });

  it('says when no order matches', () => {
    service.list.and.returnValue(of(page([])));
    const fixture = create();

    expect(fixture.nativeElement.querySelector('app-empty-state').textContent).toContain('Aucune commande trouvée.');
  });
});
