package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Order;
import com.businessmanagementplateform.backend.enums.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    @Query(value = "SELECT nextval('order_number_seq')", nativeQuery = true)
    Long nextOrderSequence();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from CustomerOrder o where o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);

    long countByStatus(OrderStatus status);

    long countByStatusAndCreatedByEmailIgnoreCase(OrderStatus status, String email);

    @Override
    @EntityGraph(attributePaths = {"customer", "createdBy"})
    Page<Order> findAll(Specification<Order> spec, Pageable pageable);
}