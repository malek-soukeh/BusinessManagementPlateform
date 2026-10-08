package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    boolean existsByEmail(String email);

    boolean existsByTaxNumber(String taxNumber);
}