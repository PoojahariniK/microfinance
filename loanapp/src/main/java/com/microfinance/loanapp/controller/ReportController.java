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

    // API 1: Summary Dashboard
    @GetMapping("/summary")
    public ResponseEntity<SummaryReportDto> getSummary() {
        return ResponseEntity.ok(reportService.getSummary());
    }

    // API 2: Due-Wise Report
    @GetMapping("/due-wise")
    public ResponseEntity<DueWiseReportDto> getDueWiseReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(reportService.getDueWiseReport(date));
    }

    // API 3: Pending Report
    @GetMapping("/pending")
    public ResponseEntity<List<PendingReportDto>> getPendingReport(
            @RequestParam(required = false) String groupId) {
        Long id = (groupId == null || "ALL".equalsIgnoreCase(groupId)) ? null : Long.parseLong(groupId);
        return ResponseEntity.ok(reportService.getPendingReport(id));
    }

    // API 4: Member Report
    @GetMapping("/member/{memberId}")
    public ResponseEntity<MemberReportDto> getMemberReport(
            @PathVariable Long memberId) {
        return ResponseEntity.ok(reportService.getMemberReport(memberId));
    }

    // API 5: Group Report
    @GetMapping("/group/{groupId}")
    public ResponseEntity<GroupReportDto> getGroupReport(
            @PathVariable Long groupId) {
        return ResponseEntity.ok(reportService.getGroupReport(groupId));
    }

    @GetMapping("/groups")
    public ResponseEntity<List<GroupReportDto>> getAllGroupsReport() {
        return ResponseEntity.ok(reportService.getAllGroupsReport());
    }

    // API 6: Interest Report
    @GetMapping("/interest")
    public ResponseEntity<InterestReportDto> getInterestReport() {
        return ResponseEntity.ok(reportService.getInterestReport());
    }

    // API 7: Loan History
    @GetMapping("/loan-history")
    public ResponseEntity<List<LoanHistoryDto>> getLoanHistory(
            @RequestParam(required = false) String groupId) {
        Long id = (groupId == null || "ALL".equalsIgnoreCase(groupId)) ? null : Long.parseLong(groupId);
        return ResponseEntity.ok(reportService.getLoanHistory(id));
    }

    // API 8a: Weekly Report
    @GetMapping("/weekly")
    public ResponseEntity<PeriodReportDto> getWeeklyReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate) {
        return ResponseEntity.ok(reportService.getWeeklyReport(startDate));
    }

    // API 8: Trend Report (Last 6 Months)
    @GetMapping("/trend")
    public ResponseEntity<List<PeriodReportDto>> getTrend() {
        return ResponseEntity.ok(reportService.getTrendReport());
    }

    // API 8b: Monthly Report
    @GetMapping("/monthly")
    public ResponseEntity<PeriodReportDto> getMonthlyReport(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        if (year == null) year = LocalDate.now().getYear();
        if (month == null) month = LocalDate.now().getMonthValue();
        return ResponseEntity.ok(reportService.getMonthlyReport(year, month));
    }

    // API 8c: Yearly Report
    @GetMapping("/yearly")
    public ResponseEntity<PeriodReportDto> getYearlyReport(
            @RequestParam int year) {
        return ResponseEntity.ok(reportService.getYearlyReport(year));
    }

    // API 9: P&L Report
    @GetMapping("/pnl")
    public ResponseEntity<PnlReportDto> getPnlReport() {
        return ResponseEntity.ok(reportService.getPnlReport());
    }

    // API 10: Recent Activity
    @GetMapping("/activity")
    public ResponseEntity<ActivityReportDto> getActivity() {
        return ResponseEntity.ok(reportService.getRecentActivity());
    }
}
