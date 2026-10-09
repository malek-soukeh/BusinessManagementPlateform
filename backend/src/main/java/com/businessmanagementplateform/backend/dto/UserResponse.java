package com.businessmanagementplateform.backend.dto;

import java.time.Instant;

public record UserResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phone,
        String role,
        String status,
        Instant createdAt,
        Instant updatedAt
){

}