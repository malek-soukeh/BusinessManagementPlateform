package com.businessmanagementplateform.backend.dto;

import com.businessmanagementplateform.backend.enums.RoleType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
        @NotBlank @Size(max = 100)
        String firstName,

        @NotBlank @Size(max = 100)
        String lastName,

        @NotBlank @Email @Size(max = 255)
        String email,

        @Size(max = 20)
        String phone,

        @NotNull
        RoleType role
) {
}