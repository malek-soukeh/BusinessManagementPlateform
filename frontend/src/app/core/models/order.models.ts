export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

/** Every status, in the order of the workflow. */
export const ORDER_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée'
};

/** Color family of each status (see .status-chip in styles.scss). */
export const ORDER_STATUS_TONES: Record<OrderStatus, string> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  SHIPPED: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'muted'
};

/** Item of GET /api/orders. */
export interface OrderSummary {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
  totalAmount: number;
  createdBy: string;
}
