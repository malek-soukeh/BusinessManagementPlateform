/** Response of GET /api/dashboard/stats. The money fields are null for an EMPLOYEE. */
export interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  totalOrders: number;
  pendingOrders: number;
  ordersByStatus: Record<string, number>;
  unpaidInvoices: number;
  overdueInvoices: number;
  totalRevenue: number | null;
  totalCollected: number | null;
  totalOutstanding: number | null;
}