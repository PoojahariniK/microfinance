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
    public ResponseEntity<List<GroupResponse>> getAllGroups(
            @RequestHeader("loggedInUser") String loggedInUser) {

        return ResponseEntity.ok(
                groupService.getAllGroups(loggedInUser)
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