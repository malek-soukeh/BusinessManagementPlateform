package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Customer;
import com.businessmanagementplateform.backend.enums.CustomerStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CustomerRepository
        extends JpaRepository<Customer, Long>, JpaSpecificationExecutor<Customer> {

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, Long id);

    boolean existsByTaxNumber(String taxNumber);

    boolean existsByTaxNumberAndIdNot(String taxNumber, Long id);

    long countByStatus(CustomerStatus status);
}