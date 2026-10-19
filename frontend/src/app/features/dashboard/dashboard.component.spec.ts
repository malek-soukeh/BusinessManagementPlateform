import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { NgChartsModule } from 'ng2-charts';
import { BehaviorSubject, Observable, Subject, of, throwError } from 'rxjs';

import { Role } from '../../core/models/auth.models';
import { DashboardStats } from '../../core/models/dashboard.models';
import { InvoiceSummary } from '../../core/models/invoice.models';
import { OrderSummary } from '../../core/models/order.models';
import { Page } from '../../core/models/page.models';
import { Product } from '../../core/models/product.models';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ThemeMode, ThemeService } from '../../core/services/theme.service';
import { COUNT_UP_DURATION } from '../../shared/directives/count-up.directive';
import { SharedModule } from '../../shared/shared.module';
import { DashboardComponent } from './dashboard.component';
import { KpiCardComponent } from './kpi-card/kpi-card.component';

registerLocaleData(localeFr);

function page<T>(content: T[]): Page<T> {
  return { content, page: 0, size: 5, totalElements: content.length, totalPages: 1 };
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

describe('DashboardComponent', () => {
  const stats: DashboardStats = {
    totalCustomers: 4, totalProducts: 3, lowStockProducts: 1, totalOrders: 11, pendingOrders: 1,
    ordersByStatus: { PENDING: 1, CONFIRMED: 4, SHIPPED: 0, DELIVERED: 1, CANCELLED: 5 },
    unpaidInvoices: 1, overdueInvoices: 1,
    totalRevenue: 12378.38, totalCollected: 9303.785, totalOutstanding: 3074.595
  };
  const employeeStats: DashboardStats = {
    ...stats, totalRevenue: null, totalCollected: null, totalOutstanding: null
  };
  const order: OrderSummary = {
    id: 7, orderNumber: 'ORD-2026-00007', customerId: 1, customerName: 'Sami Trabelsi',
    orderDate: '2026-10-18T09:30:00Z', status: 'CONFIRMED', totalAmount: 1250.5, createdBy: 'manager@techdistrib.tn'
  };
  const invoice: InvoiceSummary = {
    id: 3, invoiceNumber: 'INV-2026-00003', orderId: 7, orderNumber: 'ORD-2026-00007', customerId: 1,
    customerName: 'Sami Trabelsi', issueDate: isoDaysAgo(40), dueDate: isoDaysAgo(10), totalAmount: 1488.095,
    status: 'OVERDUE', paymentStatus: 'UNPAID'
  };
  const product: Product = {
    id: 2, reference: 'LAP-001', name: 'Portable Pro 14', description: null, purchasePrice: 1500, sellingPrice: 2100,
    quantity: 0, minimumStock: 5, lowStock: true, categoryId: 1, categoryName: 'Ordinateurs', status: 'ACTIVE',
    version: 0, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
  };

  let service: jasmine.SpyObj<DashboardService>;
  let mode$: BehaviorSubject<ThemeMode>;

  function create(role: Role = 'MANAGER'): ComponentFixture<DashboardComponent> {
    mode$ = new BehaviorSubject<ThemeMode>('light');
    TestBed.configureTestingModule({
      declarations: [DashboardComponent, KpiCardComponent],
      imports: [SharedModule, NgChartsModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: DashboardService, useValue: service },
        { provide: AuthService, useValue: { role } },
        { provide: ThemeService, useValue: { mode$ } },
        { provide: COUNT_UP_DURATION, useValue: 0 },
        { provide: LOCALE_ID, useValue: 'fr' }
      ]
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return fixture;
  }

  function texts(fixture: ComponentFixture<DashboardComponent>, selector: string): string[] {
    return Array.from<Element>(fixture.nativeElement.querySelectorAll(selector))
      .map(element => (element.textContent ?? '').replace(/\s+/g, ' ').trim());
  }

  function query(fixture: ComponentFixture<DashboardComponent>, selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector);
  }

  beforeEach(() => {
    service = jasmine.createSpyObj<DashboardService>(
      'DashboardService', ['getStats', 'recentOrders', 'overdueInvoices', 'lowStockProducts']);
    service.getStats.and.returnValue(of(stats));
    service.recentOrders.and.returnValue(of(page([order])));
    service.overdueInvoices.and.returnValue(of(page([invoice])));
    service.lowStockProducts.and.returnValue(of(page([product])));
  });

  it('shows skeletons, not a spinner, while loading', () => {
    service.getStats.and.returnValue(new Subject<DashboardStats>());
    service.recentOrders.and.returnValue(new Subject<Page<OrderSummary>>());

    const fixture = create();

    expect(fixture.nativeElement.querySelectorAll('.kpi-skeleton').length).toBe(8);
    expect(query(fixture, 'app-kpi-card')).toBeNull();
    expect(query(fixture, 'mat-spinner')).toBeNull();
    expect(query(fixture, '#recent-orders app-skeleton')).not.toBeNull();
  });

  it('shows every key figure to a manager, amounts included', () => {
    const fixture = create('MANAGER');

    const values = texts(fixture, '.kpi-value');
    expect(values.length).toBe(8);
    expect(values[0]).toMatch(/^12\D378,380 TND$/);
    expect(values[1]).toMatch(/^9\D303,785 TND$/);
    expect(values[2]).toMatch(/^3\D074,595 TND$/);
    expect(values.slice(3)).toEqual(['11', '1', '1', '4', '3']);
    expect(texts(fixture, '.kpi-hint')).toContain('75 % du chiffre d\'affaires');
    expect(query(fixture, '.notice')).toBeNull();
  });

  it('keeps an employee to the figures the API gives him', () => {
    service.getStats.and.returnValue(of(employeeStats));

    const fixture = create('EMPLOYEE');

    expect(texts(fixture, '.kpi-value')).toEqual(['11', '1', '1', '4', '3']);
    expect(texts(fixture, '.kpi-label')).toContain('Mes commandes');
    expect(query(fixture, '.notice')?.textContent).toContain('réservés');
    expect(texts(fixture, '.panel-title')).not.toContain('Encaissement');
    expect(texts(fixture, '.panel-title')).toContain('Mes dernières commandes');
  });

  it('draws the orders by status with a readable legend', () => {
    const fixture = create();

    const canvas = query(fixture, '.charts canvas');
    expect(canvas?.getAttribute('role')).toBe('img');
    expect(canvas?.getAttribute('aria-label')).toContain('Répartition de 11 commande(s) par statut');
    expect(texts(fixture, '.charts .panel:first-child .legend-label'))
      .toEqual(['En attente', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée']);
    expect(texts(fixture, '.charts .panel:first-child .legend-value')).toEqual(['1', '4', '0', '1', '5']);
  });

  it('shows the collection rate to a manager', () => {
    const fixture = create();

    const collection = fixture.nativeElement.querySelectorAll('.charts .panel')[1] as HTMLElement;
    expect(collection.textContent).toContain('Encaissement');
    expect(collection.querySelector('.chart-center')?.textContent).toContain('75 %');
  });

  it('says so when there is no order yet', () => {
    service.getStats.and.returnValue(of({
      ...stats, totalOrders: 0, pendingOrders: 0,
      ordersByStatus: { PENDING: 0, CONFIRMED: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 }
    }));

    const fixture = create();

    expect(query(fixture, '.charts .panel:first-child canvas')).toBeNull();
    expect(query(fixture, '.charts .panel:first-child .empty')?.textContent).toContain('Aucune commande');
  });

  it('lists the latest orders, the overdue invoices and the products in low stock', () => {
    const fixture = create();

    expect(query(fixture, '#recent-orders .compact-title')?.textContent).toContain('ORD-2026-00007');
    expect(query(fixture, '#recent-orders .status-chip')?.textContent).toContain('Confirmée');
    expect(query(fixture, '#overdue-invoices .status-chip')?.textContent).toContain('10 j de retard');
    expect(query(fixture, '#low-stock .compact-amount')?.textContent).toContain('0 / 5 min.');
    expect(query(fixture, '#low-stock .status-chip')?.textContent).toContain('Rupture');
  });

  it('says when a list is empty', () => {
    service.overdueInvoices.and.returnValue(of(page<InvoiceSummary>([])));

    const fixture = create();

    expect(query(fixture, '#overdue-invoices .empty')?.textContent).toContain('Aucune facture en retard');
  });

  it('shows the error and reloads on demand', () => {
    service.getStats.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 0 })),
      of(stats));

    const fixture = create();

    expect(query(fixture, '.error-panel')?.textContent).toContain('Serveur injoignable');
    expect(query(fixture, '.kpi-skeleton')).toBeNull();

    query(fixture, '.error-panel .retry')?.click();
    fixture.detectChanges();

    expect(service.getStats).toHaveBeenCalledTimes(2);
    expect(query(fixture, '.error-panel')).toBeNull();
    expect(texts(fixture, '.kpi-value').length).toBe(8);
  });

  it('keeps the other blocks when one list fails', () => {
    service.recentOrders.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    const fixture = create();

    expect(query(fixture, '#recent-orders .list-error')?.textContent)
      .toContain('Impossible de charger les dernières commandes.');
    expect(query(fixture, '#low-stock .compact-title')).not.toBeNull();
    expect(texts(fixture, '.kpi-value').length).toBe(8);
  });

  it('keeps the figures on screen while refreshing', () => {
    const fixture = create();
    const pending = new Subject<DashboardStats>();
    service.getStats.and.returnValue(pending as Observable<DashboardStats>);

    query(fixture, '#refresh-button')?.click();
    fixture.detectChanges();

    expect(query(fixture, '.refresh-bar')).not.toBeNull();
    expect(texts(fixture, '.kpi-value').length).toBe(8);
    expect((query(fixture, '#refresh-button') as HTMLButtonElement).disabled).toBeTrue();

    pending.next({ ...stats, totalCustomers: 5 });
    pending.complete();
    fixture.detectChanges();

    expect(query(fixture, '.refresh-bar')).toBeNull();
    expect(texts(fixture, '.kpi-value')[6]).toBe('5');
  });

  it('only links the cards to the pages that exist', () => {
    const fixture = create();

    const links = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('app-kpi-card a'))
      .map(link => link.getAttribute('href'));
    expect(links).toEqual(['/customers']);
  });

  it('redraws the charts when the theme changes', () => {
    const fixture = create();
    const before = fixture.componentInstance.ordersChart;

    mode$.next('dark');

    expect(fixture.componentInstance.ordersChart).not.toBe(before);
    expect(fixture.componentInstance.ordersChart?.legend.length).toBe(5);
  });
});
