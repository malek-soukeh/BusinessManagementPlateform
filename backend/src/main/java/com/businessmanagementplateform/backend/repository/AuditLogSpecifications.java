package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.AuditLog;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public final class AuditLogSpecifications {

    private AuditLogSpecifications() {
    }

    /**
     * @param q          free text, looked for in the user, the action, the record label, the route and the details
     * @param user       part of the e-mail of the user
     * @param action     exact action, e.g. CREATE_ORDER
     * @param entityType exact type of record, e.g. ORDER
     * @param from       first instant included
     * @param to         first instant excluded
     */
    public static Specification<AuditLog> search(String q, String user, String action, String entityType,
                                                 Instant from, Instant to) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (user != null && !user.isBlank()) {
                predicates.add(cb.like(cb.lower(root.<String>get("userEmail")), contains(user)));
            }
            if (action != null && !action.isBlank()) {
                predicates.add(cb.equal(root.get("action"), action.trim().toUpperCase()));
            }
            if (entityType != null && !entityType.isBlank()) {
                predicates.add(cb.equal(root.get("entityType"), entityType.trim().toUpperCase()));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<Instant>get("createdAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThan(root.<Instant>get("createdAt"), to));
            }
            if (q != null && !q.isBlank()) {
                String pattern = contains(q);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.<String>get("userEmail")), pattern),
                        cb.like(cb.lower(root.<String>get("action")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("entityLabel"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("path"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("details"), "")), pattern)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static String contains(String text) {
        return "%" + text.trim().toLowerCase() + "%";
    }
}
