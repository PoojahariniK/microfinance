package com.microfinance.loanapp.service;

import com.microfinance.loanapp.dto.*;
import com.microfinance.loanapp.enums.UserRole;
import com.microfinance.loanapp.enums.UserStatus;
import com.microfinance.loanapp.exception.ApiException;
import com.microfinance.loanapp.model.User; 
import com.microfinance.loanapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // LOGIN
    public LoginResponse login(LoginRequest request) {

        if (request.getUsername() == null || request.getPassword() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Username and password required");
        }

        User user = validateAndGetUserByUsername(request.getUsername());

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid password");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is disabled");
        }

        return LoginResponse.builder()
                .username(user.getUsername())
                .name(user.getName())
                .phone(user.getPhone())
                .address(user.getAddress())
                .role(user.getRole())
                .message("Login successful")
                .build();
    }

    // CREATE STAFF
    @Transactional
    public UserResponse createStaff(UserCreateRequest request, String adminUsername) {

        validateAdmin(adminUsername);

        if (request.getUsername() == null || request.getPassword() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Username and password required");
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Username already exists");
        }

        User staff = new User();
        staff.setUsername(request.getUsername());
        staff.setPassword(passwordEncoder.encode(request.getPassword()));
        staff.setName(request.getName());
        staff.setPhone(request.getPhone());
        staff.setAddress(request.getAddress());
        staff.setRole(request.getRole() != null ? UserRole.valueOf(request.getRole().toUpperCase()) : UserRole.STAFF);
        staff.setStatus(UserStatus.ACTIVE);

        userRepository.save(staff);

        return mapToResponse(staff);
    }

    public List<UserResponse> getAllUsers(String adminUsername) {

        validateAdmin(adminUsername);

        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    public UserResponse getUserByUsername(String username, String loggedInUser) {

        User loggedUser = validateAndGetUserByUsername(loggedInUser);

        if (loggedUser.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is disabled");
        }

        // ADMIN → can view anyone
        if (loggedUser.getRole() == UserRole.ADMIN) {
            return mapToResponse(validateAndGetUserByUsername(username));
        }

        // STAFF → can view only themselves
        if (!loggedUser.getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Access denied");
        }

        return mapToResponse(loggedUser);
    }

    // UPDATE STAFF
    @Transactional
    public UserResponse updateUser(Long id, UserUpdateRequest request, String loggedInUser) {

        User loggedUser = validateAndGetUserByUsername(loggedInUser);

        if (loggedUser.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is disabled");
        }

        User targetUser = validateAndGetUserById(id);

        // ADMIN → full access
        if (loggedUser.getRole() == UserRole.ADMIN) {

            targetUser.setName(request.getName());
            targetUser.setPhone(request.getPhone());
            targetUser.setAddress(request.getAddress());

            if (request.getStatus() != null) {
                targetUser.setStatus(request.getStatus());
            }

            userRepository.save(targetUser);
            return mapToResponse(targetUser);
        }

        // STAFF → can update ONLY themselves
        if (!loggedUser.getId().equals(targetUser.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cannot update other users");
        }

        // STAFF update (NO status change)
        targetUser.setName(request.getName());
        targetUser.setPhone(request.getPhone());
        targetUser.setAddress(request.getAddress());

        userRepository.save(targetUser);
        return mapToResponse(targetUser);
    }

    // DELETE STAFF
    @Transactional
    public ApiResponse deleteUser(Long id, String adminUsername) {

        validateAdmin(adminUsername);

        User user = validateAndGetUserById(id);

        if (user.getRole() == UserRole.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cannot delete ADMIN user");
        }

        userRepository.delete(user);

        return new ApiResponse("User deleted successfully");
    }


    // LOGOUT
    public ApiResponse logout(String username) {
        validateAndGetUserByUsername(username);
        return new ApiResponse("Logout successful");
    }

    // ================= HELPER METHODS =================

    private void validateAdmin(String username) {

        if (username == null || username.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Missing loggedInUser header");
        }

        User user = validateAndGetUserByUsername(username);

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is disabled");
        }

        if (user.getRole() != UserRole.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    private User validateAndGetUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private User validateAndGetUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private UserResponse mapToResponse(User user) {

        UserResponse dto = new UserResponse();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setName(user.getName());
        dto.setPhone(user.getPhone());
        dto.setAddress(user.getAddress());
        dto.setRole(user.getRole());
        dto.setStatus(user.getStatus());

        return dto;
    }
}