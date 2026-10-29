package com.businessmanagementplateform.backend.audit;

import com.businessmanagementplateform.backend.audit.AuditActionResolver.Resolved;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AuditActionResolverTest {

    private Resolved resolve(String method, String path) {
        return AuditActionResolver.resolve(method, path).orElseThrow();
    }

    @Test
    void aCreationHasNoIdYet() {
        Resolved resolved = resolve("POST", "/api/orders");

        assertThat(resolved.action()).isEqualTo("CREATE_ORDER");
        assertThat(resolved.entityType()).isEqualTo("ORDER");
        assertThat(resolved.entityId()).isNull();
        assertThat(resolved.details()).isNull();
    }

    @Test
    void anUpdateAndADeletionTakeTheIdOfTheRoute() {
        Resolved update = resolve("PUT", "/api/products/7");
        Resolved patch = resolve("PATCH", "/api/customers/12");
        Resolved delete = resolve("DELETE", "/api/users/3");

        assertThat(update.action()).isEqualTo("UPDATE_PRODUCT");
        assertThat(update.entityId()).isEqualTo(7L);
        assertThat(patch.action()).isEqualTo("UPDATE_CUSTOMER");
        assertThat(patch.entityId()).isEqualTo(12L);
        assertThat(delete.action()).isEqualTo("DELETE_USER");
        assertThat(delete.entityId()).isEqualTo(3L);
    }

    @Test
    void anActionOnARecordIsAnUpdateOfThatRecord() {
        Resolved cancel = resolve("POST", "/api/invoices/5/cancel");
        Resolved status = resolve("PATCH", "/api/users/3/status");

        assertThat(cancel.action()).isEqualTo("UPDATE_INVOICE");
        assertThat(cancel.entityId()).isEqualTo(5L);
        assertThat(cancel.details()).isEqualTo("cancel");
        assertThat(status.action()).isEqualTo("UPDATE_USER");
        assertThat(status.details()).isEqualTo("status");
    }

    @Test
    void aChildRecordIsACreationOfItsOwnKindAndRemembersItsParent() {
        Resolved payment = resolve("POST", "/api/invoices/5/payments");

        assertThat(payment.action()).isEqualTo("CREATE_PAYMENT");
        assertThat(payment.entityType()).isEqualTo("PAYMENT");
        assertThat(payment.entityId()).isNull();
        assertThat(payment.details()).isEqualTo("invoices=5");
    }

    @Test
    void theNameOfTheRecordIsSingularAndUpperCase() {
        assertThat(resolve("POST", "/api/categories").entityType()).isEqualTo("CATEGORY");
        assertThat(resolve("POST", "/api/stock-movements").entityType()).isEqualTo("STOCK_MOVEMENT");
        assertThat(resolve("POST", "/api/inventory").entityType()).isEqualTo("INVENTORY");
    }

    @Test
    void theChangeOfPasswordIsRecordedAsSuch() {
        Resolved resolved = resolve("POST", "/api/auth/change-password");

        assertThat(resolved.action()).isEqualTo("CHANGE_PASSWORD");
        assertThat(resolved.entityType()).isEqualTo("USER");
    }

    @Test
    void theLoginAndTheReadsAreLeftOut() {
        assertThat(AuditActionResolver.resolve("POST", "/api/auth/login")).isEmpty();
        assertThat(AuditActionResolver.resolve("GET", "/api/customers")).isEmpty();
        assertThat(AuditActionResolver.resolve("GET", "/api/customers/4")).isEmpty();
        assertThat(AuditActionResolver.resolve("OPTIONS", "/api/customers")).isEmpty();
    }

    @Test
    void anythingOutsideTheApiIsLeftOut() {
        assertThat(AuditActionResolver.resolve("POST", "/swagger-ui/index.html")).isEmpty();
        assertThat(AuditActionResolver.resolve("POST", "/api/")).isEmpty();
        assertThat(AuditActionResolver.resolve("POST", null)).isEmpty();
        assertThat(AuditActionResolver.resolve(null, "/api/orders")).isEmpty();
    }
}
