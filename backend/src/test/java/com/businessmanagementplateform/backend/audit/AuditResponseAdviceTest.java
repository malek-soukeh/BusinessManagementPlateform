package com.businessmanagementplateform.backend.audit;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AuditResponseAdviceTest {

    record OrderLike(Long id, String orderNumber, String name, String status) {
    }

    record CustomerLike(Long id, String email, String phone) {
    }

    record NoIdentity(String status, int count) {
    }

    @Test
    void takesTheIdAndTheMostSpecificLabel() {
        AuditResponseAdvice.Target target = AuditResponseAdvice.targetOf(
                new OrderLike(9L, "ORD-2026-00009", "other name", "PENDING"));

        assertThat(target.id()).isEqualTo(9L);
        assertThat(target.label()).isEqualTo("ORD-2026-00009");
    }

    @Test
    void fallsBackOnTheEmailWhenNothingMoreSpecificExists() {
        AuditResponseAdvice.Target target = AuditResponseAdvice.targetOf(
                new CustomerLike(4L, "ahmed@email.com", "98765432"));

        assertThat(target.id()).isEqualTo(4L);
        assertThat(target.label()).isEqualTo("ahmed@email.com");
    }

    @Test
    void anAnswerWithoutIdentityGivesNothing() {
        AuditResponseAdvice.Target target = AuditResponseAdvice.targetOf(new NoIdentity("ok", 3));

        assertThat(target.id()).isNull();
        assertThat(target.label()).isNull();
    }
}
