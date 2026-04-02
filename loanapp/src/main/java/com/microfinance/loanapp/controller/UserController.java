package com.microfinance.loanapp.controller;

import com.microfinance.loanapp.dto.*;
import com.microfinance.loanapp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // LOGIN
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(userService.login(request));
    }

    // LOGOUT
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse> logout(
            @RequestHeader("loggedInUser") String loggedInUser) {
        return ResponseEntity.ok(userService.logout(loggedInUser));
    }

    // CREATE STAFF (ADMIN ONLY)
    @PostMapping
    public ResponseEntity<UserResponse> createStaff(
            @RequestBody UserCreateRequest request,
            @RequestHeader("loggedInUser") String loggedInUser) {

        return new ResponseEntity<>(
                userService.createStaff(request, loggedInUser),
                HttpStatus.CREATED
        );
    }

    // GET ALL USERS (ADMIN ONLY)
    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers(
            @RequestHeader("loggedInUser") String loggedInUser) {

        return ResponseEntity.ok(userService.getAllUsers(loggedInUser));
    }

    // GET USER BY USERNAME
    @GetMapping("/username/{username}")
    public ResponseEntity<UserResponse> getUserByUsername(
            @PathVariable String username,
            @RequestHeader("loggedInUser") String loggedInUser) {

        return ResponseEntity.ok(
                userService.getUserByUsername(username, loggedInUser)
        );
    }

    // UPDATE USER (ADMIN ONLY)
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long id,
            @RequestBody UserUpdateRequest request,
            @RequestHeader("loggedInUser") String loggedInUser) {

        return ResponseEntity.ok(
                userService.updateUser(id, request, loggedInUser)
        );
    }

    // DELETE USER (ADMIN ONLY)
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteUser(
            @PathVariable Long id,
            @RequestHeader("loggedInUser") String loggedInUser) {

        return ResponseEntity.ok(
                userService.deleteUser(id, loggedInUser)
        );
    }
}