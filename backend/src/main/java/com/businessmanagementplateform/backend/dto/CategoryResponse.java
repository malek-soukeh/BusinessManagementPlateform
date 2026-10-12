package com.businessmanagementplateform.backend.dto;

import java.time.Instant;

public record CategoryResponse(
        Long id,
        String name,
        String description,
        Long parentId,
        String parentName,
        Instant createdAt,
        Instant updatedAt
) {
}