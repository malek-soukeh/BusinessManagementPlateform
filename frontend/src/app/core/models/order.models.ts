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

/**
 * The workflow enforced by the API (OrderService.ALLOWED_TRANSITIONS). The UI only offers these moves;
 * the API stays the authority and refuses any other one.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
};

/** Item of GET /api/orders. */
export interface OrderSummary {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
  /** Total excluding tax: the tax is added on the invoice. */
  totalAmount: number;
  createdBy: string;
}

export interface OrderItem {
  id: number;
  productId: number;
  productReference: string;
  productName: string;
  quantity: number;
  /** Selling price of the product when the order was saved. */
  unitPrice: number;
  subtotal: number;
}

/** Response of GET /api/orders/{id}, POST, PUT and PATCH status. */
export interface Order extends OrderSummary {
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

/** Body of POST /api/orders and PUT /api/orders/{id}. */
export interface OrderPayload {
  customerId: number;
  items: { productId: number; quantity: number }[];
}

export interface OrderQuery {
  /** Searched in the order number only (that is what the API does). */
  q: string;
  /** Empty string means every status. */
  status: OrderStatus | '';
  customerId: number | null;
  page: number;
  size: number;
}

/** Same bounds as the API for the quantity of a line. */
export const MAX_ORDER_QUANTITY = 100_000;
