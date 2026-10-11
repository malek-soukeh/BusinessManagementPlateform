package com.businessmanagementplateform.backend.mapper;

import com.businessmanagementplateform.backend.dto.CustomerResponse;
import com.businessmanagementplateform.backend.entity.Customer;
import org.springframework.stereotype.Component;

@Component
public class CustomerMapper {

    public CustomerResponse toResponse(Customer customer) {
        return new CustomerResponse(
                customer.getId(),
                customer.getFirstName(),
                customer.getLastName(),
                customer.getEmail(),
                customer.getPhone(),
                customer.getAddress(),
                customer.getCompany(),
                customer.getTaxNumber(),
                customer.getStatus().name(),
                customer.getCreatedAt(),
                customer.getUpdatedAt());
    }
}