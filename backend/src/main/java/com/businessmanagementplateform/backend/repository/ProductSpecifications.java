package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Product;
import com.businessmanagementplateform.backend.enums.ProductStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class ProductSpecifications {

    private ProductSpecifications() {
    }

    public static Specification<Product> search(String q, Long categoryId,
                                                ProductStatus status, Boolean lowStock) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }

            if (Boolean.TRUE.equals(lowStock)) {
                predicates.add(cb.lessThanOrEqualTo(
                        root.<Integer>get("quantity"), root.<Integer>get("minimumStock")));
            }

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.<String>get("reference")), pattern),
                        cb.like(cb.lower(root.<String>get("name")), pattern)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}