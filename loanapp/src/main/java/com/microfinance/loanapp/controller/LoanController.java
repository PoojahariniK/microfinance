package com.microfinance.loanapp.controller;

import com.microfinance.loanapp.dto.*;
import com.microfinance.loanapp.service.LoanCreationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/loans")
@RequiredArgsConstructor
public class LoanController {

    private final LoanCreationService loanCreationService;

    // STEP 1: Init loan – computes member splits and theoretical end date
    @PostMapping("/init")
    public ResponseEntity<LoanDraftDto> initLoan(
            @RequestBody LoanInitRequest request,
            @RequestHeader("loggedInUser") String loggedInUser) {
        return ResponseEntity.ok(loanCreationService.initLoan(request, loggedInUser));
    }

    // STEP 2: Preview schedule – generates installment schedule from a draft
    @PostMapping("/preview-schedule")
    public ResponseEntity<List<LoanSchedulePreviewDto>> previewSchedule(
            @RequestBody LoanDraftDto draft,
            @RequestHeader("loggedInUser") String loggedInUser) {
        return ResponseEntity.ok(loanCreationService.previewSchedule(draft, loggedInUser));
    }

    // STEP 3: Confirm loan – persists loan, charges, members and schedule
    @PostMapping("/confirm")
    public ResponseEntity<String> confirmLoan(
            @RequestBody LoanConfirmRequest request,
            @RequestHeader("loggedInUser") String loggedInUser) {
        return ResponseEntity.ok(loanCreationService.confirmLoan(request, loggedInUser));
    }

    // STEP 4a: Preview – compute schedule for new member (no DB save)
    @PostMapping("/{loanId}/add-member/preview")
    public ResponseEntity<AddMemberPreviewResponse> previewAddMember(
            @PathVariable Long loanId,
            @RequestBody AddMemberRequest request,
            @RequestHeader("loggedInUser") String loggedInUser) {
        return ResponseEntity.ok(loanCreationService.previewAddMember(loanId, request.getMemberId(), loggedInUser));
    }

    // STEP 4b: Confirm – validate edited schedule and persist
    @PostMapping("/{loanId}/add-member/confirm")
    public ResponseEntity<AddMemberResponse> confirmAddMember(
            @PathVariable Long loanId,
            @RequestBody AddMemberConfirmRequest request,
            @RequestHeader("loggedInUser") String loggedInUser) {
        return ResponseEntity.ok(loanCreationService.confirmAddMember(loanId, request, loggedInUser));
    }

    @GetMapping("/summary")
    public ResponseEntity<List<LoanSummaryResponse>> getGlobalSummary() {
        return ResponseEntity.ok(loanCreationService.getLoanSummaryByGroup(null, null));
    }

    @GetMapping({"/group/{groupId}/summary", "/group/{groupId}/loan/{loanId}/summary"})
    public ResponseEntity<List<LoanSummaryResponse>> getLoanSummaryByGroup(
            @PathVariable Long groupId,
            @PathVariable(required = false) Long loanId) {
        return ResponseEntity.ok(loanCreationService.getLoanSummaryByGroup(groupId, loanId));
    }

    @GetMapping("/group/{groupId}/loan/{loanId}/schedules")
    public ResponseEntity<List<LoanScheduleGroupResponse>> getLoanScheduleByGroup(
            @PathVariable Long groupId,
            @PathVariable Long loanId) {
        return ResponseEntity.ok(loanCreationService.getLoanScheduleByGroup(groupId, loanId));
    }

    @GetMapping("/group/{groupId}/loan/{loanId}/member/{memberId}/schedules")
    public ResponseEntity<List<MemberScheduleDto>> getScheduleByMember(
            @PathVariable Long groupId,
            @PathVariable Long loanId,
            @PathVariable Long memberId) {
        return ResponseEntity.ok(loanCreationService.getScheduleByMember(groupId, loanId, memberId));
    }

    @PutMapping("/schedules/edit")
    public ResponseEntity<String> editSchedule(
            @RequestBody EditLoanScheduleRequest request,
            @RequestHeader("loggedInUser") String loggedInUser) {
        return ResponseEntity.ok(loanCreationService.editSchedule(request, loggedInUser));
    }

    @PutMapping("/edit/{loanId}")
    public ResponseEntity<String> editLoan(
            @PathVariable Long loanId,
            @RequestBody EditLoanRequest request,
            @RequestHeader("loggedInUser") String loggedInUser) {
        return ResponseEntity.ok(loanCreationService.editLoan(loanId, request, loggedInUser));
    }

    @PutMapping("/schedules/member/edit")
    public ResponseEntity<String> editMemberSchedule(
            @RequestBody EditMemberScheduleRequest request,
            @RequestHeader("loggedInUser") String loggedInUser) {
        return ResponseEntity.ok(loanCreationService.editMemberSchedule(request, loggedInUser));
    }

    @GetMapping("/member/{memberId}/active-loan/exists")
    public ResponseEntity<Boolean> hasActiveLoan(@PathVariable Long memberId) {
        return ResponseEntity.ok(loanCreationService.hasActiveLoan(memberId));
    }

    @PostMapping("/{loanId}/charges/pay")
    public ResponseEntity<String> payCharge(
            @PathVariable Long loanId,
            @RequestBody ChargePaymentRequest request,
            @RequestHeader("loggedInUser") String loggedInUser) {
        return ResponseEntity.ok(loanCreationService.payCharge(loanId, request, loggedInUser));
    }

    @GetMapping("/{loanId}/charges/status")
    public ResponseEntity<ChargeStatusResponse> getChargeStatus(@PathVariable Long loanId) {
        return ResponseEntity.ok(loanCreationService.getChargeStatus(loanId));
    }

    @GetMapping("/{loanId}/charges/payments")
    public ResponseEntity<List<ChargePaymentMemberDto>> getMembersWhoPaid(@PathVariable Long loanId) {
        return ResponseEntity.ok(loanCreationService.getMembersWhoPaid(loanId));
    }
}
