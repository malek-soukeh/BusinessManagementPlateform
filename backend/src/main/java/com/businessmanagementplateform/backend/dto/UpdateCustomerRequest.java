package com.businessmanagementplateform.backend.dto;

import com.businessmanagementplateform.backend.enums.CustomerStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCustomerRequest(
        @NotBlank @Size(max = 100)
        String firstName,

        @NotBlank @Size(max = 100)
        String lastName,

        @NotBlank @Email @Size(max = 255)
        String email,

        @Size(max = 20)
        String phone,

        @Size(max = 255)
        String address,

        @Size(max = 150)
        String company,

        @Size(max = 50)
        String taxNumber,

        CustomerStatus status
) {
}