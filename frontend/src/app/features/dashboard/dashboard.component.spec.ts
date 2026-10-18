import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';

import { DashboardStats } from '../../core/models/dashboard.models';
import { DashboardService } from '../../core/services/dashboard.service';
import { SharedModule } from '../../shared/shared.module';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  const stats: DashboardStats = {
    totalCustomers: 4, totalProducts: 3, lowStockProducts: 1, totalOrders: 11, pendingOrders: 1,
    ordersByStatus: { PENDING: 1, CONFIRMED: 4, SHIPPED: 0, DELIVERED: 1, CANCELLED: 5 },
    unpaidInvoices: 1, overdueInvoices: 1,
    totalRevenue: 12378.38, totalCollected: 9303.785, totalOutstanding: 3074.595
  };

  let service: jasmine.SpyObj<DashboardService>;

  function create(): ComponentFixture<DashboardComponent> {
    TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      imports: [SharedModule, NoopAnimationsModule],
      providers: [{ provide: DashboardService, useValue: service }]
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return fixture;
  }

  function texts(fixture: ComponentFixture<DashboardComponent>, selector: string): string[] {
    return Array.from<Element>(fixture.nativeElement.querySelectorAll(selector))
      .map(element => element.textContent?.trim() ?? '');
  }

  beforeEach(() => {
    service = jasmine.createSpyObj<DashboardService>('DashboardService', ['getStats']);
  });

  it('shows a spinner while the statistics are loading', () => {
    service.getStats.and.returnValue(new Subject<DashboardStats>());

    const fixture = create();

    expect(fixture.nativeElement.querySelector('mat-spinner')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.kpi')).toBeNull();
  });

  it('shows the counters and the orders by status', () => {
    service.getStats.and.returnValue(of(stats));

    const fixture = create();

    expect(texts(fixture, '.kpi-value')).toEqual(['4', '3', '1', '11', '1']);
    expect(texts(fixture, '.status-count')).toEqual(['1', '4', '0', '1', '5']);
    expect(fixture.nativeElement.textContent).toContain('1 en attente');
    expect(fixture.nativeElement.textContent).toContain('1 en retard');
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeNull();
  });

  it('shows the money figures to a manager or an administrator', () => {
    service.getStats.and.returnValue(of(stats));

    const fixture = create();
    const money = texts(fixture, '.money-value');

    expect(money.length).toBe(3);
    expect(money[0]).toMatch(/12\D378\D380 TND/);
    expect(money[1]).toMatch(/9\D303\D785 TND/);
    expect(money[2]).toMatch(/3\D074\D595 TND/);
    expect(fixture.nativeElement.querySelector('.notice')).toBeNull();
  });

  it('hides the money figures from an employee and says why', () => {
    service.getStats.and.returnValue(
      of({ ...stats, totalRevenue: null, totalCollected: null, totalOutstanding: null }));

    const fixture = create();

    expect(fixture.nativeElement.querySelector('.money-value')).toBeNull();
    expect(fixture.nativeElement.querySelector('.notice').textContent).toContain('réservés');
  });

  it('shows the error and reloads on demand', () => {
    service.getStats.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 0 })),
      of(stats));

    const fixture = create();

    expect(fixture.nativeElement.querySelector('.error-message').textContent)
      .toContain('Serveur injoignable');

    fixture.nativeElement.querySelector('.error-card button').click();
    fixture.detectChanges();

    expect(service.getStats).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.error-message')).toBeNull();
    expect(texts(fixture, '.kpi-value')[0]).toBe('4');
  });
});