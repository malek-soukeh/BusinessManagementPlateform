package com.businessmanagementplateform.backend.dto;

import com.businessmanagementplateform.backend.enums.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(
        @NotNull
        UserStatus status
) {
}