package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface ProductRepository
        extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    boolean existsByReference(String reference);

    boolean existsByReferenceAndIdNot(String reference, Long id);

    Optional<Product> findByReference(String reference);

    boolean existsByCategoryId(Long categoryId);
}