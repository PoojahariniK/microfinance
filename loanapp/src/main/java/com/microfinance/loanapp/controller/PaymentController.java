package com.microfinance.loanapp.controller;

import com.microfinance.loanapp.dto.*;
import com.microfinance.loanapp.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping("/collection")
    public CollectionResponse getCollection(
            @RequestParam Long groupId,
            @RequestParam Long loanId,
            @RequestParam Integer installmentNo,
            @RequestHeader("loggedInUser") String user) {

        return paymentService.getCollection(groupId, loanId, installmentNo, user);
    }

    @PostMapping("/collect")
    public String collect(
            @RequestBody CollectPaymentRequest request,
            @RequestHeader("loggedInUser") String user) {

        return paymentService.collectPayment(request, user);
    }

    @PutMapping("/edit")
    public String edit(
            @RequestBody EditPaymentRequest request,
            @RequestHeader("loggedInUser") String user) {

        return paymentService.editPayment(request, user);
    }

    @GetMapping("/history")
    public List<PaymentHistoryDto> history(@RequestParam Long loanScheduleId) {
        return paymentService.getHistory(loanScheduleId);
    }

    @GetMapping("/pending")
    public PaginatedResponse<PendingPaymentDto> getPending(
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false) String timeFilter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestHeader("loggedInUser") String user) {
        if (size > 50) {
            throw new com.microfinance.loanapp.exception.ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "Page size cannot exceed 50");
        }
        return paymentService.getPendingPayments(groupId, timeFilter, page, size, search);
    }

    @GetMapping("/pending/export")
    public List<PendingPaymentDto> getPendingExport(
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false) String timeFilter,
            @RequestParam(defaultValue = "") String search,
            @RequestHeader("loggedInUser") String user) {
        
        return paymentService.getPendingPaymentsExport(groupId, timeFilter, search);
    }
}