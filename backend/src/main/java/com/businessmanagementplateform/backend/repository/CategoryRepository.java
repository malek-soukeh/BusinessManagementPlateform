package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    boolean existsByName(String name);
}