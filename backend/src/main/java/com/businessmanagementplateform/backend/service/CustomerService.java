package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CreateCustomerRequest;
import com.businessmanagementplateform.backend.dto.CustomerResponse;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.dto.UpdateCustomerRequest;
import com.businessmanagementplateform.backend.entity.Customer;
import com.businessmanagementplateform.backend.enums.CustomerStatus;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ErrorCode;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.CustomerMapper;
import com.businessmanagementplateform.backend.repository.CustomerRepository;
import com.businessmanagementplateform.backend.repository.CustomerSpecifications;
import com.businessmanagementplateform.backend.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerMapper customerMapper;
    private final CurrentUser currentUser;

    @Transactional
    public CustomerResponse create(CreateCustomerRequest request) {
        String email = request.email().trim().toLowerCase();
        String taxNumber = clean(request.taxNumber());

        if (customerRepository.existsByEmail(email)) {
            throw new ConflictException(ErrorCode.EMAIL_ALREADY_USED, "Email already in use: " + email);
        }
        if (taxNumber != null && customerRepository.existsByTaxNumber(taxNumber)) {
            throw new ConflictException(ErrorCode.TAX_NUMBER_ALREADY_USED, "Tax number already in use: " + taxNumber);
        }

        Customer customer = Customer.builder()
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .email(email)
                .phone(clean(request.phone()))
                .address(clean(request.address()))
                .company(clean(request.company()))
                .taxNumber(taxNumber)
                .status(CustomerStatus.ACTIVE)
                .build();

        return customerMapper.toResponse(customerRepository.saveAndFlush(customer));
    }

    @Transactional(readOnly = true)
    public PageResponse<CustomerResponse> findAll(String q, CustomerStatus status, Pageable pageable) {
        return PageResponse.from(
                customerRepository.findAll(CustomerSpecifications.search(q, status), pageable)
                        .map(customerMapper::toResponse));
    }

    @Transactional(readOnly = true)
    public CustomerResponse findById(Long id) {
        return customerMapper.toResponse(getCustomer(id));
    }

    @Transactional
    public CustomerResponse update(Long id, UpdateCustomerRequest request) {
        Customer customer = getCustomer(id);
        // Deactivating or reactivating a customer is a management decision: ADMIN and MANAGER only.
        // Sending the status it already has is harmless, so a client that resends the whole object is not refused.
        if (request.status() != null && request.status() != customer.getStatus()
                && !currentUser.canChangeCustomerStatus()) {
            throw new AccessDeniedException("Only ADMIN and MANAGER can change the status of a customer");
        }
        String email = request.email().trim().toLowerCase();
        String taxNumber = clean(request.taxNumber());

        if (customerRepository.existsByEmailAndIdNot(email, id)) {
            throw new ConflictException(ErrorCode.EMAIL_ALREADY_USED, "Email already in use: " + email);
        }
        if (taxNumber != null && customerRepository.existsByTaxNumberAndIdNot(taxNumber, id)) {
            throw new ConflictException(ErrorCode.TAX_NUMBER_ALREADY_USED, "Tax number already in use: " + taxNumber);
        }

        customer.setFirstName(request.firstName().trim());
        customer.setLastName(request.lastName().trim());
        customer.setEmail(email);
        customer.setPhone(clean(request.phone()));
        customer.setAddress(clean(request.address()));
        customer.setCompany(clean(request.company()));
        customer.setTaxNumber(taxNumber);
        if (request.status() != null) {
            customer.setStatus(request.status());
        }

        return customerMapper.toResponse(customerRepository.saveAndFlush(customer));
    }

    @Transactional
    public void deactivate(Long id) {
        Customer customer = getCustomer(id);
        customer.setStatus(CustomerStatus.INACTIVE);
        customerRepository.saveAndFlush(customer);
    }

    private Customer getCustomer(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id " + id));
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
