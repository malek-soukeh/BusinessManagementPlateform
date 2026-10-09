package com.businessmanagementplateform.backend.dto;

public record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        String email,
        String role
) {
}