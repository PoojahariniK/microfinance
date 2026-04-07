package com.microfinance.loanapp.controller;

import com.microfinance.loanapp.dto.*;
import com.microfinance.loanapp.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    // CREATE (ADMIN ONLY)
    @PostMapping(consumes = {"multipart/form-data"})
    public MemberResponse createMember(
            @RequestPart("member") CreateMemberRequest request,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file,
            @RequestHeader("loggedInUser") String loggedInUser) {

        return memberService.createMember(request, file, loggedInUser);
    }

    // UPDATE (ADMIN ONLY)
    @PutMapping(value = "/{id}", consumes = {"multipart/form-data"})
    public MemberResponse updateMember(
            @PathVariable Long id,
            @RequestPart("member") UpdateMemberRequest request,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file,
            @RequestHeader("loggedInUser") String loggedInUser) {

        return memberService.updateMember(id, request, file, loggedInUser);
    }

    @GetMapping
    public PaginatedResponse<MemberResponse> getAllMembers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestHeader("loggedInUser") String loggedInUser) {
        
        if (size > 50) {
            throw new com.microfinance.loanapp.exception.ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "Page size cannot exceed 50");
        }
        return memberService.getAllMembers(page, size, search, loggedInUser);
    }

    // GET BY ID
    @GetMapping("/{id}")
    public MemberResponse getMemberById(
            @PathVariable Long id,
            @RequestHeader("loggedInUser") String loggedInUser) {

        return memberService.getMemberById(id, loggedInUser);
    }

    // GET BY GROUP
    @GetMapping("/group/{groupId}")
    public PaginatedResponse<MemberResponse> getMembersByGroup(
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestHeader("loggedInUser") String loggedInUser) {
        
        if (size > 50) {
            throw new com.microfinance.loanapp.exception.ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "Page size cannot exceed 50");
        }
        return memberService.getMembersByGroup(groupId, page, size, search, loggedInUser);
    }



    @PostMapping("/group/{groupId}/add/{memberId}")
    public ApiResponse addMemberToGroup(
            @PathVariable Long groupId,
            @PathVariable Long memberId,
            @RequestHeader("loggedInUser") String loggedInUser) {

        return memberService.addMemberToGroup(groupId, memberId, loggedInUser);
    }

    @DeleteMapping("/group/{groupId}/remove/{memberId}")
    public ApiResponse removeMemberFromGroup(
            @PathVariable Long groupId,
            @PathVariable Long memberId,
            @RequestHeader("loggedInUser") String loggedInUser) {

        return memberService.removeMemberFromGroup(groupId, memberId, loggedInUser);
    }
}