package com.businessmanagementplateform.backend.audit;

import com.businessmanagementplateform.backend.service.AuditActions;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Turns "METHOD /api/route" into the action of the audit trail, without knowing any controller:
 * <pre>
 * POST   /api/orders               CREATE_ORDER
 * PUT    /api/products/7           UPDATE_PRODUCT   (id 7)
 * DELETE /api/users/3              DELETE_USER      (id 3)
 * PATCH  /api/users/3/status       UPDATE_USER      (id 3, details "status")
 * POST   /api/invoices/5/cancel    UPDATE_INVOICE   (id 5, details "cancel")
 * POST   /api/invoices/5/payments  CREATE_PAYMENT   (details "invoices=5")
 * </pre>
 * A new module is therefore audited without any change. The login is recorded by the authentication
 * service (the user is not known yet at this point), the reads are not recorded.
 */
public final class AuditActionResolver {

    /** What is known of a request before the response: the id is only known when it is in the route. */
    public record Resolved(String action, String entityType, Long entityId, String details) {
    }

    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    /** Sub-resources that are records of their own (the others, like "cancel", are actions on the parent). */
    private static final Set<String> CHILD_RESOURCES = Set.of("payments", "movements", "items");

    private AuditActionResolver() {
    }

    public static boolean isMutating(String method) {
        return method != null && MUTATING_METHODS.contains(method.toUpperCase());
    }

    public static Optional<Resolved> resolve(String method, String path) {
        if (!isMutating(method) || path == null || !path.startsWith("/api/")) {
            return Optional.empty();
        }
        List<String> segments = Arrays.stream(path.substring("/api/".length()).split("/"))
                .filter(segment -> !segment.isBlank())
                .toList();
        if (segments.isEmpty()) {
            return Optional.empty();
        }

        String resource = segments.get(0);
        if (resource.equals("auth")) {
            boolean passwordChange = segments.size() == 2 && segments.get(1).equals("change-password");
            return passwordChange
                    ? Optional.of(new Resolved(AuditActions.CHANGE_PASSWORD, "USER", null, null))
                    : Optional.empty();
        }

        Long id = null;
        String sub = null;
        for (int i = 1; i < segments.size(); i++) {
            String segment = segments.get(i);
            if (isNumber(segment)) {
                if (id == null && sub == null) {
                    id = Long.valueOf(segment);
                }
            } else if (sub == null) {
                sub = segment;
            }
        }

        String verb = verb(method);
        if (sub == null) {
            String entity = entityName(resource);
            return Optional.of(new Resolved(verb + "_" + entity, entity, id, null));
        }
        if (CHILD_RESOURCES.contains(sub)) {
            String entity = entityName(sub);
            String parent = id == null ? null : resource + "=" + id;
            return Optional.of(new Resolved(verb + "_" + entity, entity, null, parent));
        }
        // An action on the record, such as /invoices/5/cancel or /users/3/status.
        String entity = entityName(resource);
        String actionVerb = method.equalsIgnoreCase("DELETE") ? "DELETE" : "UPDATE";
        return Optional.of(new Resolved(actionVerb + "_" + entity, entity, id, sub));
    }

    private static String verb(String method) {
        return switch (method.toUpperCase()) {
            case "POST" -> "CREATE";
            case "DELETE" -> "DELETE";
            default -> "UPDATE";
        };
    }

    /** "categories" becomes CATEGORY, "orders" ORDER, "stock-movements" STOCK_MOVEMENT. */
    private static String entityName(String resource) {
        String name = resource.replace('-', '_').toUpperCase();
        if (name.endsWith("IES")) {
            return name.substring(0, name.length() - 3) + "Y";
        }
        if (name.endsWith("S") && !name.endsWith("SS")) {
            return name.substring(0, name.length() - 1);
        }
        return name;
    }

    private static boolean isNumber(String segment) {
        return !segment.isEmpty() && segment.chars().allMatch(Character::isDigit) && segment.length() <= 18;
    }
}
