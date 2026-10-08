package com.businessmanagementplateform.backend.repository;

import com.businessmanagementplateform.backend.entity.Role;
import com.businessmanagementplateform.backend.enums.RoleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByName(RoleType name);

    boolean existsByName(RoleType name);
}