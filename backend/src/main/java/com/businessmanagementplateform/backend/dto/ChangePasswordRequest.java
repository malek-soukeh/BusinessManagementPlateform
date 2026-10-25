package com.businessmanagementplateform.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank
        String currentPassword,

        // 72 bytes is the limit of BCrypt, the same bounds as the creation of a user.
        @NotBlank @Size(min = 8, max = 72)
        String newPassword
) {
}
