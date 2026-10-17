package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    /** Sum of the payments of an invoice, or null when there is none. */
    @Query("select sum(p.amount) from Payment p where p.invoice.id = :invoiceId")
    BigDecimal sumAmountByInvoiceId(@Param("invoiceId") Long invoiceId);

    /** Sum of every payment, or null when there is none. */
    @Query("select sum(p.amount) from Payment p")
    BigDecimal sumAllAmounts();

    List<Payment> findByInvoiceIdOrderByPaymentDateDescIdDesc(Long invoiceId);
}