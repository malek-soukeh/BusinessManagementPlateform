package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Invoice;
import com.businessmanagementplateform.backend.enums.InvoiceStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long>, JpaSpecificationExecutor<Invoice> {

    @Query(value = "SELECT nextval('invoice_number_seq')", nativeQuery = true)
    Long nextInvoiceSequence();

    /** True when the order has an invoice other than the given status (an order may have several cancelled ones). */
    boolean existsByOrderIdAndStatusNot(Long orderId, InvoiceStatus status);

    List<Invoice> findByStatusAndDueDateBefore(InvoiceStatus status, LocalDate date);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Invoice i where i.id = :id")
    Optional<Invoice> findByIdForUpdate(@Param("id") Long id);

    long countByStatus(InvoiceStatus status);

    long countByStatusAndOrder_CreatedBy_EmailIgnoreCase(InvoiceStatus status, String email);

    /** Sum of the invoice totals for the given statuses, or null when there is none. */
    @Query("select sum(i.totalAmount) from Invoice i where i.status in :statuses")
    BigDecimal sumTotalByStatusIn(@Param("statuses") Collection<InvoiceStatus> statuses);

    @Override
    @EntityGraph(attributePaths = {"order", "order.customer", "order.createdBy"})
    Page<Invoice> findAll(Specification<Invoice> spec, Pageable pageable);
}
