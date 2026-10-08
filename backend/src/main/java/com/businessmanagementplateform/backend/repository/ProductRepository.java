package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    boolean existsByReference(String reference);

    Optional<Product> findByReference(String reference);
}