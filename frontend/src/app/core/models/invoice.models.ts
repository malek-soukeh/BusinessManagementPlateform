import { OrderItem, OrderStatus } from './order.models';

/** DRAFT exists in the database but the API never creates a draft: an invoice is ISSUED at once. */
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

/** The statuses that can be filtered on (a draft never appears). */
export const INVOICE_STATUSES: InvoiceStatus[] = ['ISSUED', 'OVERDUE', 'PAID', 'CANCELLED'];
export const PAYMENT_STATUSES: PaymentStatus[] = ['UNPAID', 'PARTIALLY_PAID', 'PAID'];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Émise',
  PAID: 'Payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée'
};

export const INVOICE_STATUS_TONES: Record<InvoiceStatus, string> = {
  DRAFT: 'muted',
  ISSUED: 'info',
  PAID: 'success',
  OVERDUE: 'danger',
  CANCELLED: 'muted'
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'Non payée',
  PARTIALLY_PAID: 'Partiellement payée',
  PAID: 'Payée'
};

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, string> = {
  UNPAID: 'warning',
  PARTIALLY_PAID: 'info',
  PAID: 'success'
};

/** The order statuses that can be invoiced (InvoiceService.INVOICEABLE_STATUSES). */
export const INVOICEABLE_ORDER_STATUSES: OrderStatus[] = ['CONFIRMED', 'SHIPPED', 'DELIVERED'];

/**
 * Tax rate applied by the API (app.invoice.tax-rate, 19 % by default). The API does not expose it:
 * the UI only uses it for the preview before creation, the real amounts come from the API.
 */
export const DEFAULT_TAX_RATE = 19;

/** Item of GET /api/invoices (dates are ISO yyyy-MM-dd). */
export interface InvoiceSummary {
  id: number;
  invoiceNumber: string;
  orderId: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  issueDate: string;
  dueDate: string;
  /** Total including tax. */
  totalAmount: number;
  /** Sum of the payments received, computed by the API. */
  paidAmount: number;
  /** What is left to pay: never negative, 0 on a cancelled invoice (computed by the API). */
  remainingAmount: number;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
}

/** Response of GET /api/invoices/{id}, POST and cancel. */
export interface Invoice extends InvoiceSummary {
  /** Order total, excluding tax. */
  subtotal: number;
  taxAmount: number;
  discount: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

/** Body of POST /api/invoices: without discount nor due date, the API uses 0 and 30 days. */
export interface InvoiceCreatePayload {
  orderId: number;
  discount: number | null;
  /** ISO yyyy-MM-dd, not before today. */
  dueDate: string | null;
}

export interface InvoiceQuery {
  /** Searched in the invoice number and the order number. */
  q: string;
  status: InvoiceStatus | '';
  paymentStatus: PaymentStatus | '';
  page: number;
  size: number;
}

/** The API cancels an issued or overdue invoice, and only when it received no payment. */
export function canCancelInvoice(invoice: Pick<InvoiceSummary, 'status' | 'paymentStatus'>): boolean {
  return (invoice.status === 'ISSUED' || invoice.status === 'OVERDUE') && invoice.paymentStatus === 'UNPAID';
}

/** Whole days since the due date (yyyy-MM-dd), 0 when it is not past. */
export function daysOverdue(dueDate: string, today = new Date()): number {
  const [year, month, day] = dueDate.split('-').map(Number);
  const due = new Date(year, month - 1, day).getTime();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.max(Math.round((start - due) / 86_400_000), 0);
}

/** Today as yyyy-MM-dd in the local time zone (the API compares with its own local date). */
export function todayIso(today = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}
