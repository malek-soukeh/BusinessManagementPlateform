export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Émise',
  PAID: 'Payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée'
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'Non payée',
  PARTIALLY_PAID: 'Partiellement payée',
  PAID: 'Payée'
};

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
  totalAmount: number;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
}
