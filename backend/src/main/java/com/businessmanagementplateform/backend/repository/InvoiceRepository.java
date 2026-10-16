package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface InvoiceRepository extends JpaRepository<Invoice, Long>, JpaSpecificationExecutor<Invoice> {

    @Query(value = "SELECT nextval('invoice_number_seq')", nativeQuery = true)
    Long nextInvoiceSequence();

    boolean existsByOrderId(Long orderId);

    @Override
    @EntityGraph(attributePaths = {"order", "order.customer", "order.createdBy"})
    Page<Invoice> findAll(Specification<Invoice> spec, Pageable pageable);
}