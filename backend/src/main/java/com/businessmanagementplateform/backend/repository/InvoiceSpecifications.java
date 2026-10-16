package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Invoice;
import com.businessmanagementplateform.backend.enums.InvoiceStatus;
import com.businessmanagementplateform.backend.enums.PaymentStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class InvoiceSpecifications {

    private InvoiceSpecifications() {
    }

    public static Specification<Invoice> search(String q, InvoiceStatus status,
                                                PaymentStatus paymentStatus, String ownerEmail) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (paymentStatus != null) {
                predicates.add(cb.equal(root.get("paymentStatus"), paymentStatus));
            }

            if (ownerEmail != null) {
                predicates.add(cb.equal(
                        cb.lower(root.get("order").get("createdBy").<String>get("email")),
                        ownerEmail.trim().toLowerCase()));
            }

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.<String>get("invoiceNumber")), pattern),
                        cb.like(cb.lower(root.get("order").<String>get("orderNumber")), pattern)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}