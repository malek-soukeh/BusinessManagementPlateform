export type StockMovementReason = 'INITIAL_STOCK' | 'ORDER_CONFIRMED' | 'ORDER_CANCELLED' | 'MANUAL_ADJUSTMENT';

export const STOCK_REASON_LABELS: Record<StockMovementReason, string> = {
  INITIAL_STOCK: 'Stock initial',
  ORDER_CONFIRMED: 'Commande confirmée',
  ORDER_CANCELLED: 'Commande annulée',
  MANUAL_ADJUSTMENT: 'Ajustement manuel'
};

/** Color family of each reason (see .status-chip in styles.scss). */
export const STOCK_REASON_TONES: Record<StockMovementReason, string> = {
  INITIAL_STOCK: 'info',
  ORDER_CONFIRMED: 'primary',
  ORDER_CANCELLED: 'warning',
  MANUAL_ADJUSTMENT: 'muted'
};

/** Item of GET /api/products/{id}/stock-movements, the newest first. */
export interface StockMovement {
  id: number;
  productId: number;
  productReference: string;
  productName: string;
  /** Positive for an entry, negative for an exit, never zero. */
  quantityChange: number;
  quantityAfter: number;
  reason: StockMovementReason;
  orderId: number | null;
  note: string | null;
  /** Email of the user who made the movement. */
  createdBy: string;
  createdAt: string;
}

/** Body of POST /api/products/{id}/stock-adjustments. */
export interface StockAdjustmentPayload {
  /** Non-zero, between -1 000 000 and 1 000 000. */
  quantityChange: number;
  /** Required: why the stock is corrected (inventory count, breakage...). */
  note: string;
}

/** Same bounds as the API. */
export const MAX_STOCK_CHANGE = 1_000_000;

/**
 * The notes written by the API itself are in English: they are shown in French.
 * A note typed by a user is shown as is.
 */
export function stockNoteLabel(note: string | null): string {
  if (!note) {
    return '';
  }
  if (note === 'Initial stock at product creation') {
    return 'Stock initial à la création du produit';
  }
  const order = /^Order (.+)$/.exec(note);
  return order ? `Commande ${order[1]}` : note;
}
