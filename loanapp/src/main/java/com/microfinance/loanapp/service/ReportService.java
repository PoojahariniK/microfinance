package com.microfinance.loanapp.service;

import com.microfinance.loanapp.dto.report.*;
import com.microfinance.loanapp.enums.LoanStatus;
import com.microfinance.loanapp.enums.PaymentStatus;
import com.microfinance.loanapp.model.*;
import com.microfinance.loanapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
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
    private final MemberGroupRepository memberGroupRepository;
    private final LoanChargePaymentRepository chargePaymentRepo;
    private final CapitalLedgerRepository capitalLedgerRepository;

    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    // --- 1. Dashboard (Portfolio Metrics - NO DATE) ---
    public DashboardReportDto getDashboardReport(Long groupId, String status) {
        LoanStatus loanStatus = (status == null || status.equalsIgnoreCase("ALL")) ? null : LoanStatus.valueOf(status.toUpperCase());
        
        double disbursed = loanMemberRepo.sumDisbursedWithFilters(groupId, loanStatus);
        double collected = paymentRepo.sumCollectionWithFilters(groupId, loanStatus);
        double interestEarned = scheduleRepo.sumInterestWithFilters(groupId, loanStatus);
        double totalInterestExpected = scheduleRepo.sumTotalInterestExpectedWithFilters(groupId, loanStatus);
        
        double outstanding = round(disbursed + totalInterestExpected - collected);
        double collectionEfficiency = (disbursed + totalInterestExpected) > 0 
                ? (collected / (disbursed + totalInterestExpected)) * 100 : 0;
        
        List<Loan> loans = loanRepository.findAll();
        if (groupId != null) loans = loans.stream().filter(l -> l.getGroup().getId().equals(groupId)).toList();
        if (loanStatus != null) {
            loans = loans.stream().filter(l -> l.getStatus() == loanStatus).toList();
        }
        
        long active = loans.stream().filter(l -> l.getStatus() == LoanStatus.ACTIVE).count();
        long closed = loans.stream().filter(l -> l.getStatus() == LoanStatus.CLOSED).count();

        LocalDate now = LocalDate.now();
        // Count High Risk (Defaulters with > 3 overdue)
        List<Long> lIds = loans.stream().map(Loan::getId).toList();
        long highRiskCount = lIds.isEmpty() ? 0 : scheduleRepo.findAll().stream()
            .filter(s -> lIds.contains(s.getLoanMember().getLoan().getId()) && s.getStatus() != PaymentStatus.PAID && s.getDueDate().isBefore(now))
            .collect(Collectors.groupingBy(LoanSchedule::getLoanMember))
            .values().stream().filter(list -> list.size() > 3).count();
        
        double overdueAmount = lIds.isEmpty() ? 0 : scheduleRepo.findAll().stream()
            .filter(s -> lIds.contains(s.getLoanMember().getLoan().getId()))
            .filter(s -> s.getStatus() != PaymentStatus.PAID)
            .filter(s -> s.getDueDate().isBefore(now))
            .mapToDouble(s -> s.getTotal() - (s.getPaidAmount() != null ? s.getPaidAmount() : 0))
            .sum();

        double totalPending = lIds.isEmpty() ? 0 : scheduleRepo.findAll().stream()
                .filter(s -> lIds.contains(s.getLoanMember().getLoan().getId()))
                .mapToDouble(s -> s.getTotal() - (s.getPaidAmount() != null ? s.getPaidAmount() : 0.0))
                .sum();

        double overduePercentage = totalPending > 0 ? (overdueAmount / totalPending) * 100 : 0;
        
        long totalGroups = loans.stream()
            .map(l -> l.getGroup().getId())
            .distinct()
            .count();

        long totalMembers = loanMemberRepo.findAll().stream()
            .filter(lm -> lIds.contains(lm.getLoan().getId()))
            .map(lm -> lm.getMember().getId())
            .distinct()
            .count();

        // Trends (Last 6 months)
        LocalDate trendStart = now.minusMonths(5).withDayOfMonth(1);
        List<TrendDto> trends = getDashboardTrends(trendStart, now.withDayOfMonth(now.lengthOfMonth()), groupId);

        // Upcoming (Next 5 Days)
        LocalDate upcomingEnd = now.plusDays(5);
        List<UpcomingInstallmentDto> upcoming = scheduleRepo.findAll().stream()
                .filter(s -> groupId == null || s.getLoanMember().getLoan().getGroup().getId().equals(groupId))
                .filter(s -> s.getStatus() != PaymentStatus.PAID && !s.getDueDate().isBefore(now) && !s.getDueDate().isAfter(upcomingEnd))
                .collect(Collectors.groupingBy(s -> s.getLoanMember().getLoan().getGroup().getGroupName() + "|" + s.getInstallmentNo() + "|" + s.getDueDate()))
                .entrySet().stream().map(entry -> {
                    String[] parts = entry.getKey().split("\\|");
                    return new UpcomingInstallmentDto(parts[0], Integer.parseInt(parts[1]), LocalDate.parse(parts[2]), entry.getValue().size());
                })
                .sorted(Comparator.comparing(UpcomingInstallmentDto::getDueDate))
                .limit(5)
                .collect(Collectors.toList());

        return new DashboardReportDto(
            round(disbursed),
            round(collected),
            round(outstanding),
            round(interestEarned),
            totalGroups,
            totalMembers,
            active,
            closed,
            round(collectionEfficiency),
            round(overduePercentage),
            (int) highRiskCount,
            trends,
            upcoming
        );
    }

    // --- 1.1 Dashboard Trends (Period Based) ---
    public List<TrendDto> getDashboardTrends(LocalDate startDate, LocalDate endDate, Long groupId) {
        List<Loan> allLoans = loanRepository.findAll();
        if (groupId != null) allLoans = allLoans.stream().filter(l -> l.getGroup().getId().equals(groupId)).toList();
        List<Long> lIds = allLoans.stream().map(Loan::getId).toList();

        List<TrendDto> trends = new ArrayList<>();
        if (startDate == null || endDate == null) return trends;

        // Iterate through months in the range
        LocalDate current = startDate.withDayOfMonth(1);
        while (!current.isAfter(endDate)) {
            LocalDate start = current;
            LocalDate end = current.withDayOfMonth(current.lengthOfMonth());

            double d = lIds.isEmpty() ? 0 : loanMemberRepo.findAll().stream()
                    .filter(lm -> lIds.contains(lm.getLoan().getId()))
                    .filter(lm -> isWithin(lm.getLoan().getStartDate(), start, end))
                    .mapToDouble(LoanMember::getPrincipalAmount).sum();

            double c = lIds.isEmpty() ? 0 : paymentRepo.findAll().stream()
                    .filter(p -> lIds.contains(p.getLoanSchedule().getLoanMember().getLoan().getId()))
                    .filter(p -> isWithin(p.getPaymentDate(), start, end))
                    .mapToDouble(LoanPayment::getAmount).sum();

            double i = lIds.isEmpty() ? 0 : paymentRepo.findAll().stream()
                    .filter(p -> lIds.contains(p.getLoanSchedule().getLoanMember().getLoan().getId()))
                    .filter(p -> isWithin(p.getPaymentDate(), start, end))
                    .mapToDouble(p -> p.getLoanSchedule().getInterest() * (p.getAmount() / p.getLoanSchedule().getTotal()))
                    .sum();

            double p = lIds.isEmpty() ? 0 : scheduleRepo.findAll().stream()
                    .filter(s -> lIds.contains(s.getLoanMember().getLoan().getId()))
                    .filter(s -> isWithin(s.getDueDate(), start, end))
                    .mapToDouble(s -> s.getTotal() - (s.getPaidAmount() != null ? s.getPaidAmount() : 0))
                    .sum();

            trends.add(new TrendDto(
                    current.getMonth().name().substring(0, 3) + " " + current.getYear(),
                    round(d), round(c), round(i), round(p)
            ));

            current = current.plusMonths(1);
        }
        return trends;
    }


    // --- 2. Group Performance ---
    public List<GroupPerformanceReportDto> getGroupPerformance(LocalDate startDate, LocalDate endDate, Long groupId, String riskLevel) {
        List<Group> groups = groupId == null ? groupRepository.findAll() : List.of(groupRepository.findById(groupId).orElseThrow());
        
        return groups.stream().map(g -> {
            List<Loan> groupLoans = loanRepository.findByGroup_Id(g.getId());
            double grpTotal = 0;
            double grpCollected = 0;
            double grpPending = 0;
            int activeCnt = 0;
            List<GroupPerformanceReportDto.LoanDetailDto> ldtos = new ArrayList<>();
            for (Loan l : groupLoans) {
            if (startDate != null && l.getEndDate().isBefore(startDate)) continue;
            // The constraint should be: Has the loan started on or before the end date?
            // AND: Is it still active (not yet finished) or finished after the start date?
            // If the user selects a range including 13/4/2026, we should NOT skip a loan starting on 13/4/2026.
            if (endDate != null && l.getStartDate().isAfter(endDate)) continue;
                if (l.getStatus() == LoanStatus.ACTIVE) activeCnt++;
                
                double lDisbursed = loanMemberRepo.sumDisbursedByLoan(l.getId());
                double lCollected = paymentRepo.sumCollectionByLoan(l.getId());
                double lInterest = scheduleRepo.findByLoanId(l.getId()).stream().mapToDouble(LoanSchedule::getInterest).sum();
                double lTotal = round(lDisbursed + lInterest);
                double lPending = round(lTotal - lCollected);
                
                grpTotal += lTotal;
                grpCollected += lCollected;
                grpPending += lPending;
                
                ldtos.add(new GroupPerformanceReportDto.LoanDetailDto(l.getId(), lTotal, round(lCollected), lPending, l.getStatus().name()));
            }
            double pct = grpTotal > 0 ? (grpCollected / grpTotal) * 100 : 0;
            String risk = pct > 90 ? "LOW" : (pct > 70 ? "MEDIUM" : "HIGH");
            
            return new GroupPerformanceReportDto(g.getGroupName(), memberGroupRepository.findByGroup_IdAndStatus(g.getId(), com.microfinance.loanapp.enums.MemberStatus.ACTIVE).size(), activeCnt, round(grpTotal), round(grpCollected), round(grpPending), round(pct), risk, ldtos);
        }).filter(g -> riskLevel == null || riskLevel.equalsIgnoreCase("ALL") || g.getRiskLevel().equalsIgnoreCase(riskLevel)).toList();
    }

    // --- 3. Loan Performance ---
    public List<LoanPerformanceReportDto> getLoanPerformance(LocalDate startDate, LocalDate endDate, Long groupId, String status) {
        List<Loan> loans = loanRepository.findAll();
        if (groupId != null) loans = loans.stream().filter(l -> l.getGroup().getId().equals(groupId)).toList();
        if (status != null && !status.equalsIgnoreCase("ALL")) loans = loans.stream().filter(l -> l.getStatus().name().equalsIgnoreCase(status)).toList();
        
        return loans.stream().filter(l -> {
            if (startDate != null && l.getEndDate().isBefore(startDate)) return false;
            if (endDate != null && l.getStartDate().isAfter(endDate.plusDays(1))) return false;
            return true;
        }).map(l -> {
            double lDisbursed = loanMemberRepo.sumDisbursedByLoan(l.getId());
            double lCollected = paymentRepo.sumCollectionByLoan(l.getId());
            double lInterest = scheduleRepo.findByLoanId(l.getId()).stream().mapToDouble(LoanSchedule::getInterest).sum();
            double lTotal = round(lDisbursed + lInterest);
            double lPending = round(lTotal - lCollected);
            double pct = lTotal > 0 ? (lCollected / lTotal) * 100 : 0;
            
            return new LoanPerformanceReportDto(
                l.getId(), l.getGroup().getGroupName(), l.getStartDate(), l.getEndDate(),
                lTotal, round(lCollected), lPending, round(pct), l.getStatus().name()
            );
        }).toList();
    }

    // --- 4. Member Performance ---
    public List<MemberPerformanceReportDto> getMemberPerformance(Long groupId, String status) {
        List<Member> members = memberRepository.findAll();
        
        return members.stream().map(m -> {
            List<LoanMember> lms = loanMemberRepo.findByMemberIdWithLoan(m.getId());
            if (groupId != null) lms = lms.stream().filter(lm -> lm.getLoan().getGroup().getId().equals(groupId)).toList();
            if (lms.isEmpty()) return null;
            
            String groupName = lms.get(0).getLoan().getGroup().getGroupName();
            int active = 0;
            double mTot = 0, mPaid = 0, mPend = 0;
            int mOverdues = 0;
            List<MemberPerformanceReportDto.MemberLoanDetailDto> ldtos = new ArrayList<>();
            LocalDate today = LocalDate.now();
            
            for (LoanMember lm : lms) {
                if (lm.getLoan().getStatus() == LoanStatus.ACTIVE) active++;
                List<LoanSchedule> schs = scheduleRepo.findByLoanId(lm.getLoan().getId()).stream().filter(s -> s.getLoanMember().getId().equals(lm.getId())).toList();
                
                double lTotal = schs.stream().mapToDouble(LoanSchedule::getTotal).sum();
                double lPaid = schs.stream().mapToDouble(s -> s.getPaidAmount() != null ? s.getPaidAmount() : 0.0).sum();
                double lPend = round(lTotal - lPaid);
                int overdues = (int) schs.stream().filter(s -> s.getDueDate().isBefore(today) && s.getStatus() != PaymentStatus.PAID).count();
                
                mTot += lTotal; mPaid += lPaid; mPend += lPend; mOverdues += overdues;
                ldtos.add(new MemberPerformanceReportDto.MemberLoanDetailDto(lm.getLoan().getId(), round(lTotal), round(lPaid), lPend, overdues, lm.getLoan().getStatus().name()));
            }
            
            String st = mOverdues == 0 ? "GOOD" : (mOverdues > 3 ? "DEFAULT" : "RISK");
            if (status != null && !status.equalsIgnoreCase("ALL") && !status.equalsIgnoreCase(st)) return null;
            
            return new MemberPerformanceReportDto(m.getName(), groupName, active, round(mTot), round(mPaid), round(mPend), mOverdues, st, ldtos);
        }).filter(Objects::nonNull).toList();
    }

    // --- 5. Collection Due ---
    public CollectionDueReportDto getCollectionDue(Long loanId, Integer installmentNo, String status) {
        List<LoanSchedule> schs;
        if (loanId != null) {
            schs = scheduleRepo.findByLoanIdWithDetails(loanId);
            if (installmentNo != null) {
                schs = schs.stream().filter(s -> s.getInstallmentNo() == installmentNo).toList();
            }
        } else {
            // Fallback: all today's dues
            schs = scheduleRepo.findByDueDateWithDetails(LocalDate.now());
        }

        double planned = 0, collected = 0;
        List<CollectionDueReportDto.InstallmentDto> insts = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (LoanSchedule s : schs) {
            planned += s.getTotal();
            double p = s.getPaidAmount() != null ? s.getPaidAmount() : 0.0;
            collected += p;
            
            String st = "UNPAID";
            if (s.getStatus() == PaymentStatus.PAID || p >= s.getTotal()) st = "PAID";
            else if (p > 0) st = "PARTIAL";
            else if (s.getDueDate().isBefore(today)) st = "OVERDUE";
            
            if (status != null && !status.equalsIgnoreCase("ALL") && !status.equalsIgnoreCase(st)) continue;
            
            insts.add(new CollectionDueReportDto.InstallmentDto(
                s.getLoanMember().getMember().getName(), s.getLoanMember().getLoan().getId(),
                s.getLoanMember().getLoan().getStatus().name(),
                s.getInstallmentNo(), s.getDueDate(), round(s.getTotal()), round(p), round(s.getTotal() - p), st
            ));
        }
        
        return new CollectionDueReportDto(new CollectionDueReportDto.Summary(round(planned), round(collected), round(planned - collected)), insts);
    }

    public List<Integer> getInstallmentNumbers(Long loanId) {
        return scheduleRepo.findDistinctInstallmentNumbersByLoanId(loanId);
    }

    // --- 6. Outstanding ---
    public List<OutstandingOverdueReportDto> getOutstandingOverdue(Long groupId, String riskLevel, String agingBucket) {
        List<LoanSchedule> unpaid = scheduleRepo.findAll().stream().filter(s -> s.getStatus() != PaymentStatus.PAID).toList();
        if (groupId != null) unpaid = unpaid.stream().filter(s -> s.getLoanMember().getLoan().getGroup().getId().equals(groupId)).toList();
        
        LocalDate today = LocalDate.now();
        Map<LoanMember, List<LoanSchedule>> byMember = unpaid.stream().collect(Collectors.groupingBy(LoanSchedule::getLoanMember));
        
        return byMember.entrySet().stream().map(e -> {
            LoanMember lm = e.getKey();
            List<LoanSchedule> schs = e.getValue();
            
            double pending = schs.stream().mapToDouble(s -> s.getTotal() - (s.getPaidAmount() != null ? s.getPaidAmount() : 0.0)).sum();
            List<LoanSchedule> overdues = schs.stream().filter(s -> s.getDueDate().isBefore(today)).toList();
            int overdueCnt = overdues.size();
            if (overdueCnt == 0) return null; // Only overdues
            
            LocalDate oldest = overdues.stream().map(LoanSchedule::getDueDate).min(LocalDate::compareTo).orElse(today);
            long daysOld = ChronoUnit.DAYS.between(oldest, today);
            
            String bucket = "0-30 days";
            if (daysOld > 60) bucket = "60+ days";
            else if (daysOld > 30) bucket = "30-60 days";
            
            if (agingBucket != null && !agingBucket.equalsIgnoreCase("ALL") && !bucket.equals(agingBucket)) return null;
            
            String risk = overdueCnt > 3 ? "HIGH" : (overdueCnt > 1 ? "MEDIUM" : "LOW");
            if (riskLevel != null && !riskLevel.equalsIgnoreCase("ALL") && !risk.equals(riskLevel)) return null;
            
            return new OutstandingOverdueReportDto(
                lm.getMember().getName(), lm.getLoan().getGroup().getGroupName(), lm.getLoan().getId(),
                round(pending), overdueCnt, oldest, risk, bucket
            );
        }).filter(Objects::nonNull).toList();
    }

    // --- 7. Ledger ---
    public List<LoanLedgerReportDto> getLoanLedger(Long groupId, Long loanId, Long memberId, LocalDate startDate, LocalDate endDate) {
        List<LoanSchedule> schs = scheduleRepo.findAll();
        
        if (groupId != null) schs = schs.stream().filter(s -> s.getLoanMember().getLoan().getGroup().getId().equals(groupId)).toList();
        if (loanId != null) schs = schs.stream().filter(s -> s.getLoanMember().getLoan().getId().equals(loanId)).toList();
        if (memberId != null) schs = schs.stream().filter(s -> s.getLoanMember().getMember().getId().equals(memberId)).toList();
        if (startDate != null) schs = schs.stream().filter(s -> !s.getDueDate().isBefore(startDate)).toList();
        if (endDate != null) schs = schs.stream().filter(s -> !s.getDueDate().isAfter(endDate)).toList();
        
        LocalDate today = LocalDate.now();
        return schs.stream().map(s -> {
            double p = s.getPaidAmount() != null ? s.getPaidAmount() : 0.0;
            String st = s.getStatus() == PaymentStatus.PAID ? "PAID" : (p > 0 ? "PARTIAL" : (s.getDueDate().isBefore(today) ? "OVERDUE" : "UNPAID"));
            return new LoanLedgerReportDto(
                s.getLoanMember().getMember().getName(), s.getInstallmentNo(), s.getDueDate(),
                s.getPrincipal(), s.getInterest(), p, round(s.getTotal() - p), st,
                s.getLoanMember().getLoan().getId(), s.getLoanMember().getLoan().getGroup().getGroupName()
            );
        }).toList();
    }

    // --- 8. Financials ---
    public FinancialStatementReportDto getFinancialStatement(LocalDate startDate, LocalDate endDate, Long groupId) {
        List<Loan> loans = loanRepository.findAll();
        if (groupId != null) loans = loans.stream().filter(l -> l.getGroup().getId().equals(groupId)).toList();
        if (startDate != null || endDate != null) {
            loans = loans.stream().filter(l -> {
                if (startDate != null && l.getEndDate().isBefore(startDate)) return false;
                if (endDate != null && l.getStartDate().isAfter(endDate)) return false;
                return true;
            }).toList();
        }
        
        List<Long> lIds = loans.stream().map(Loan::getId).toList();
        
        double totalDisbursed = lIds.isEmpty() ? 0 : loanMemberRepo.findAll().stream().filter(lm -> lIds.contains(lm.getLoan().getId())).mapToDouble(LoanMember::getPrincipalAmount).sum();
        double totalCollected = lIds.isEmpty() ? 0 : paymentRepo.findAll().stream().filter(p -> lIds.contains(p.getLoanSchedule().getLoanMember().getLoan().getId())).mapToDouble(LoanPayment::getAmount).sum();
        double totalInterest = lIds.isEmpty() ? 0 : paymentRepo.findAll().stream().filter(p -> lIds.contains(p.getLoanSchedule().getLoanMember().getLoan().getId())).mapToDouble(p -> p.getLoanSchedule().getInterest() * (p.getAmount() / p.getLoanSchedule().getTotal())).sum();
        
        double outstanding = round(totalDisbursed + (lIds.isEmpty() ? 0 : scheduleRepo.findAll().stream().filter(s -> lIds.contains(s.getLoanMember().getLoan().getId())).mapToDouble(LoanSchedule::getInterest).sum()) - totalCollected);
        
        double totalFees = lIds.isEmpty() ? 0 : chargePaymentRepo.findAll().stream()
                .filter(cp -> lIds.contains(cp.getLoan().getId()))
                .filter(cp -> {
                    if (startDate != null && cp.getPaymentDate().isBefore(startDate)) return false;
                    if (endDate != null && cp.getPaymentDate().isAfter(endDate)) return false;
                    return true;
                })
                .mapToDouble(LoanChargePayment::getAmountPaid).sum();

        List<FinancialStatementReportDto.LoanProfitDto> profits = loans.stream().map(l -> {
            double i = paymentRepo.findAll().stream().filter(p -> p.getLoanSchedule().getLoanMember().getLoan().getId().equals(l.getId())).mapToDouble(p -> p.getLoanSchedule().getInterest() * (p.getAmount() / p.getLoanSchedule().getTotal())).sum();
            double pRepaid = paymentRepo.findAll().stream().filter(p -> p.getLoanSchedule().getLoanMember().getLoan().getId().equals(l.getId())).mapToDouble(p -> p.getAmount() - (p.getLoanSchedule().getInterest() * (p.getAmount() / p.getLoanSchedule().getTotal()))).sum();
            return new FinancialStatementReportDto.LoanProfitDto(l.getId(), round(i), round(pRepaid), l.getStatus().name());
        }).toList();
        
        return new FinancialStatementReportDto(
            new FinancialStatementReportDto.Revenue(round(totalInterest), round(totalFees), round(totalInterest + totalFees)),
            new FinancialStatementReportDto.Portfolio(round(totalDisbursed), round(totalCollected), outstanding),
            profits
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

    // --- 10. BALANCE SHEET (STATEMENTS) ---
    public BalanceSheetReportDto getBalanceSheet(LocalDate start, LocalDate end, Long groupId) {
        java.time.LocalDateTime startDateTime = start.atStartOfDay();
        java.time.LocalDateTime endDateTime = end.atTime(23, 59, 59);

        // 1. OPENING (Before start date)
        double openingCapital = groupId == null ? capitalLedgerRepository.sumCapitalBefore(startDateTime) : 0;
        double openingDisbursed = loanMemberRepo.sumDisbursedBefore(startDateTime, groupId);
        double openingCollected = paymentRepo.sumCollectedBefore(start, groupId);
        double openingCharges = chargePaymentRepo.sumChargesCollectedBefore(start, groupId);
        
        double openingCash = round(openingCapital - openingDisbursed + openingCollected + openingCharges);
        double openingOutstanding = scheduleRepo.sumOutstandingBefore(start, groupId);
        double openingAssets = round(openingCash + openingOutstanding + openingCharges);
        
        BalanceSheetReportDto.Section opening = new BalanceSheetReportDto.Section(
            openingCash, openingOutstanding, openingCharges, openingAssets
        );

        // 2. MOVEMENT (Within Period)
        double moveCapital = groupId == null ? capitalLedgerRepository.sumCapitalBetween(startDateTime, endDateTime) : 0;
        double moveDisbursed = loanMemberRepo.sumDisbursedBetween(startDateTime, endDateTime, groupId);
        double moveCollected = paymentRepo.sumCollectedBetween(start, end, groupId);
        double moveCharges = chargePaymentRepo.sumChargesCollectedBetween(start, end, groupId);

        BalanceSheetReportDto.Movement movement = new BalanceSheetReportDto.Movement(
            round(moveDisbursed), round(moveCollected), round(moveCharges), round(moveCapital)
        );

        // 3. CLOSING
        double closingCash = round(openingCash + moveCapital - moveDisbursed + moveCollected + moveCharges);

        // True Loan Outstanding = ALL unpaid schedule amounts (matches Loan Performance "Total Pending")
        double closingOutstanding = round(scheduleRepo.sumTrueTotalPending(groupId));

        double closingCharges = round(openingCharges + moveCharges);
        // Total Assets = Closing Cash + Total Pending Loans (professional balance sheet formula)
        double closingAssets = round(closingCash + closingOutstanding);
        
        BalanceSheetReportDto.Section closing = new BalanceSheetReportDto.Section(
            closingCash, closingOutstanding, closingCharges, closingAssets
        );

        return new BalanceSheetReportDto(opening, movement, closing);
    }

    // --- 11. PROFIT & LOSS ---
    public ProfitLossReportDto getProfitLoss(LocalDate start, LocalDate end, Long groupId, String viewType) {
        List<Loan> allLoans = loanRepository.findAll();
        if (groupId != null) allLoans = allLoans.stream().filter(l -> l.getGroup().getId().equals(groupId)).toList();
        List<Long> lIds = allLoans.stream().map(Loan::getId).toList();

        double interest = lIds.isEmpty() ? 0 : paymentRepo.findAll().stream()
                .filter(p -> lIds.contains(p.getLoanSchedule().getLoanMember().getLoan().getId()))
                .filter(p -> isWithin(p.getPaymentDate(), start, end))
                .mapToDouble(p -> p.getLoanSchedule().getInterest() * (p.getAmount() / p.getLoanSchedule().getTotal()))
                .sum();

        double charges = lIds.isEmpty() ? 0 : chargePaymentRepo.findAll().stream()
                .filter(cp -> lIds.contains(cp.getLoan().getId()))
                .filter(cp -> isWithin(cp.getPaymentDate(), start, end))
                .mapToDouble(LoanChargePayment::getAmountPaid).sum();

        ProfitLossReportDto.Revenue revenue = new ProfitLossReportDto.Revenue(round(interest), round(charges), round(interest + charges));
        
        // Calculate Trends based on periods
        List<ProfitLossReportDto.PeriodTrend> trends = new ArrayList<>();
        LocalDate current = start.withDayOfMonth(1);
        double lastRevenue = -1;

        while (!current.isAfter(end)) {
            LocalDate pStart = current;
            LocalDate pEndRaw = current.withDayOfMonth(current.lengthOfMonth());
            if (pEndRaw.isAfter(end)) pEndRaw = end;
            final LocalDate pEnd = pEndRaw;

            double pInt = lIds.isEmpty() ? 0 : paymentRepo.findAll().stream()
                    .filter(p -> lIds.contains(p.getLoanSchedule().getLoanMember().getLoan().getId()))
                    .filter(p -> isWithin(p.getPaymentDate(), pStart, pEnd))
                    .mapToDouble(p -> p.getLoanSchedule().getInterest() * (p.getAmount() / p.getLoanSchedule().getTotal()))
                    .sum();

            double pChar = lIds.isEmpty() ? 0 : chargePaymentRepo.findAll().stream()
                    .filter(cp -> lIds.contains(cp.getLoan().getId()))
                    .filter(cp -> isWithin(cp.getPaymentDate(), pStart, pEnd))
                    .mapToDouble(LoanChargePayment::getAmountPaid).sum();

            double pRev = round(pInt + pChar);
            Double growth = (lastRevenue < 0) ? null : (lastRevenue == 0 ? (pRev > 0 ? 100.0 : 0.0) : round(((pRev - lastRevenue) / lastRevenue) * 100));
            
            trends.add(new ProfitLossReportDto.PeriodTrend(
                    pStart.getMonth().name().substring(0, 3) + " " + pStart.getYear(),
                    round(pInt), round(pChar), pRev, growth
            ));
            
            lastRevenue = pRev;
            current = current.plusMonths(1);
        }

        double totalRevenue = revenue.getTotal();
        List<ProfitLossReportDto.LoanProfitBreakdown> breakdowns = new ArrayList<>();
        if (!allLoans.isEmpty()) {
            for (Loan l : allLoans) {
                double lInt = paymentRepo.findAll().stream()
                        .filter(p -> p.getLoanSchedule().getLoanMember().getLoan().getId().equals(l.getId()))
                        .filter(p -> isWithin(p.getPaymentDate(), start, end))
                        .mapToDouble(p -> p.getLoanSchedule().getInterest() * (p.getAmount() / p.getLoanSchedule().getTotal()))
                        .sum();
                        
                double lChar = chargePaymentRepo.findAll().stream()
                        .filter(cp -> cp.getLoan().getId().equals(l.getId()))
                        .filter(cp -> isWithin(cp.getPaymentDate(), start, end))
                        .mapToDouble(LoanChargePayment::getAmountPaid).sum();
                        
                double lProf = round(lInt + lChar);
                if (lProf != 0) {
                    double pct = totalRevenue > 0 ? round((lProf / totalRevenue) * 100) : 0;
                    breakdowns.add(new ProfitLossReportDto.LoanProfitBreakdown(l.getGroup().getGroupName(), l.getId(), round(lInt), round(lChar), lProf, pct));
                }
            }
            breakdowns.sort((b1, b2) -> Double.compare(b2.getProfit(), b1.getProfit()));
        }

        return new ProfitLossReportDto(revenue, 0, revenue.getTotal(), trends, breakdowns);
    }

    private boolean isWithin(LocalDate date, LocalDate start, LocalDate end) {
        if (start != null && date.isBefore(start)) return false;
        if (end != null && date.isAfter(end)) return false;
        return true;
    }
}
