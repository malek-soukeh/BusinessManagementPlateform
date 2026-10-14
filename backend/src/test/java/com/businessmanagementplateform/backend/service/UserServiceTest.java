package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CreateUserRequest;
import com.businessmanagementplateform.backend.dto.UpdateUserRequest;
import com.businessmanagementplateform.backend.dto.UpdateUserStatusRequest;
import com.businessmanagementplateform.backend.dto.UserResponse;
import com.businessmanagementplateform.backend.entity.Role;
import com.businessmanagementplateform.backend.entity.User;
import com.businessmanagementplateform.backend.enums.RoleType;
import com.businessmanagementplateform.backend.enums.UserStatus;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.UserMapper;
import com.businessmanagementplateform.backend.repository.RoleRepository;
import com.businessmanagementplateform.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Spy
    private UserMapper userMapper = new UserMapper();

    @InjectMocks
    private UserService userService;

    private Role role(RoleType type) {
        return Role.builder().id(1L).name(type).build();
    }

    private User user(Long id, String email, RoleType roleType) {
        return User.builder()
                .id(id)
                .firstName("Test")
                .lastName("User")
                .email(email)
                .password("hash")
                .status(UserStatus.ACTIVE)
                .role(role(roleType))
                .build();
    }

    // ---------- create ----------

    @Test
    void create_hashesPasswordAndNormalizesEmail() {
        CreateUserRequest request = new CreateUserRequest(
                "Sami", "Manager", "  Manager@TechDistrib.tn ", "Manager@123", null, RoleType.MANAGER);
        when(userRepository.existsByEmail("manager@techdistrib.tn")).thenReturn(false);
        when(roleRepository.findByName(RoleType.MANAGER)).thenReturn(Optional.of(role(RoleType.MANAGER)));
        when(passwordEncoder.encode("Manager@123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponse response = userService.create(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("manager@techdistrib.tn");
        assertThat(saved.getPassword()).isEqualTo("hashed");
        assertThat(saved.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(response.role()).isEqualTo("MANAGER");
    }

    @Test
    void create_throwsConflict_whenEmailAlreadyUsed() {
        CreateUserRequest request = new CreateUserRequest(
                "Sami", "Manager", "manager@techdistrib.tn", "Manager@123", null, RoleType.MANAGER);
        when(userRepository.existsByEmail("manager@techdistrib.tn")).thenReturn(true);

        assertThatThrownBy(() -> userService.create(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Email already in use");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void create_throwsNotFound_whenRoleMissing() {
        CreateUserRequest request = new CreateUserRequest(
                "Sami", "Manager", "manager@techdistrib.tn", "Manager@123", null, RoleType.MANAGER);
        when(userRepository.existsByEmail("manager@techdistrib.tn")).thenReturn(false);
        when(roleRepository.findByName(RoleType.MANAGER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.create(request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---------- update ----------

    @Test
    void update_throwsConflict_whenEmailBelongsToAnotherUser() {
        User target = user(5L, "manager@techdistrib.tn", RoleType.MANAGER);
        when(userRepository.findById(5L)).thenReturn(Optional.of(target));
        when(userRepository.existsByEmailAndIdNot("employee@techdistrib.tn", 5L)).thenReturn(true);
        UpdateUserRequest request = new UpdateUserRequest(
                "Sami", "Benali", "employee@techdistrib.tn", null, RoleType.MANAGER);

        assertThatThrownBy(() -> userService.update(5L, request, "admin@techdistrib.tn"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Email already in use");
    }

    @Test
    void update_forbidsAdminToChangeOwnRole() {
        User admin = user(1L, "admin@techdistrib.tn", RoleType.ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        UpdateUserRequest request = new UpdateUserRequest(
                "System", "Admin", "admin@techdistrib.tn", null, RoleType.MANAGER);

        assertThatThrownBy(() -> userService.update(1L, request, "admin@techdistrib.tn"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("own role");
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void update_forbidsAdminToChangeOwnEmail() {
        User admin = user(1L, "admin@techdistrib.tn", RoleType.ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        UpdateUserRequest request = new UpdateUserRequest(
                "System", "Admin", "autre@techdistrib.tn", null, RoleType.ADMIN);

        assertThatThrownBy(() -> userService.update(1L, request, "admin@techdistrib.tn"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("own email");
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void update_allowsAdminToEditOwnNameAndPhone() {
        User admin = user(1L, "admin@techdistrib.tn", RoleType.ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(roleRepository.findByName(RoleType.ADMIN)).thenReturn(Optional.of(role(RoleType.ADMIN)));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        UpdateUserRequest request = new UpdateUserRequest(
                "Super", "Admin", "admin@techdistrib.tn", "22123456", RoleType.ADMIN);

        UserResponse response = userService.update(1L, request, "admin@techdistrib.tn");

        assertThat(response.firstName()).isEqualTo("Super");
        assertThat(response.phone()).isEqualTo("22123456");
        assertThat(response.role()).isEqualTo("ADMIN");
    }

    // ---------- updateStatus ----------

    @Test
    void updateStatus_forbidsAdminToDeactivateOwnAccount() {
        User admin = user(1L, "admin@techdistrib.tn", RoleType.ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> userService.updateStatus(
                1L, new UpdateUserStatusRequest(UserStatus.INACTIVE), "admin@techdistrib.tn"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("deactivate your own account");
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void updateStatus_deactivatesAnotherUser() {
        User employee = user(3L, "employee@techdistrib.tn", RoleType.EMPLOYEE);
        when(userRepository.findById(3L)).thenReturn(Optional.of(employee));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponse response = userService.updateStatus(
                3L, new UpdateUserStatusRequest(UserStatus.INACTIVE), "admin@techdistrib.tn");

        assertThat(response.status()).isEqualTo("INACTIVE");
    }

    // ---------- delete ----------

    @Test
    void delete_forbidsAdminToDeleteOwnAccount() {
        User admin = user(1L, "admin@techdistrib.tn", RoleType.ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> userService.delete(1L, "admin@techdistrib.tn"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("delete your own account");
        verify(userRepository, never()).delete(any(User.class));
    }

    @Test
    void delete_translatesIntegrityViolationIntoConflict() {
        User employee = user(3L, "employee@techdistrib.tn", RoleType.EMPLOYEE);
        when(userRepository.findById(3L)).thenReturn(Optional.of(employee));
        doThrow(new DataIntegrityViolationException("fk violation")).when(userRepository).flush();

        assertThatThrownBy(() -> userService.delete(3L, "admin@techdistrib.tn"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("deactivate it instead");
    }

    // ---------- findById ----------

    @Test
    void findById_throwsNotFound_whenUserMissing() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }
}