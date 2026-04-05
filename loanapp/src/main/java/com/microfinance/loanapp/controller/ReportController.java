package com.microfinance.loanapp.controller;

import com.microfinance.loanapp.dto.report.*;
import com.microfinance.loanapp.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/balance-sheet")
    public ResponseEntity<BalanceSheetReportDto> getBalanceSheet(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long groupId) {
        return ResponseEntity.ok(reportService.getBalanceSheet(startDate, endDate, groupId));
    }

    @GetMapping("/profit-loss")
    public ResponseEntity<ProfitLossReportDto> getProfitLoss(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long groupId,
            @RequestParam(defaultValue = "MONTHLY") String viewType) {
        return ResponseEntity.ok(reportService.getProfitLoss(startDate, endDate, groupId, viewType));
    }

    // 1. Executive Dashboard (Portfolio - NO DATE)
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardReportDto> getDashboard(
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) String status) {
        Long gId = (groupId == null || "ALL".equalsIgnoreCase(groupId)) ? null : Long.parseLong(groupId);
        return ResponseEntity.ok(reportService.getDashboardReport(gId, status));
    }

    // 1.1 Dashboard Trends (DATE BASED)
    @GetMapping("/dashboard-trends")
    public ResponseEntity<List<TrendDto>> getDashboardTrends(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String groupId) {
        Long gId = (groupId == null || "ALL".equalsIgnoreCase(groupId)) ? null : Long.parseLong(groupId);
        return ResponseEntity.ok(reportService.getDashboardTrends(startDate, endDate, gId));
    }

    // 2. Group Performance Report
    @GetMapping("/groups")
    public ResponseEntity<List<GroupPerformanceReportDto>> getGroupPerformance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) String riskLevel) {
        Long gId = (groupId == null || "ALL".equalsIgnoreCase(groupId)) ? null : Long.parseLong(groupId);
        return ResponseEntity.ok(reportService.getGroupPerformance(startDate, endDate, gId, riskLevel));
    }

    // 3. Loan Performance Report
    @GetMapping("/loans")
    public ResponseEntity<List<LoanPerformanceReportDto>> getLoanPerformance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) String status) {
        Long gId = (groupId == null || "ALL".equalsIgnoreCase(groupId)) ? null : Long.parseLong(groupId);
        return ResponseEntity.ok(reportService.getLoanPerformance(startDate, endDate, gId, status));
    }

    // 4. Member Performance Report
    @GetMapping("/members")
    public ResponseEntity<List<MemberPerformanceReportDto>> getMemberPerformance(
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) String status) {
        Long gId = (groupId == null || "ALL".equalsIgnoreCase(groupId)) ? null : Long.parseLong(groupId);
        return ResponseEntity.ok(reportService.getMemberPerformance(gId, status));
    }

    // 5. Collection / Due Report
    @GetMapping("/collection-due")
    public ResponseEntity<CollectionDueReportDto> getCollectionDue(
            @RequestParam(required = false) Long loanId,
            @RequestParam(required = false) Integer installmentNo,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(reportService.getCollectionDue(loanId, installmentNo, status));
    }

    @GetMapping("/installment-numbers")
    public ResponseEntity<List<Integer>> getInstallmentNumbers(@RequestParam Long loanId) {
        return ResponseEntity.ok(reportService.getInstallmentNumbers(loanId));
    }

    // 6. Outstanding & Overdue Report
    @GetMapping("/outstanding")
    public ResponseEntity<List<OutstandingOverdueReportDto>> getOutstandingOverdue(
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) String riskLevel,
            @RequestParam(required = false) String agingBucket) {
        Long gId = (groupId == null || "ALL".equalsIgnoreCase(groupId)) ? null : Long.parseLong(groupId);
        return ResponseEntity.ok(reportService.getOutstandingOverdue(gId, riskLevel, agingBucket));
    }

    // 7. Loan Ledger
    @GetMapping("/ledger")
    public ResponseEntity<List<LoanLedgerReportDto>> getLoanLedger(
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) Long loanId,
            @RequestParam(required = false) Long memberId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        Long gId = (groupId == null || "ALL".equalsIgnoreCase(groupId)) ? null : Long.parseLong(groupId);
        return ResponseEntity.ok(reportService.getLoanLedger(gId, loanId, memberId, startDate, endDate));
    }

    // 8. Financial Statement
    @GetMapping("/financials")
    public ResponseEntity<FinancialStatementReportDto> getFinancialStatement(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String groupId) {
        Long gId = (groupId == null || "ALL".equalsIgnoreCase(groupId)) ? null : Long.parseLong(groupId);
        return ResponseEntity.ok(reportService.getFinancialStatement(startDate, endDate, gId));
    }

    // 9. Activity (Home Dashboard Helper)
    @GetMapping("/activity")
    public ResponseEntity<ActivityReportDto> getActivity() {
        return ResponseEntity.ok(reportService.getRecentActivity());
    }
}
