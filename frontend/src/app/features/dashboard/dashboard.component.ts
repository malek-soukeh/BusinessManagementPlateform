import { DOCUMENT, formatNumber } from '@angular/common';
import { Component, LOCALE_ID, OnDestroy, OnInit, inject } from '@angular/core';
import { Observable, Subject, Subscription, catchError, concat, map, of, skip, switchMap } from 'rxjs';

import { DashboardStats } from '../../core/models/dashboard.models';
import { INVOICE_STATUS_LABELS, InvoiceSummary } from '../../core/models/invoice.models';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES, OrderSummary } from '../../core/models/order.models';
import { Product } from '../../core/models/product.models';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ThemeService } from '../../core/services/theme.service';
import { extractErrorMessage } from '../../core/utils/http-error.util';
import { prefersReducedMotion } from '../../core/utils/motion.util';
import { visibleNavItems } from '../../layout/nav-items';
import { DoughnutChart, collectionChart, ordersByStatusChart, readPalette } from './dashboard-charts';
import { fadeIn, staggerIn } from './dashboard.animations';
import { Kpi } from './kpi-card/kpi-card.component';

/** State of one block of the page: each block loads, fails and retries on its own. */
interface Section<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

const DAY = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [staggerIn, fadeIn]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly dashboard = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly document = inject(DOCUMENT);
  private readonly locale = inject(LOCALE_ID);
  private readonly refresh$ = new Subject<void>();
  private readonly subscriptions = new Subscription();

  /** The API restricts an employee to his own orders and invoices, and hides the amounts from him. */
  readonly isEmployee = this.auth.role === 'EMPLOYEE';
  readonly reducedMotion = prefersReducedMotion();
  readonly orderStatusLabels = ORDER_STATUS_LABELS;
  readonly orderStatusTones = ORDER_STATUS_TONES;
  readonly invoiceStatusLabels = INVOICE_STATUS_LABELS;
  readonly skeletonCards = Array.from({ length: this.isEmployee ? 5 : 8 }, (_, i) => i);
  readonly skeletonRows = [0, 1, 2];

  /** Links only to the pages that exist and that the role may open. */
  readonly routes = {
    customers: this.routeIfAvailable('/customers'),
    products: this.routeIfAvailable('/products'),
    inventory: this.routeIfAvailable('/inventory'),
    orders: this.routeIfAvailable('/orders'),
    invoices: this.routeIfAvailable('/invoices')
  };

  stats: Section<DashboardStats> = { loading: true, error: null, data: null };
  orders: Section<OrderSummary[]> = { loading: true, error: null, data: null };
  overdue: Section<InvoiceSummary[]> = { loading: true, error: null, data: null };
  lowStock: Section<Product[]> = { loading: true, error: null, data: null };

  kpis: Kpi[] = [];
  ordersChart: DoughnutChart | null = null;
  collection: DoughnutChart | null = null;
  collectionRate: number | null = null;
  lastUpdated: Date | null = null;

  get refreshing(): boolean {
    return this.stats.loading || this.orders.loading || this.overdue.loading || this.lowStock.loading;
  }

  /** The amounts are null for the roles that may not see them: the API decides. */
  get hasMoney(): boolean {
    return this.stats.data !== null && this.stats.data.totalRevenue !== null;
  }

  ngOnInit(): void {
    this.track(() => this.stats, section => this.onStats(section),
      () => this.dashboard.getStats(), 'Impossible de charger les indicateurs.');
    this.track(() => this.orders, section => (this.orders = section),
      () => this.dashboard.recentOrders().pipe(map(page => page.content)),
      'Impossible de charger les dernières commandes.');
    this.track(() => this.overdue, section => (this.overdue = section),
      () => this.dashboard.overdueInvoices().pipe(map(page => page.content)),
      'Impossible de charger les factures en retard.');
    this.track(() => this.lowStock, section => (this.lowStock = section),
      () => this.dashboard.lowStockProducts().pipe(map(page => page.content)),
      'Impossible de charger les produits en stock bas.');

    // The chart colors come from the theme: they are redrawn when it changes.
    this.subscriptions.add(this.theme.mode$.pipe(skip(1)).subscribe(() => {
      if (this.stats.data) {
        this.buildCharts(this.stats.data);
      }
    }));

    this.refresh();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  refresh(): void {
    this.refresh$.next();
  }

  /** Whole days elapsed since the due date (yyyy-MM-dd). */
  daysLate(dueDate: string): number {
    const [year, month, day] = dueDate.split('-').map(Number);
    const due = new Date(year, month - 1, day).getTime();
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return Math.max(Math.round((start - due) / DAY), 0);
  }

  trackById(_index: number, item: { id: number | string }): number | string {
    return item.id;
  }

  /** Reloads a block on each refresh; the previous data stays visible while the new one loads. */
  private track<T>(
    read: () => Section<T>, write: (section: Section<T>) => void, request: () => Observable<T>, fallback: string
  ): void {
    this.subscriptions.add(
      this.refresh$
        .pipe(
          switchMap(() => concat(
            of<Section<T>>({ ...read(), loading: true, error: null }),
            request().pipe(
              map((data): Section<T> => ({ loading: false, error: null, data })),
              catchError((error: unknown) =>
                of<Section<T>>({ loading: false, error: extractErrorMessage(error, fallback), data: null }))
            )
          ))
        )
        .subscribe(write)
    );
  }

  private onStats(section: Section<DashboardStats>): void {
    this.stats = section;
    if (section.data && !section.loading) {
      this.lastUpdated = new Date();
      this.kpis = this.buildKpis(section.data);
      this.buildCharts(section.data);
    }
  }

  private buildCharts(stats: DashboardStats): void {
    const palette = readPalette(this.document.body);
    const animate = !this.reducedMotion;
    this.ordersChart = ordersByStatusChart(stats, palette, this.locale, animate);

    if (stats.totalRevenue !== null && stats.totalRevenue > 0) {
      this.collection = collectionChart(stats, palette, this.locale, animate);
      this.collectionRate = ((stats.totalCollected ?? 0) * 100) / stats.totalRevenue;
    } else {
      this.collection = null;
      this.collectionRate = null;
    }
  }

  private buildKpis(s: DashboardStats): Kpi[] {
    const kpis: Kpi[] = [];
    const count = (n: number, one: string, many: string) => `${this.format(n, 0)} ${n > 1 ? many : one}`;

    if (s.totalRevenue !== null && s.totalCollected !== null && s.totalOutstanding !== null) {
      const rate = s.totalRevenue > 0 ? (s.totalCollected * 100) / s.totalRevenue : null;
      kpis.push(
        {
          id: 'revenue', label: 'Chiffre d\'affaires TTC', icon: 'trending_up', tone: 'primary',
          value: s.totalRevenue, decimals: 3, suffix: ' TND',
          hint: 'Factures émises, en retard ou payées', link: this.routes.invoices
        },
        {
          id: 'collected', label: 'Encaissé', icon: 'account_balance_wallet', tone: 'success',
          value: s.totalCollected, decimals: 3, suffix: ' TND', progress: rate,
          hint: rate === null ? 'Aucune facture émise' : `${this.format(rate, 0)} % du chiffre d'affaires`
        },
        {
          id: 'outstanding', label: 'Reste à encaisser', icon: 'hourglass_top',
          tone: s.totalOutstanding > 0 ? 'warning' : 'success',
          value: s.totalOutstanding, decimals: 3, suffix: ' TND', alert: s.overdueInvoices > 0,
          hint: s.overdueInvoices > 0
            ? `Dont ${count(s.overdueInvoices, 'facture', 'factures')} en retard`
            : 'Aucune facture en retard',
          link: this.routes.invoices
        }
      );
    }

    kpis.push(
      {
        id: 'orders', label: this.isEmployee ? 'Mes commandes' : 'Commandes', icon: 'shopping_cart', tone: 'info',
        value: s.totalOrders,
        hint: s.pendingOrders > 0 ? `${count(s.pendingOrders, 'en attente', 'en attente')} de confirmation`
          : 'Aucune commande en attente',
        link: this.routes.orders
      },
      {
        id: 'unpaid', label: 'Factures impayées', icon: 'receipt_long',
        tone: s.overdueInvoices > 0 ? 'danger' : 'primary', value: s.unpaidInvoices, alert: s.overdueInvoices > 0,
        hint: s.overdueInvoices > 0 ? `${count(s.overdueInvoices, 'en retard', 'en retard')} de paiement`
          : 'Aucune facture en retard',
        link: this.routes.invoices
      },
      {
        id: 'low-stock', label: 'Stock bas', icon: 'inventory_2',
        tone: s.lowStockProducts > 0 ? 'warning' : 'success', value: s.lowStockProducts,
        alert: s.lowStockProducts > 0,
        hint: s.lowStockProducts > 0 ? 'Produits au seuil minimum ou en dessous' : 'Tous les stocks sont suffisants',
        link: this.routes.products, queryParams: { lowStock: 'true' }
      },
      {
        id: 'customers', label: 'Clients actifs', icon: 'people', tone: 'primary', value: s.totalCustomers,
        link: this.routes.customers
      },
      {
        id: 'products', label: 'Produits actifs', icon: 'devices', tone: 'primary', value: s.totalProducts,
        link: this.routes.products
      }
    );
    return kpis;
  }

  private format(value: number, decimals: number): string {
    return formatNumber(value, this.locale, `1.${decimals}-${decimals}`);
  }

  private routeIfAvailable(route: string): string | null {
    const item = visibleNavItems(this.auth.role).find(navItem => navItem.route === route);
    return item && !item.comingSoon ? route : null;
  }
}
