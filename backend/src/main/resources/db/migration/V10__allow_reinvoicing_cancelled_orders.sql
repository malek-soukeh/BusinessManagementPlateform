-- An order whose invoice was cancelled can be invoiced again.
-- The old rule "one invoice per order" becomes "one ACTIVE invoice per order":
-- cancelled invoices are kept for the history and no longer block a new one.
ALTER TABLE invoices DROP CONSTRAINT uq_invoices_order_id;

CREATE UNIQUE INDEX uq_invoices_active_order
    ON invoices (order_id)
    WHERE status <> 'CANCELLED';

-- The dropped constraint also served the lookups by order and the foreign key.
CREATE INDEX idx_invoices_order_id ON invoices (order_id);
