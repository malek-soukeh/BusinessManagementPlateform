package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    @Query(value = "SELECT nextval('order_number_seq')", nativeQuery = true)
    Long nextOrderSequence();

    @Override
    @EntityGraph(attributePaths = {"customer", "createdBy"})
    Page<Order> findAll(Specification<Order> spec, Pageable pageable);
}