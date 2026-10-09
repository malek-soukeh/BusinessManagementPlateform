package com.businessmanagementplateform.backend.dto;

public record UserProfileResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phone,
        String role,
        String status
) {
}