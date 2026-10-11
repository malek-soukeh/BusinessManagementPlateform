package com.businessmanagementplateform.backend.dto;

import java.time.Instant;

public record CustomerResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phone,
        String address,
        String company,
        String taxNumber,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
}