package com.microfinance.loanapp.controller;

import com.microfinance.loanapp.dto.*;
import com.microfinance.loanapp.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    // CREATE
    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(
            @RequestBody GroupCreateRequest request,
            @RequestHeader("loggedInUser") String loggedInUser) {

        return ResponseEntity.ok(
                groupService.createGroup(request, loggedInUser)
        );
    }

    // GET ALL
    @GetMapping
    public ResponseEntity<PaginatedResponse<GroupResponse>> getAllGroups(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestHeader("loggedInUser") String loggedInUser) {
        
        if (size > 50) {
            throw new com.microfinance.loanapp.exception.ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "Page size cannot exceed 50");
        }
        return ResponseEntity.ok(
                groupService.getAllGroups(page, size, search, loggedInUser)
        );
    }

    // GET GROUP MEMBERS
    @GetMapping("/{groupId}/members")
    public ResponseEntity<List<GroupMemberDto>> getGroupMembers(
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "true") boolean active,
            @RequestHeader("loggedInUser") String loggedInUser) {

        return ResponseEntity.ok(
                groupService.getGroupMembers(groupId, active, loggedInUser)
        );
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<GroupResponse> updateGroup(
            @PathVariable Long id,
            @RequestBody GroupUpdateRequest request,
            @RequestHeader("loggedInUser") String loggedInUser) {

        return ResponseEntity.ok(
                groupService.updateGroup(id, request, loggedInUser)
        );
    }
}