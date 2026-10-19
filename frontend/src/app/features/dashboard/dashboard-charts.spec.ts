import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

import { DashboardStats } from '../../core/models/dashboard.models';
import { ChartPalette, collectionChart, ordersByStatusChart, readPalette } from './dashboard-charts';

registerLocaleData(localeFr);

describe('dashboard charts', () => {
  const palette: ChartPalette = {
    status: { PENDING: '#1', CONFIRMED: '#2', SHIPPED: '#3', DELIVERED: '#4', CANCELLED: '#5' },
    collected: '#c', outstanding: '#o', surface: '#s'
  };
  const stats: DashboardStats = {
    totalCustomers: 4, totalProducts: 3, lowStockProducts: 1, totalOrders: 10, pendingOrders: 1,
    ordersByStatus: { PENDING: 1, CONFIRMED: 4, SHIPPED: 0, DELIVERED: 0, CANCELLED: 5 },
    unpaidInvoices: 1, overdueInvoices: 1,
    totalRevenue: 1000, totalCollected: 750, totalOutstanding: 250
  };

  it('splits the orders by status in the workflow order', () => {
    const chart = ordersByStatusChart(stats, palette, 'fr', false);

    expect(chart.data.labels).toEqual(['En attente', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée']);
    expect(chart.data.datasets[0].data).toEqual([1, 4, 0, 0, 5]);
    expect(chart.data.datasets[0].backgroundColor).toEqual(['#1', '#2', '#3', '#4', '#5']);
    expect(chart.legend.map(item => item.percent)).toEqual([10, 40, 0, 0, 50]);
    expect(chart.options.animation).toBeFalse();
  });

  it('describes the chart for screen readers', () => {
    const chart = ordersByStatusChart(stats, palette, 'fr', true);

    expect(chart.description).toContain('Répartition de 10 commande(s) par statut');
    expect(chart.description).toContain('Annulée : 5');
  });

  it('compares the money collected with the money still due', () => {
    const chart = collectionChart(stats, palette, 'fr', true);

    expect(chart.data.labels).toEqual(['Encaissé', 'Reste à encaisser']);
    expect(chart.data.datasets[0].data).toEqual([750, 250]);
    expect(chart.legend.map(item => item.percent)).toEqual([75, 25]);
    expect(chart.description.replace(/\s/g, ' ')).toContain('Encaissé : 750,000 TND');
  });

  it('falls back to default colors when the theme variables are missing', () => {
    const element = document.createElement('div');

    const colors = readPalette(element);

    expect(colors.status.PENDING).toMatch(/^#|^rgb/);
    expect(colors.surface).toBeTruthy();
  });
});
