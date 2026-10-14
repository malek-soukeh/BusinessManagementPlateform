package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    Page<StockMovement> findByProductId(Long productId, Pageable pageable);
}