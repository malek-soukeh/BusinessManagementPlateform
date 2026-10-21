export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'CHECK';

export const PAYMENT_METHODS: PaymentMethod[] = ['BANK_TRANSFER', 'CASH', 'CARD', 'CHECK'];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  CARD: 'Carte bancaire',
  CHECK: 'Chèque'
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  CASH: 'payments',
  BANK_TRANSFER: 'account_balance',
  CARD: 'credit_card',
  CHECK: 'request_quote'
};

/** Item of GET /api/invoices/{id}/payments (the newest first) and response of POST. */
export interface Payment {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
  /** Email of the user who recorded the payment. */
  createdBy: string;
  createdAt: string;
}

/** Body of POST /api/invoices/{id}/payments. */
export interface PaymentPayload {
  /** Positive, at most 3 decimals, not above what is left to pay. */
  amount: number;
  method: PaymentMethod;
  /** ISO instant, not in the future; the API uses "now" when it is null. */
  paymentDate: string | null;
}

/**
 * Amounts are compared in millimes (1 TND = 1000 millimes) to avoid the rounding errors of
 * floating point numbers: 0.1 + 0.2 must equal 0.3 when checking what is left to pay.
 */
export function toMillimes(amount: number): number {
  return Math.round(amount * 1000);
}

/** What is left to pay on an invoice, never negative. */
export function remainingAmount(total: number, payments: Pick<Payment, 'amount'>[]): number {
  const paid = payments.reduce((sum, payment) => sum + toMillimes(payment.amount), 0);
  return Math.max(toMillimes(total) - paid, 0) / 1000;
}

export function paidAmount(payments: Pick<Payment, 'amount'>[]): number {
  return payments.reduce((sum, payment) => sum + toMillimes(payment.amount), 0) / 1000;
}
