package com.microfinance.loanapp.service;

import com.microfinance.loanapp.dto.report.*;
import com.microfinance.loanapp.enums.LoanStatus;
import com.microfinance.loanapp.enums.PaymentStatus;
import com.microfinance.loanapp.exception.ApiException;
import com.microfinance.loanapp.model.*;
import com.microfinance.loanapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final ReportScheduleRepository scheduleRepo;
    private final ReportPaymentRepository paymentRepo;
    private final ReportLoanMemberRepository loanMemberRepo;
    private final LoanRepository loanRepository;
    private final GroupRepository groupRepository;
    private final MemberRepository memberRepository;

    // ─── HELPER ──────────────────────────────────────────────────────────────

    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private Group requireGroup(Long groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Group not found: " + groupId));
    }

    private Member requireMember(Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Member not found: " + memberId));
    }

    // ─── API 1: SUMMARY ──────────────────────────────────────────────────────

    public SummaryReportDto getSummary() {
        double totalDisbursed   = round(loanMemberRepo.sumTotalDisbursed());
        double totalCollection  = round(paymentRepo.sumTotalCollection());
        double interestCollected = round(scheduleRepo.sumInterestCollected());
        double pendingAmount    = round(scheduleRepo.sumPendingAmount());
        long totalLoans  = loanRepository.count();
        long activeLoans = loanRepository.findAll().stream()
                .filter(l -> l.getStatus() == LoanStatus.ACTIVE).count();
        long totalGroups = groupRepository.count();
        long totalMembers = memberRepository.count();

        return new SummaryReportDto(
                totalDisbursed, totalCollection, interestCollected,
                pendingAmount, totalLoans, activeLoans,
                totalGroups, totalMembers
        );
    }

    // ─── API 2: DUE-WISE ─────────────────────────────────────────────────────

    public DueWiseReportDto getDueWiseReport(LocalDate date) {
        if (date == null) throw new ApiException(HttpStatus.BAD_REQUEST, "date is required");

        List<LoanSchedule> schedules = scheduleRepo.findByDueDateWithDetails(date);

        double totalDue       = round(schedules.stream().mapToDouble(LoanSchedule::getTotal).sum());
        double totalCollected = round(schedules.stream()
                .mapToDouble(s -> s.getPaidAmount() != null ? s.getPaidAmount() : 0.0).sum());
        double pending        = round(totalDue - totalCollected);

        List<DueWiseMemberDto> members = schedules.stream().map(s -> {
            LoanMember lm = s.getLoanMember();
            return new DueWiseMemberDto(
                    lm.getMember().getName(),
                    lm.getLoan().getGroup().getGroupName(),
                    lm.getLoan().getId(),
                    s.getInstallmentNo(),
                    round(s.getPrincipal()),
                    round(s.getInterest()),
                    round(s.getTotal()),
                    round(s.getPaidAmount() != null ? s.getPaidAmount() : 0.0),
                    s.getStatus().name()
            );
        }).collect(Collectors.toList());

        return new DueWiseReportDto(date, totalDue, totalCollected, pending, members);
    }

    // ─── API 3: PENDING REPORT ────────────────────────────────────────────────

    public List<PendingReportDto> getPendingReport(Long groupId) {
        List<LoanSchedule> unpaid;
        if (groupId == null) {
            unpaid = scheduleRepo.findAll().stream()
                    .filter(s -> s.getStatus() != PaymentStatus.PAID)
                    .collect(Collectors.toList());
        } else {
            requireGroup(groupId);
            unpaid = scheduleRepo.findUnpaidByGroupId(groupId);
        }

        // Group by LoanMember
        Map<LoanMember, List<LoanSchedule>> byMember = unpaid.stream()
                .collect(Collectors.groupingBy(LoanSchedule::getLoanMember));

        return byMember.entrySet().stream().map(e -> {
            LoanMember lm = e.getKey();
            List<LoanSchedule> list = e.getValue();

            double pendingAmt = round(list.stream()
                    .mapToDouble(s -> s.getTotal() - (s.getPaidAmount() != null ? s.getPaidAmount() : 0.0))
                    .sum());

            // Count ALL pending installments for the member
            int pendingDuesCount = list.size(); 

            return new PendingReportDto(
                    lm.getMember().getName(),
                    lm.getLoan().getId(),
                    pendingAmt,
                    pendingDuesCount
            );
        }).collect(Collectors.toList());
    }

    // ─── API 4: MEMBER REPORT ─────────────────────────────────────────────────

    public MemberReportDto getMemberReport(Long memberId) {
        Member member = requireMember(memberId);

        List<LoanMember> loanMembers = loanMemberRepo.findByMemberIdWithLoan(memberId);
        if (loanMembers.isEmpty()) {
            return new MemberReportDto(member.getName(), 0.0, 0.0, 0.0, Collections.emptyList());
        }

        // All schedules for this member
        List<LoanSchedule> allSchedules = scheduleRepo.findByMemberId(memberId);

        // Payments per loanId (from payment repo)
        List<Object[]> payRows = paymentRepo.sumCollectionGroupedByLoanForMember(memberId);
        Map<Long, Double> paidByLoan = new HashMap<>();
        for (Object[] row : payRows) {
            paidByLoan.put((Long) row[0], (Double) row[1]);
        }

        // Total per loanId (total schedule amounts)
        Map<Long, Double> totalByLoan = allSchedules.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getLoanMember().getLoan().getId(),
                        Collectors.summingDouble(LoanSchedule::getTotal)
                ));

        List<MemberLoanSummaryDto> loans = loanMembers.stream().map(lm -> {
            Long loanId  = lm.getLoan().getId();
            double paid  = round(paidByLoan.getOrDefault(loanId, 0.0));
            double total = round(totalByLoan.getOrDefault(loanId, 0.0));
            return new MemberLoanSummaryDto(loanId, paid, round(total - paid));
        }).collect(Collectors.toList());

        double totalLoan = round(loans.stream().mapToDouble(x -> x.getPaid() + x.getPending()).sum());
        double paid      = round(loans.stream().mapToDouble(MemberLoanSummaryDto::getPaid).sum());
        double pending   = round(loans.stream().mapToDouble(MemberLoanSummaryDto::getPending).sum());

        return new MemberReportDto(member.getName(), totalLoan, paid, pending, loans);
    }

    // ─── API 5: GROUP REPORT ──────────────────────────────────────────────────

    public GroupReportDto getGroupReport(Long groupId) {
        Group group = requireGroup(groupId);

        double totalLoan   = round(loanMemberRepo.sumDisbursedByGroup(groupId));
        double collection  = round(paymentRepo.sumCollectionByGroup(groupId));
        double pending     = round(scheduleRepo.findByGroupId(groupId).stream()
                .mapToDouble(s -> s.getStatus() != PaymentStatus.PAID
                        ? s.getTotal() - (s.getPaidAmount() != null ? s.getPaidAmount() : 0.0)
                        : 0.0)
                .sum());
        int memberCount = loanMemberRepo.countDistinctMembersByGroup(groupId);

        return new GroupReportDto(group.getGroupName(), totalLoan, collection, round(pending), memberCount);
    }

    public List<GroupReportDto> getAllGroupsReport() {
        return groupRepository.findAll().stream()
                .map(g -> getGroupReport(g.getId()))
                .collect(Collectors.toList());
    }

    // ─── API 6: INTEREST REPORT ───────────────────────────────────────────────

    public InterestReportDto getInterestReport() {
        return new InterestReportDto(round(scheduleRepo.sumInterestCollected()));
    }

    // ─── API 7: LOAN HISTORY ──────────────────────────────────────────────────

    public List<LoanHistoryDto> getLoanHistory(Long groupId) {
        List<Loan> loans;
        if (groupId == null) {
            loans = loanRepository.findAll();
        } else {
            requireGroup(groupId);
            loans = loanRepository.findByGroup_Id(groupId);
        }

        return loans.stream().map(loan -> {
            double totalLoan  = round(loanMemberRepo.sumDisbursedByLoan(loan.getId()));
            double collected  = round(paymentRepo.sumCollectionByLoan(loan.getId()));
            List<LoanSchedule> schedules = scheduleRepo.findByLoanId(loan.getId());
            double pending = round(schedules.stream()
                    .mapToDouble(s -> s.getStatus() != PaymentStatus.PAID
                            ? s.getTotal() - (s.getPaidAmount() != null ? s.getPaidAmount() : 0.0)
                            : 0.0)
                    .sum());
            return new LoanHistoryDto(
                    loan.getId(), loan.getStatus().name(),
                    loan.getStartDate(), loan.getEndDate(),
                    totalLoan, collected, pending
            );
        }).collect(Collectors.toList());
    }

    // ─── API 8: TIME-BASED REPORTS ────────────────────────────────────────────

    public PeriodReportDto getWeeklyReport(LocalDate startDate) {
        if (startDate == null) throw new ApiException(HttpStatus.BAD_REQUEST, "startDate is required");
        LocalDate endDate = startDate.plusDays(6);
        return buildPeriodReport("Week of " + startDate, startDate, endDate);
    }

    public PeriodReportDto getMonthlyReport(int year, int month) {
        if (month < 1 || month > 12) throw new ApiException(HttpStatus.BAD_REQUEST, "month must be 1–12");
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to   = from.withDayOfMonth(from.lengthOfMonth());
        return buildPeriodReport(year + "-" + String.format("%02d", month), from, to);
    }

    public PeriodReportDto getYearlyReport(int year) {
        LocalDate from = LocalDate.of(year, 1, 1);
        LocalDate to   = LocalDate.of(year, 12, 31);
        return buildPeriodReport(String.valueOf(year), from, to);
    }

    public List<PeriodReportDto> getTrendReport() {
        List<PeriodReportDto> trend = new ArrayList<>();
        LocalDate now = LocalDate.now();
        for (int i = 5; i >= 0; i--) {
            LocalDate month = now.minusMonths(i);
            LocalDate from = month.withDayOfMonth(1);
            LocalDate to   = from.withDayOfMonth(from.lengthOfMonth());
            trend.add(buildPeriodReport(month.getMonth().name().substring(0, 3) + " " + month.getYear(), from, to));
        }
        return trend;
    }

    private PeriodReportDto buildPeriodReport(String label, LocalDate from, LocalDate to) {
        double collection    = round(paymentRepo.sumCollectionInPeriod(from, to));
        double interest      = round(scheduleRepo.sumInterestInPeriod(from, to));
        double loanDisbursed = round(loanMemberRepo.sumDisbursedInPeriod(from, to));
        double pending       = round(scheduleRepo.sumPendingInPeriod(from, to));
        return new PeriodReportDto(label, collection, interest, loanDisbursed, pending);
    }

    // ─── API 9: P&L ───────────────────────────────────────────────────────────

    public PnlReportDto getPnlReport() {
        double interestIncome  = round(scheduleRepo.sumTotalInterestIncome());
        double fineCollection  = 0.0;
        double insuranceFees   = 0.0;
        double totalRevenue    = round(interestIncome + fineCollection + insuranceFees);
        double totalDisbursed  = round(loanMemberRepo.sumTotalDisbursed());
        double totalCollection = round(paymentRepo.sumTotalCollection());
        double pendingAmount   = round(scheduleRepo.sumTotalPending());

        return new PnlReportDto(
                interestIncome, fineCollection, insuranceFees,
                totalRevenue, totalDisbursed, totalCollection, pendingAmount
        );
    }

    public ActivityReportDto getRecentActivity() {
        List<LoanPayment> recentPayments = paymentRepo.findAll().stream()
                .sorted((p1, p2) -> p2.getId().compareTo(p1.getId()))
                .limit(10)
                .toList();

        List<Loan> recentLoans = loanRepository.findAll().stream()
                .sorted((l1, l2) -> l2.getId().compareTo(l1.getId()))
                .limit(10)
                .toList();

        List<ActivityReportDto.RecentPaymentDto> paymentDtos = recentPayments.stream()
                .map(p -> new ActivityReportDto.RecentPaymentDto(
                        p.getLoanSchedule().getLoanMember().getMember().getName(),
                        round(p.getAmount()),
                        p.getPaymentDate()
                ))
                .toList();

        List<ActivityReportDto.RecentLoanDto> loanDtos = recentLoans.stream()
                .map(l -> new ActivityReportDto.RecentLoanDto(
                        l.getId(),
                        l.getGroup().getGroupName(),
                        l.getStartDate()
                ))
                .toList();

        return new ActivityReportDto(paymentDtos, loanDtos);
    }
}
