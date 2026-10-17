package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Product;
import com.businessmanagementplateform.backend.enums.ProductStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProductRepository
        extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    boolean existsByReference(String reference);

    boolean existsByReferenceAndIdNot(String reference, Long id);

    Optional<Product> findByReference(String reference);

    boolean existsByCategoryId(Long categoryId);

    long countByStatus(ProductStatus status);

    /** Same rule as the lowStock filter of the product list: quantity at or under the minimum. */
    @Query("select count(p) from Product p where p.status = :status and p.quantity <= p.minimumStock")
    long countLowStock(@Param("status") ProductStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id in :ids order by p.id")
    List<Product> findAllByIdForUpdate(@Param("ids") Collection<Long> ids);
}