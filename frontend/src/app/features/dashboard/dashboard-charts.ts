import { formatNumber } from '@angular/common';
import { ChartData, ChartOptions } from 'chart.js';

import { DashboardStats } from '../../core/models/dashboard.models';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, OrderStatus } from '../../core/models/order.models';

/** Chart colors, read from the CSS variables of the current theme (see styles.scss). */
export interface ChartPalette {
  status: Record<OrderStatus, string>;
  collected: string;
  outstanding: string;
  surface: string;
}

/** One line of the HTML legend shown next to a chart (also read by screen readers). */
export interface LegendItem {
  label: string;
  color: string;
  value: number;
  percent: number;
}

export interface DoughnutChart {
  data: ChartData<'doughnut', number[], string>;
  options: ChartOptions<'doughnut'>;
  legend: LegendItem[];
  /** Text alternative of the canvas. */
  description: string;
}

const FALLBACK: ChartPalette = {
  status: {
    PENDING: '#f59e0b', CONFIRMED: '#3b82f6', SHIPPED: '#8b5cf6', DELIVERED: '#16a34a', CANCELLED: '#94a3b8'
  },
  collected: '#16a34a',
  outstanding: '#f59e0b',
  surface: '#ffffff'
};

export function readPalette(element: Element): ChartPalette {
  const css = getComputedStyle(element);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    status: {
      PENDING: read('--chart-pending', FALLBACK.status.PENDING),
      CONFIRMED: read('--chart-confirmed', FALLBACK.status.CONFIRMED),
      SHIPPED: read('--chart-shipped', FALLBACK.status.SHIPPED),
      DELIVERED: read('--chart-delivered', FALLBACK.status.DELIVERED),
      CANCELLED: read('--chart-cancelled', FALLBACK.status.CANCELLED)
    },
    collected: read('--chart-collected', FALLBACK.collected),
    outstanding: read('--chart-outstanding', FALLBACK.outstanding),
    surface: read('--app-surface', FALLBACK.surface)
  };
}

/** Distribution of the orders by status. */
export function ordersByStatusChart(
  stats: DashboardStats, palette: ChartPalette, locale: string, animate: boolean
): DoughnutChart {
  const values = ORDER_STATUSES.map(status => stats.ordersByStatus[status] ?? 0);
  const labels = ORDER_STATUSES.map(status => ORDER_STATUS_LABELS[status]);
  const colors = ORDER_STATUSES.map(status => palette.status[status]);
  const count = (value: number) => formatNumber(value, locale, '1.0-0');

  return doughnut(labels, values, colors, palette, animate, count,
    total => `Répartition de ${count(total)} commande(s) par statut`);
}

/** Money collected versus money still to collect. */
export function collectionChart(
  stats: DashboardStats, palette: ChartPalette, locale: string, animate: boolean
): DoughnutChart {
  const money = (value: number) => `${formatNumber(value, locale, '1.3-3')} TND`;
  return doughnut(
    ['Encaissé', 'Reste à encaisser'],
    [stats.totalCollected ?? 0, Math.max(stats.totalOutstanding ?? 0, 0)],
    [palette.collected, palette.outstanding],
    palette, animate, money,
    total => `Encaissement d'un chiffre d'affaires de ${money(total)}`);
}

function doughnut(
  labels: string[], values: number[], colors: string[], palette: ChartPalette, animate: boolean,
  format: (value: number) => string, describe: (total: number) => string
): DoughnutChart {
  const total = values.reduce((sum, value) => sum + value, 0);
  const percent = (value: number) => (total === 0 ? 0 : (value * 100) / total);
  const legend = labels.map((label, i) => ({ label, color: colors[i], value: values[i], percent: percent(values[i]) }));
  const details = legend.map(item => `${item.label} : ${format(item.value)}`).join(', ');

  return {
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: palette.surface,
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      animation: animate ? { animateRotate: true, duration: 700 } : false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: item => ` ${item.label} : ${format(item.parsed)} (${Math.round(percent(item.parsed))} %)`
          }
        }
      }
    },
    legend,
    description: `${describe(total)}. ${details}.`
  };
}
