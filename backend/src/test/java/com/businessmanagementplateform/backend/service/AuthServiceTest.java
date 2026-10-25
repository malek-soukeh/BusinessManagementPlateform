package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.ChangePasswordRequest;
import com.businessmanagementplateform.backend.entity.User;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ErrorCode;
import com.businessmanagementplateform.backend.repository.UserRepository;
import com.businessmanagementplateform.backend.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String EMAIL = "manager@techdistrib.tn";

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    private User user() {
        return User.builder().id(2L).email(EMAIL).password("stored-hash").build();
    }

    // ---------- changePassword ----------

    @Test
    void changePassword_storesTheEncodedNewPassword() {
        User user = user();
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Old@1234", "stored-hash")).thenReturn(true);
        when(passwordEncoder.encode("New@12345")).thenReturn("new-hash");

        authService.changePassword(EMAIL, new ChangePasswordRequest("Old@1234", "New@12345"));

        assertThat(user.getPassword()).isEqualTo("new-hash");
        verify(userRepository).save(user);
    }

    @Test
    void changePassword_refusesAWrongCurrentPassword() {
        User user = user();
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Wrong@123", "stored-hash")).thenReturn(false);

        assertThatThrownBy(() -> authService.changePassword(EMAIL, new ChangePasswordRequest("Wrong@123", "New@12345")))
                .isInstanceOf(ConflictException.class)
                .extracting(error -> ((ConflictException) error).getCode())
                .isEqualTo(ErrorCode.INVALID_CURRENT_PASSWORD);
        assertThat(user.getPassword()).isEqualTo("stored-hash");
        verify(passwordEncoder, never()).encode(any());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void changePassword_refusesANewPasswordEqualToTheCurrentOne() {
        User user = user();
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Same@1234", "stored-hash")).thenReturn(true);

        assertThatThrownBy(() -> authService.changePassword(EMAIL, new ChangePasswordRequest("Same@1234", "Same@1234")))
                .isInstanceOf(ConflictException.class)
                .extracting(error -> ((ConflictException) error).getCode())
                .isEqualTo(ErrorCode.NEW_PASSWORD_SAME_AS_CURRENT);
        assertThat(user.getPassword()).isEqualTo("stored-hash");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void changePassword_failsWhenTheUserNoLongerExists() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.changePassword(EMAIL, new ChangePasswordRequest("Old@1234", "New@12345")))
                .isInstanceOf(UsernameNotFoundException.class);
        verify(userRepository, never()).save(any(User.class));
    }
}
