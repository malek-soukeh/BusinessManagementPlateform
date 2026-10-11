package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Customer;
import com.businessmanagementplateform.backend.enums.CustomerStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class CustomerSpecifications {

    private CustomerSpecifications() {
    }

    public static Specification<Customer> search(String q, CustomerStatus status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.<String>get("firstName")), pattern),
                        cb.like(cb.lower(root.<String>get("lastName")), pattern),
                        cb.like(cb.lower(root.<String>get("email")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("company"), "")), pattern),
                        cb.like(cb.coalesce(root.<String>get("phone"), ""), pattern)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}