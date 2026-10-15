package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Order;
import com.businessmanagementplateform.backend.enums.OrderStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class OrderSpecifications {

    private OrderSpecifications() {
    }

    public static Specification<Order> search(String q, OrderStatus status,
                                              Long customerId, String ownerEmail) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (customerId != null) {
                predicates.add(cb.equal(root.get("customer").get("id"), customerId));
            }

            if (ownerEmail != null) {
                predicates.add(cb.equal(
                        cb.lower(root.get("createdBy").<String>get("email")),
                        ownerEmail.trim().toLowerCase()));
            }

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.<String>get("orderNumber")), pattern));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}