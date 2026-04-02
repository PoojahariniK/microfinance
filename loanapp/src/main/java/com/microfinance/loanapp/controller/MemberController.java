package com.microfinance.loanapp.controller;

import com.microfinance.loanapp.dto.*;
import com.microfinance.loanapp.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    // GET ALL
    @GetMapping
    public List<MemberResponse> getAllMembers(
            @RequestHeader("loggedInUser") String loggedInUser) {

        return memberService.getAllMembers(loggedInUser);
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
    public List<MemberResponse> getMembersByGroup(
            @PathVariable Long groupId,
            @RequestHeader("loggedInUser") String loggedInUser) {

        return memberService.getMembersByGroup(groupId, loggedInUser);
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