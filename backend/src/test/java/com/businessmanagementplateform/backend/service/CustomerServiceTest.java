package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CreateCustomerRequest;
import com.businessmanagementplateform.backend.dto.CustomerResponse;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.dto.UpdateCustomerRequest;
import com.businessmanagementplateform.backend.entity.Customer;
import com.businessmanagementplateform.backend.enums.CustomerStatus;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.CustomerMapper;
import com.businessmanagementplateform.backend.repository.CustomerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    @Mock
    private CustomerRepository customerRepository;

    @Spy
    private CustomerMapper customerMapper = new CustomerMapper();

    @InjectMocks
    private CustomerService customerService;

    private Customer customer(Long id, String email, String taxNumber) {
        return Customer.builder()
                .id(id)
                .firstName("Ahmed")
                .lastName("Ben Ali")
                .email(email)
                .taxNumber(taxNumber)
                .status(CustomerStatus.ACTIVE)
                .build();
    }

    private UpdateCustomerRequest updateRequest(String email, String taxNumber, CustomerStatus status) {
        return new UpdateCustomerRequest("Ahmed", "Ben Ali", email, "98765432", "La Marsa",
                null, taxNumber, status);
    }

    // ---------- create ----------

    @Test
    void create_normalizesEmailAndTurnsBlankOptionalFieldsIntoNull() {
        CreateCustomerRequest request = new CreateCustomerRequest(
                "Ahmed", "Ben Ali", "  Ahmed@Email.com ", "   ", null, null, "");
        when(customerRepository.saveAndFlush(any(Customer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        customerService.create(request);

        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).saveAndFlush(captor.capture());
        Customer saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("ahmed@email.com");
        assertThat(saved.getPhone()).isNull();
        assertThat(saved.getAddress()).isNull();
        assertThat(saved.getCompany()).isNull();
        assertThat(saved.getTaxNumber()).isNull();
        assertThat(saved.getStatus()).isEqualTo(CustomerStatus.ACTIVE);
    }

    @Test
    void create_doesNotCheckTaxNumberUniquenessWhenNoneIsGiven() {
        CreateCustomerRequest request = new CreateCustomerRequest(
                "Karim", "Mansour", "karim@email.com", null, null, null, null);
        when(customerRepository.saveAndFlush(any(Customer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        customerService.create(request);

        verify(customerRepository, never()).existsByTaxNumber(any());
    }

    @Test
    void create_throwsConflict_whenEmailAlreadyUsed() {
        CreateCustomerRequest request = new CreateCustomerRequest(
                "Autre", "Client", "Ahmed@Email.com", null, null, null, null);
        when(customerRepository.existsByEmail("ahmed@email.com")).thenReturn(true);

        assertThatThrownBy(() -> customerService.create(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Email already in use");
        verify(customerRepository, never()).saveAndFlush(any(Customer.class));
    }

    @Test
    void create_throwsConflict_whenTaxNumberAlreadyUsed() {
        CreateCustomerRequest request = new CreateCustomerRequest(
                "Autre", "Societe", "autre@email.com", null, null, null, "TN-1001");
        when(customerRepository.existsByTaxNumber("TN-1001")).thenReturn(true);

        assertThatThrownBy(() -> customerService.create(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Tax number already in use");
        verify(customerRepository, never()).saveAndFlush(any(Customer.class));
    }

    // ---------- update ----------

    @Test
    void update_throwsConflict_whenEmailBelongsToAnotherCustomer() {
        when(customerRepository.findById(7L))
                .thenReturn(Optional.of(customer(7L, "ahmed@email.com", null)));
        when(customerRepository.existsByEmailAndIdNot("sarah@email.com", 7L)).thenReturn(true);

        assertThatThrownBy(() -> customerService.update(7L, updateRequest("sarah@email.com", null, null)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Email already in use");
    }

    @Test
    void update_throwsConflict_whenTaxNumberBelongsToAnotherCustomer() {
        when(customerRepository.findById(7L))
                .thenReturn(Optional.of(customer(7L, "ahmed@email.com", "TN-1001")));
        when(customerRepository.existsByTaxNumberAndIdNot("TN-1002", 7L)).thenReturn(true);

        assertThatThrownBy(() -> customerService.update(
                7L, updateRequest("ahmed@email.com", "TN-1002", null)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Tax number already in use");
    }

    @Test
    void update_allowsKeepingOwnEmailAndTaxNumber() {
        when(customerRepository.findById(7L))
                .thenReturn(Optional.of(customer(7L, "ahmed@email.com", "TN-1001")));
        when(customerRepository.saveAndFlush(any(Customer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CustomerResponse response = customerService.update(
                7L, updateRequest("Ahmed@Email.com", "TN-1001", null));

        assertThat(response.email()).isEqualTo("ahmed@email.com");
        assertThat(response.taxNumber()).isEqualTo("TN-1001");
        assertThat(response.phone()).isEqualTo("98765432");
        assertThat(response.address()).isEqualTo("La Marsa");
    }

    @Test
    void update_keepsCurrentStatus_whenNoneIsGiven() {
        Customer inactive = customer(7L, "ahmed@email.com", null);
        inactive.setStatus(CustomerStatus.INACTIVE);
        when(customerRepository.findById(7L)).thenReturn(Optional.of(inactive));
        when(customerRepository.saveAndFlush(any(Customer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CustomerResponse response = customerService.update(
                7L, updateRequest("ahmed@email.com", null, null));

        assertThat(response.status()).isEqualTo("INACTIVE");
    }

    @Test
    void update_canReactivateAnInactiveCustomer() {
        Customer inactive = customer(7L, "ahmed@email.com", null);
        inactive.setStatus(CustomerStatus.INACTIVE);
        when(customerRepository.findById(7L)).thenReturn(Optional.of(inactive));
        when(customerRepository.saveAndFlush(any(Customer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CustomerResponse response = customerService.update(
                7L, updateRequest("ahmed@email.com", null, CustomerStatus.ACTIVE));

        assertThat(response.status()).isEqualTo("ACTIVE");
    }

    // ---------- deactivate ----------

    @Test
    void deactivate_setsStatusToInactiveWithoutDeleting() {
        Customer existing = customer(7L, "ahmed@email.com", null);
        when(customerRepository.findById(7L)).thenReturn(Optional.of(existing));

        customerService.deactivate(7L);

        assertThat(existing.getStatus()).isEqualTo(CustomerStatus.INACTIVE);
        verify(customerRepository).saveAndFlush(existing);
        verify(customerRepository, never()).delete(any(Customer.class));
    }

    // ---------- findById / findAll ----------

    @Test
    void findById_throwsNotFound_whenCustomerMissing() {
        when(customerRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void findAll_returnsAPageOfMappedResponses() {
        Pageable pageable = PageRequest.of(0, 20);
        Customer existing = customer(7L, "ahmed@email.com", null);
        when(customerRepository.findAll(ArgumentMatchers.<Specification<Customer>>any(), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(existing), pageable, 1));

        PageResponse<CustomerResponse> result =
                customerService.findAll("ben", CustomerStatus.ACTIVE, pageable);

        assertThat(result.totalElements()).isEqualTo(1);
        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).email()).isEqualTo("ahmed@email.com");
    }
}
