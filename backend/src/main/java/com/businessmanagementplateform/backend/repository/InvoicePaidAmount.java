package com.businessmanagementplateform.backend.repository;

import java.math.BigDecimal;

/** Sum of the payments of one invoice, read for a whole page of invoices in a single query. */
public interface InvoicePaidAmount {

    Long getInvoiceId();

    BigDecimal getPaidAmount();
}
