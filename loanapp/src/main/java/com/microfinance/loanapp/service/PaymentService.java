package com.microfinance.loanapp.service;

import com.microfinance.loanapp.dto.*;
import com.microfinance.loanapp.enums.*;
import com.microfinance.loanapp.exception.ApiException;
import com.microfinance.loanapp.model.*;
import com.microfinance.loanapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final UserRepository userRepository;
    private final LoanRepository loanRepository;
    private final LoanMemberRepository loanMemberRepository;
    private final LoanScheduleRepository loanScheduleRepository;
    private final LoanPaymentRepository loanPaymentRepository;

    // ================= GET COLLECTION =================
    public CollectionResponse getCollection(Long groupId, Long loanId, Integer installmentNo, String username) {

        validateUser(username);

        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Loan not found"));

        if (!loan.getGroup().getId().equals(groupId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Loan does not belong to group");
        }

        // FETCH ALL SCHEDULES FOR THIS INSTALLMENT DIRECTLY
        List<LoanSchedule> schedules = loanScheduleRepository
                .findByLoanMember_Loan_IdAndInstallmentNo(loanId, installmentNo);

        if (schedules.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No schedules found for installment " + installmentNo);
        }

        List<CollectionMemberDto> list = schedules.stream().map(s -> {
            CollectionMemberDto dto = new CollectionMemberDto();
            dto.setLoanScheduleId(s.getId());
            dto.setMemberName(s.getLoanMember().getMember().getName());
            dto.setPrincipal(s.getPrincipal());
            dto.setInterest(s.getInterest());
            dto.setCharges(0.0); // ❌ removed completely
            dto.setTotalDue(s.getTotal()); // ONLY principal + interest
            dto.setPaidAmount(safe(s.getPaidAmount()));
            dto.setStatus(s.getStatus().name());

            return dto;
        }).toList();

        CollectionResponse res = new CollectionResponse();
        res.setInstallmentNo(installmentNo);
        res.setDueDate(schedules.get(0).getDueDate());
        res.setMembers(list);

        return res;
    }

    // ================= COLLECT PAYMENT =================
    @Transactional
    public String collectPayment(CollectPaymentRequest request, String username) {

        User user = validateUser(username);

        Loan loan = loanRepository.findById(request.getLoanId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Loan not found"));

        boolean isAdmin = user.getRole() == UserRole.ADMIN;
        boolean isCollector = loan.getGroup().getCollectionStaff().getUsername().equals(username);

        if (!isAdmin && !isCollector) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You are not authorized to collect for this group");
        }

        // FETCH AND SORT SCHEDULES TO PROCESS SEQUENTIALLY
        List<Long> scheduleIds = request.getPayments().stream().map(PaymentEntryDto::getLoanScheduleId).toList();
        List<LoanSchedule> schedules = loanScheduleRepository.findAllById(scheduleIds);
        Map<Long, Double> amountMap = request.getPayments().stream()
                .collect(Collectors.toMap(PaymentEntryDto::getLoanScheduleId, PaymentEntryDto::getAmount));

        schedules.sort(Comparator.comparing((LoanSchedule s) -> s.getLoanMember().getId())
                .thenComparing(LoanSchedule::getInstallmentNo));

        for (LoanSchedule s : schedules) {
            double amountToPay = amountMap.get(s.getId());

            // 1. PREVIOUS INSTALLMENT CHECK
            List<LoanSchedule> previousSchedules = loanScheduleRepository.findByLoanMember_IdAndInstallmentNoLessThan(
                    s.getLoanMember().getId(), s.getInstallmentNo());

            for (LoanSchedule prev : previousSchedules) {
                if (prev.getStatus() != PaymentStatus.PAID) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "previous installment is unpaid");
                }
            }

            if (s.getStatus() == PaymentStatus.PAID) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Already fully paid");
            }

            double scheduleTotal = s.getTotal();
            double newPaid = safe(s.getPaidAmount()) + amountToPay;
            double epsilon = 0.01;

            if (amountToPay <= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Amount must be > 0");
            }

            if (newPaid - scheduleTotal > epsilon) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Exceeds installment amount");
            }

            // SAVE PAYMENT HISTORY
            LoanPayment payment = new LoanPayment();
            payment.setLoanSchedule(s);
            payment.setAmount(amountToPay);
            payment.setPaymentDate(request.getPaymentDate());
            payment.setCollectedBy(user);
            payment.setCreatedAt(LocalDateTime.now());
            loanPaymentRepository.save(payment);

            // UPDATE SCHEDULE
            updateSchedule(s, newPaid, request.getPaymentDate());
            loanScheduleRepository.flush(); // Ensure sequential visibility
        }

        return "Payment recorded";
    }

    // ================= EDIT PAYMENT =================
    @Transactional
    public String editPayment(EditPaymentRequest request, String username) {

        validateAdmin(username);

        LoanPayment payment = loanPaymentRepository.findById(request.getPaymentId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment not found"));

        LoanSchedule s = payment.getLoanSchedule();

        double scheduleTotal = s.getTotal();
        double oldAmount = payment.getAmount();
        double newTotalPaid = safe(s.getPaidAmount()) - oldAmount + request.getNewAmount();

        double epsilon = 0.01;

        if (request.getNewAmount() <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid amount");
        }

        if (newTotalPaid - scheduleTotal > epsilon) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Exceeds installment amount");
        }

        // UPDATE PAYMENT
        payment.setAmount(request.getNewAmount());
        payment.setPaymentDate(request.getPaymentDate());

        // UPDATE SCHEDULE
        updateSchedule(s, newTotalPaid, request.getPaymentDate());

        return "Payment updated";
    }

    // ================= HISTORY =================
    public List<PaymentHistoryDto> getHistory(Long loanScheduleId) {

        return loanPaymentRepository.findByLoanSchedule_Id(loanScheduleId)
                .stream()
                .map(p -> new PaymentHistoryDto(
                        p.getId(),
                        p.getAmount(),
                        p.getPaymentDate(),
                        p.getCollectedBy().getName()
                ))
                .toList();
    }
    // ================= PENDING LIST =================
    public List<PendingPaymentDto> getPendingPayments(Long groupId, String timeFilter) {
        List<LoanSchedule> schedules = loanScheduleRepository.findByLoanMember_Loan_Status(LoanStatus.ACTIVE);
        LocalDate today = LocalDate.now();

        // 1. Group ALL schedules by (Loan ID + Installment No) first
        // This ensures totalMembers and paidMembers are always based on the full installment.
        Map<String, List<LoanSchedule>> grouped = schedules.stream()
                .collect(Collectors.groupingBy(s -> s.getLoanMember().getLoan().getId() + "-" + s.getInstallmentNo()));

        List<PendingPaymentDto> results = new ArrayList<>();

        for (List<LoanSchedule> groupSchedules : grouped.values()) {
            if (groupSchedules.isEmpty()) continue;

            LoanSchedule first = groupSchedules.get(0);
            Loan loan = first.getLoanMember().getLoan();
            LocalDate dueDate = first.getDueDate();

            // A. Apply Group Filter (SKIP if mismatch)
            if (groupId != null && !loan.getGroup().getId().equals(groupId)) {
                continue;
            }

            // B. Apply Time Filter (SKIP if mismatch)
            if (timeFilter != null && !timeFilter.equals("ALL")) {
                boolean matches = false;
                switch (timeFilter) {
                    case "OVERDUE":
                        matches = dueDate.isBefore(today);
                        break;
                    case "THIS_WEEK":
                        LocalDate monday = today.with(java.time.DayOfWeek.MONDAY);
                        LocalDate sunday = today.with(java.time.DayOfWeek.SUNDAY);
                        matches = !dueDate.isBefore(monday) && !dueDate.isAfter(sunday);
                        break;
                    case "THIS_MONTH":
                        matches = (dueDate.getMonth() == today.getMonth() && dueDate.getYear() == today.getYear());
                        break;
                    case "UPCOMING":
                        matches = dueDate.isAfter(today);
                        break;
                    default:
                        matches = true;
                }
                if (!matches) continue;
            }

            // C. Calculate Totals
            int totalMembers = groupSchedules.size();
            long paidMembers = groupSchedules.stream()
                    .filter(s -> s.getStatus() == PaymentStatus.PAID)
                    .count();
            
            int pendingMembers = totalMembers - (int)paidMembers;

            // D. Exclude fully paid installments
            if (pendingMembers > 0) {
                PendingPaymentDto dto = new PendingPaymentDto();
                dto.setGroupId(loan.getGroup().getId());
                dto.setGroupName(loan.getGroup().getGroupName());
                dto.setLoanId(loan.getId());
                dto.setInstallmentNo(first.getInstallmentNo());
                dto.setDueDate(dueDate);
                dto.setTotalMembers(totalMembers);
                dto.setPaidMembers((int)paidMembers);
                dto.setPendingMembers(pendingMembers);
                
                String status = (paidMembers == 0) ? "UNPAID" : "PARTIAL";
                dto.setStatus(status);
                dto.setIsOverdue(dueDate.isBefore(today));

                results.add(dto);
            }
        }

        // Sort: Due Date ASC, Group Name ASC
        results.sort(Comparator.comparing(PendingPaymentDto::getDueDate)
                .thenComparing(PendingPaymentDto::getGroupName));

        return results;
    }


    // ================= COMMON =================

    private void updateSchedule(LoanSchedule s, double paid, java.time.LocalDate date) {

        double total = s.getTotal();
        double epsilon = 0.01;

        s.setPaidAmount(paid);
        s.setPaidDate(date);

        if (paid <= epsilon) {
            s.setStatus(PaymentStatus.PENDING);
        }
        else if (Math.abs(paid - total) <= epsilon) {
            s.setStatus(PaymentStatus.PAID);
        }
        else if (paid < total) {
            s.setStatus(PaymentStatus.PARTIAL);
        }
        else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Payment exceeds installment");
        }

        loanScheduleRepository.save(s);
    }

    private User validateUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private void validateAdmin(String username) {
        User u = validateUser(username);
        if (u.getRole() != UserRole.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin only");
        }
    }

    private double safe(Double v) {
        return v == null ? 0 : v;
    }
}