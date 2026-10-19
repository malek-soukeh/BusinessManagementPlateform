import { OrderStatus } from './order.models';

/** Response of GET /api/dashboard/stats. The money fields are null for an EMPLOYEE. */
export interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  totalOrders: number;
  pendingOrders: number;
  /** One entry per status, zero included. */
  ordersByStatus: Record<OrderStatus, number>;
  unpaidInvoices: number;
  overdueInvoices: number;
  totalRevenue: number | null;
  totalCollected: number | null;
  totalOutstanding: number | null;
}
