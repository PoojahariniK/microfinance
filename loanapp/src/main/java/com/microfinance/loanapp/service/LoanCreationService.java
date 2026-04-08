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

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LoanCreationService {

    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final MemberGroupRepository memberGroupRepository;
    private final LoanRepository loanRepository;
    private final LoanMemberRepository loanMemberRepository;
    private final LoanScheduleRepository loanScheduleRepository;
    private final LoanChargesRepository loanChargesRepository;
    private final LoanChargePaymentRepository loanChargePaymentRepository;
    private final ReportService reportService;

    // =========================================================
    //  ADMIN VALIDATION
    // =========================================================

    private User validateAdmin(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is disabled");
        }
        if (user.getRole() != UserRole.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only admins can perform this action");
        }
        return user;
    }

    private User validateStaffOrAdmin(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is disabled");
        }
        if (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.STAFF) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Unauthorized role for this action");
        }
        return user;
    }

    // =========================================================
    //  COLLECTION DAY VALIDATION
    //  Only applied for WEEKLY / BIWEEKLY groups.
    //  DAILY and MONTHLY have no day-of-week constraint.
    // =========================================================

    private void validateCollectionDay(LocalDate date, Group group, String fieldName) {
        CollectionType type = group.getCollectionType();
        if (type != CollectionType.WEEKLY && type != CollectionType.BIWEEKLY) {
            return;
        }
        CollectionDay collectionDay = group.getCollectionDay();
        if (collectionDay == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Group has no collection day configured for " + type + " collection");
        }
        DayOfWeek expected = toDayOfWeek(collectionDay);
        DayOfWeek actual   = date.getDayOfWeek();
        if (actual != expected) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    fieldName + " must match collection day (" + collectionDay + "). Got: " + actual);
        }
    }

    private DayOfWeek toDayOfWeek(CollectionDay day) {
        return switch (day) {
            case MONDAY    -> DayOfWeek.MONDAY;
            case TUESDAY   -> DayOfWeek.TUESDAY;
            case WEDNESDAY -> DayOfWeek.WEDNESDAY;
            case THURSDAY  -> DayOfWeek.THURSDAY;
            case FRIDAY    -> DayOfWeek.FRIDAY;
            case SATURDAY  -> DayOfWeek.SATURDAY;
            case SUNDAY    -> DayOfWeek.SUNDAY;
        };
    }



    // =========================================================
    //  INIT LOAN
    // =========================================================

    public LoanDraftDto initLoan(LoanInitRequest request, String loggedInUser) {
        validateAdmin(loggedInUser);

        Group group = groupRepository.findById(request.getGroupId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Group not found"));

        if (group.getStatus() != GroupStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Group must be ACTIVE");
        }

        if (loanRepository.findByGroup_IdAndStatus(group.getId(), LoanStatus.ACTIVE).isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Active loan already exists for this group");
        }

        // Validate startDate
        if (request.getStartDate() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Start date is required");
        }

        if (request.getTotalLoanAmount() == null || request.getTotalLoanAmount() <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Total loan amount must be positive");
        }

        Double interestRate = request.getInterestRate();
        if (request.getDueAmount() != null && request.getDueAmount() > 0) {
            // Derive interestRate from dueAmount
            int totalInstallments = getTotalInstallments(group.getCollectionType(), request.getDurationWeeks());
            double principalPerPerson = Math.floor(request.getTotalLoanAmount());
            double totalObligation = request.getDueAmount() * totalInstallments;
            double totalInterest = totalObligation - principalPerPerson;
            
            // Formula: interestRate = (totalInterest / principalPerPerson) / request.getDurationWeeks() * 100.0;
            interestRate = (totalInterest / principalPerPerson) / request.getDurationWeeks() * 100.0;
            interestRate = roundRate(interestRate);
        }

        if (interestRate == null || interestRate < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Interest rate cannot be negative");
        }

        // Validate durationWeeks (1–800)
        if (request.getDurationWeeks() == null
                || request.getDurationWeeks() <= 0
                || request.getDurationWeeks() > 800) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Duration must be between 1 and 800 weeks");
        }

        if (request.getCharges() != null) {
            LoanChargesDto chk = request.getCharges();
            if ((chk.getProcessingFee() != null && chk.getProcessingFee() < 0) ||
                (chk.getDocumentFee()   != null && chk.getDocumentFee()   < 0) ||
                (chk.getInsuranceFee()  != null && chk.getInsuranceFee()  < 0) ||
                (chk.getSavingAmount()  != null && chk.getSavingAmount()  < 0)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Loan charges cannot be negative");
            }
        }

        // Collection-day validation for start date only
        validateCollectionDay(request.getStartDate(), group, "Start date");

        // Compute end date = due date of last installment
        LocalDate endDate = calculateEndDate(
                request.getStartDate(), group.getCollectionType(), request.getDurationWeeks());

        // Member resolution
        List<MemberGroup> allMembers = memberGroupRepository.findByGroup_Id(group.getId());
        if (allMembers.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Group has no members");
        }

        List<MemberGroup> memberGroups =
                memberGroupRepository.findByGroup_IdAndStatus(group.getId(), MemberStatus.ACTIVE);

        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            memberGroups = memberGroups.stream()
                    .filter(mg -> request.getMemberIds().contains(mg.getMember().getId()))
                    .collect(Collectors.toList());

            if (memberGroups.size() != request.getMemberIds().size()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid members provided");
            }
        }

        if (memberGroups.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No ACTIVE members found");
        }

        // Amount is given PER PERSON
        double principal = Math.floor(request.getTotalLoanAmount());

        List<LoanMemberDraftDto> members = new ArrayList<>();
        for (MemberGroup mg : memberGroups) {
            members.add(new LoanMemberDraftDto(
                    mg.getMember().getId(),
                    mg.getMember().getName(),
                    wholeRound(principal)
            ));
        }

        return new LoanDraftDto(
                group.getId(),
                wholeRound(principal * memberGroups.size()), 
                interestRate, 
                request.getDueAmount(), // pass the dueAmount here
                request.getDurationWeeks(),
                request.getStartDate(),
                endDate,
                members,
                request.getCharges()
        );
    }

    // =========================================================
    //  PREVIEW SCHEDULE
    // =========================================================

    public List<LoanSchedulePreviewDto> previewSchedule(LoanDraftDto draft, String loggedInUser) {
        validateAdmin(loggedInUser);

        Group group = groupRepository.findById(draft.getGroupId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Group not found"));

        // Validate start date only; recompute end date — never trust incoming draft value
        validateCollectionDay(draft.getStartDate(), group, "Start date");
        LocalDate computedEndDate = calculateEndDate(
                draft.getStartDate(), group.getCollectionType(), draft.getDurationWeeks());
        draft.setEndDate(computedEndDate);

        int total = getTotalInstallments(group.getCollectionType(), draft.getDurationWeeks());

        List<LoanSchedulePreviewDto> list = new ArrayList<>();

        for (LoanMemberDraftDto m : draft.getMembers()) {

            double mPrincipal = m.getPrincipalAmount();
            double totalInterest;
            
            if (draft.getDueAmount() != null && draft.getDueAmount() > 0) {
                // Calculation anchored by the fixed dueAmount
                totalInterest = (draft.getDueAmount() * total) - mPrincipal;
            } else {
                // Calculation anchored by interestRate
                totalInterest = (mPrincipal * draft.getInterestRate() / 100.0) * draft.getDurationWeeks();
            }
            totalInterest = wholeRound(totalInterest);

            double pEach = Math.floor(mPrincipal / total);
            double pRem  = wholeRound(mPrincipal - (pEach * total));
            
            double iEach;
            double totalIntExpected;
            
            if (draft.getDueAmount() != null && draft.getDueAmount() > 0) {
                iEach = draft.getDueAmount() - pEach;
                totalIntExpected = (draft.getDueAmount() * total) - mPrincipal;
            } else {
                totalIntExpected = totalInterest;
                iEach = Math.floor(totalIntExpected / total);
            }
            
            double iRem = wholeRound(totalIntExpected - (iEach * total));

            // Installment 1 due = startDate; subsequent installments advance by one interval
            LocalDate date = draft.getStartDate();

            for (int i = 1; i <= total; i++) {
                double p  = pEach;
                double in = iEach;

                if (i == total) {
                    p  += pRem;
                    // If dueAmount anchored, last interest must maintain the fixed total
                    if (draft.getDueAmount() != null && draft.getDueAmount() > 0) {
                        in = draft.getDueAmount() - p;
                    } else {
                        in += iRem;
                    }
                }

                p  = wholeRound(p);
                in = wholeRound(in);

                list.add(new LoanSchedulePreviewDto(
                        m.getMemberId(),
                        i,
                        date,
                        p,
                        in,
                        wholeRound(p + in)
                ));

                date = advanceDate(date, group.getCollectionType());
            }
        }

        return list;
    }

    // =========================================================
    //  CONFIRM LOAN
    // =========================================================

    @Transactional
    public String confirmLoan(LoanConfirmRequest request, String loggedInUser) {
        validateAdmin(loggedInUser);

        LoanDraftDto draft = request.getDraft();

        Group group = groupRepository.findById(draft.getGroupId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Group not found"));

        if (group.getStatus() != GroupStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Group must be ACTIVE");
        }

        if (loanRepository.findByGroup_IdAndStatus(group.getId(), LoanStatus.ACTIVE).isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Active loan already exists");
        }

        // Final validation gate — start date only; recompute end date authoritatively
        validateCollectionDay(draft.getStartDate(), group, "Start date");
        LocalDate computedEndDate = calculateEndDate(
                draft.getStartDate(), group.getCollectionType(), draft.getDurationWeeks());

        // Schedule amount validations
        double totalCheck = 0;
        for (LoanMemberDraftDto m : draft.getMembers()) {

            List<LoanSchedulePreviewDto> memberSchedules = request.getSchedules().stream()
                    .filter(s -> s.getMemberId().equals(m.getMemberId()))
                    .toList();

            // Principal sum must match declared principal
            double principalSum = wholeRound(
                    memberSchedules.stream().mapToDouble(LoanSchedulePreviewDto::getPrincipal).sum()
            );
            if (Math.abs(principalSum - m.getPrincipalAmount()) > 0.01) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Principal mismatch for member " + m.getMemberName());
            }

            int totalInst = getTotalInstallments(group.getCollectionType(), draft.getDurationWeeks());
            double expectedTotal;
            if (draft.getDueAmount() != null && draft.getDueAmount() > 0) {
                expectedTotal = wholeRound(draft.getDueAmount() * totalInst);
            } else {
                double interestTotal = wholeRound(
                        (m.getPrincipalAmount() * draft.getInterestRate() / 100.0)
                        * draft.getDurationWeeks()
                );
                expectedTotal = wholeRound(m.getPrincipalAmount() + interestTotal);
            }

            double actualTotal = wholeRound(
                    memberSchedules.stream().mapToDouble(LoanSchedulePreviewDto::getTotal).sum()
            );
            validateScheduleTotals(expectedTotal, actualTotal, m.getMemberName());

            totalCheck += m.getPrincipalAmount();
        }

        if (Math.abs(wholeRound(totalCheck) - draft.getTotalLoanAmount()) > 0.01) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Total loan mismatch");
        }

        // Determine canonical per-member values for robust late-add validation
        int canonicalTotalInst = getTotalInstallments(group.getCollectionType(), draft.getDurationWeeks());
        double perMemberPrincipal = draft.getMembers().get(0).getPrincipalAmount();
        double canonicalInterestTotal;
        double canonicalTotalObligation;
        Double canonicalDueAmount = draft.getDueAmount();
        
        if (canonicalDueAmount != null && canonicalDueAmount > 0) {
            canonicalTotalObligation = wholeRound(canonicalDueAmount * canonicalTotalInst);
            canonicalInterestTotal = wholeRound(canonicalTotalObligation - perMemberPrincipal);
        } else {
            canonicalInterestTotal = wholeRound(
                    (perMemberPrincipal * draft.getInterestRate() / 100.0)
                    * draft.getDurationWeeks()
            );
            canonicalTotalObligation = wholeRound(perMemberPrincipal + canonicalInterestTotal);
            // Default computed approximation for reporting if no fixed rate
            canonicalDueAmount = Math.floor(canonicalTotalObligation / canonicalTotalInst);
        }

        // Persist Loan
        Loan loan = new Loan();
        loan.setGroup(group);
        loan.setInterestRate(draft.getInterestRate());
        loan.setDurationWeeks(draft.getDurationWeeks());
        loan.setStartDate(draft.getStartDate());
        loan.setEndDate(computedEndDate);  // always system-computed
        loan.setDueAmount(canonicalDueAmount);
        loan.setTotalObligation(canonicalTotalObligation);
        loan.setTotalInterest(canonicalInterestTotal);
        loan.setStatus(LoanStatus.ACTIVE);
        loan.setCreatedAt(LocalDateTime.now());
        loan = loanRepository.save(loan);

        // Persist Charges
        if (draft.getCharges() != null) {
            LoanChargesDto chk = draft.getCharges();
            if ((chk.getProcessingFee() != null && chk.getProcessingFee() < 0) ||
                (chk.getDocumentFee()   != null && chk.getDocumentFee()   < 0) ||
                (chk.getInsuranceFee()  != null && chk.getInsuranceFee()  < 0) ||
                (chk.getSavingAmount()  != null && chk.getSavingAmount()  < 0)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Loan charges cannot be negative");
            }
            LoanCharges c = new LoanCharges();
            c.setLoan(loan);
            c.setProcessingFee(chk.getProcessingFee());
            c.setDocumentFee(chk.getDocumentFee());
            c.setInsuranceFee(chk.getInsuranceFee());
            c.setSavingAmount(chk.getSavingAmount());
            loanChargesRepository.save(c);
        }

        // Persist Members + Schedules
        List<LoanSchedule> all = new ArrayList<>();

        for (LoanMemberDraftDto m : draft.getMembers()) {

            Member member = memberGroupRepository
                    .findByGroup_IdAndStatus(group.getId(), MemberStatus.ACTIVE)
                    .stream()
                    .map(MemberGroup::getMember)
                    .filter(x -> x.getId().equals(m.getMemberId()))
                    .findFirst()
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid member"));

            LoanMember lm = new LoanMember();
            lm.setLoan(loan);
            lm.setMember(member);
            lm.setPrincipalAmount(m.getPrincipalAmount());
            lm.setJoinedDate(draft.getStartDate());
            lm = loanMemberRepository.save(lm);

            for (LoanSchedulePreviewDto s : request.getSchedules()) {
                if (s.getMemberId().equals(m.getMemberId())) {
                    LoanSchedule sc = new LoanSchedule();
                    sc.setLoanMember(lm);
                    sc.setInstallmentNo(s.getInstallmentNo());
                    sc.setDueDate(s.getDueDate());
                    sc.setPrincipal(s.getPrincipal());
                    sc.setInterest(s.getInterest());
                    sc.setTotal(s.getTotal());
                    sc.setPaidAmount(0.0);
                    sc.setStatus(PaymentStatus.PENDING);
                    all.add(sc);
                }
            }
        }

        loanScheduleRepository.saveAll(all);
        return "Loan created ID: " + loan.getId();
    }

    // =========================================================
    //  EDIT LOAN  (Rule §6)
    // =========================================================

    /**
     * Updates Loan status and LoanCharges.
     *
     * Rules:
     *  1. ADMIN only.
     *  2. Loan must exist.
     *  3. DO NOT allow changing: interestRate, durationWeeks, startDate, endDate.
     *     ONLY allow updating: loan.status and loan charges.
     *  4. Allowed to edit charges even if schedule payments exist.
     */
    @Transactional
    public String editLoan(Long loanId, EditLoanRequest request, String loggedInUser) {
        validateAdmin(loggedInUser);

        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Loan not found"));

        // Only allow status update
        if (request.getStatus() != null) {
            loan.setStatus(request.getStatus());
        }
        loanRepository.save(loan);

        // Update charges
        if (request.getCharges() != null) {
            LoanChargesDto dto = request.getCharges();
            if ((dto.getProcessingFee() != null && dto.getProcessingFee() < 0) ||
                (dto.getDocumentFee()   != null && dto.getDocumentFee()   < 0) ||
                (dto.getInsuranceFee()  != null && dto.getInsuranceFee()  < 0) ||
                (dto.getSavingAmount()  != null && dto.getSavingAmount()  < 0)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Loan charges cannot be negative");
            }
            LoanCharges charges = loanChargesRepository.findByLoan_Id(loanId)
                    .orElseGet(() -> {
                        LoanCharges c = new LoanCharges();
                        c.setLoan(loan);
                        return c;
                    });
            if (dto.getProcessingFee() != null) charges.setProcessingFee(dto.getProcessingFee());
            if (dto.getDocumentFee()   != null) charges.setDocumentFee(dto.getDocumentFee());
            if (dto.getInsuranceFee()  != null) charges.setInsuranceFee(dto.getInsuranceFee());
            if (dto.getSavingAmount()  != null) charges.setSavingAmount(dto.getSavingAmount());
            loanChargesRepository.save(charges);
        }

        return "Loan updated successfully. ID: " + loanId;
    }

    // =========================================================
    //  CHARGE PAYMENTS
    // =========================================================

    @Transactional
    public String payCharge(Long loanId, ChargePaymentRequest request, String loggedInUser) {
        User user = validateStaffOrAdmin(loggedInUser);

        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Loan not found"));

        boolean isAdmin = user.getRole() == UserRole.ADMIN;
        boolean isCollector = loan.getGroup().getCollectionStaff().getUsername().equals(loggedInUser);

        if (!isAdmin && !isCollector) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You are not authorized to collect for this group");
        }

        LoanMember lm = loanMemberRepository.findByLoan_IdAndMember_Id(loanId, request.getMemberId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Member must belong to loan"));

        double incomingAmount = request.getAmountPaid();
        if (!isAdmin && incomingAmount <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Amount must be greater than 0");
        }

        LoanChargePayment payment = loanChargePaymentRepository
                .findByLoan_IdAndMember_Id(loanId, request.getMemberId())
                .orElseGet(() -> {
                   LoanChargePayment p = new LoanChargePayment();
                   p.setLoan(loan);
                   p.setMember(lm.getMember());
                   p.setAmountPaid(0.0);
                   p.setCreatedAt(LocalDateTime.now());
                   return p;
                });

        LoanCharges charges = loanChargesRepository.findByLoan_Id(loanId)
                .orElse(new LoanCharges());

        double totalCharges = (charges.getProcessingFee() != null ? charges.getProcessingFee() : 0.0) +
                              (charges.getDocumentFee()   != null ? charges.getDocumentFee()   : 0.0) +
                              (charges.getInsuranceFee()  != null ? charges.getInsuranceFee()  : 0.0) +
                              (charges.getSavingAmount()  != null ? charges.getSavingAmount()  : 0.0);

        if (!isAdmin && payment.getAmountPaid() + incomingAmount > totalCharges + 0.01) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Payment exceeds total charges");
        }

        payment.setAmountPaid(payment.getAmountPaid() + incomingAmount);
        payment.setTotalAmount(totalCharges);
        payment.setPaymentDate(LocalDate.now());
        loanChargePaymentRepository.save(payment);

        return "Payment successful";
    }

    public ChargeStatusResponse getChargeStatus(Long loanId) {
        if (!loanRepository.existsById(loanId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Loan not found");
        }

        List<LoanMember> loanMembers = loanMemberRepository.findByLoan_Id(loanId);
        int totalMembers = loanMembers.size();

        List<LoanChargePayment> payments = loanChargePaymentRepository.findByLoan_Id(loanId);
        int paidMembers = payments.size();

        String status = "UNPAID";
        if (paidMembers > 0) {
            if (paidMembers >= totalMembers) {
                status = "PAID";
            } else {
                status = "PARTIAL";
            }
        }

        return new ChargeStatusResponse(totalMembers, paidMembers, status);
    }

    public List<ChargePaymentMemberDto> getMembersWhoPaid(Long loanId) {
        if (!loanRepository.existsById(loanId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Loan not found");
        }

        List<LoanChargePayment> payments = loanChargePaymentRepository.findByLoan_Id(loanId);
        return payments.stream().map(p -> new ChargePaymentMemberDto(
                p.getMember().getId(),
                p.getMember().getName(),
                p.getAmountPaid(),
                p.getTotalAmount(),
                p.getPaymentDate()
        )).collect(Collectors.toList());
    }

    // =========================================================
    //  ADD MEMBER: PREVIEW
    // =========================================================

    public AddMemberPreviewResponse previewAddMember(Long loanId, Long memberId, String loggedInUser) {
        validateAdmin(loggedInUser);
        AddMemberContext ctx = calcAddMemberContext(loanId, memberId);
        List<AddMemberScheduleDto> schedules = buildScheduleDtos(ctx);

        return new AddMemberPreviewResponse(
                loanId,
                ctx.member().getId(),
                ctx.member().getName(),
                ctx.principalAmount(),
                ctx.getExpectedDueAmount(),
                ctx.principalAmount(),
                ctx.getExpectedTotalInterest(),
                ctx.getExpectedTotalObligation(),
                schedules
        );
    }

    // =========================================================
    //  ADD MEMBER: CONFIRM
    // =========================================================

    @Transactional
    public AddMemberResponse confirmAddMember(Long loanId, AddMemberConfirmRequest request, String loggedInUser) {
        validateAdmin(loggedInUser);

        Long memberId = request.getMemberId();
        AddMemberContext ctx = calcAddMemberContext(loanId, memberId);

        // Principal validation
        double sumPrincipal = wholeRound(
                request.getSchedules().stream().mapToDouble(AddMemberScheduleDto::getPrincipal).sum()
        );
        if (Math.abs(sumPrincipal - request.getPrincipalAmount()) > 0.01) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Sum of schedule principals (" + sumPrincipal +
                    ") does not match principalAmount (" + request.getPrincipalAmount() + ")");
        }
        if (Math.abs(request.getPrincipalAmount() - ctx.principalAmount()) > 0.01) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "principalAmount must match existing members' principal (" + ctx.principalAmount() + ")");
        }

        // Installment count validation
        if (request.getSchedules().size() != ctx.remaining()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Schedule must have exactly " + ctx.remaining() +
                    " installments (remaining), got " + request.getSchedules().size());
        }

        // Sort + continuity validation
        int expectedStart = ctx.passedInstallments() + 1;
        List<AddMemberScheduleDto> sorted = request.getSchedules().stream()
                .sorted(java.util.Comparator.comparingInt(AddMemberScheduleDto::getInstallmentNo))
                .collect(Collectors.toList());

        for (int i = 0; i < sorted.size(); i++) {
            int expected = expectedStart + i;
            if (sorted.get(i).getInstallmentNo() != expected) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Installment numbers must be continuous starting from " + expectedStart +
                        ". Got " + sorted.get(i).getInstallmentNo() + " at position " + (i + 1));
            }
        }

        // Per-installment value validation
        for (AddMemberScheduleDto s : sorted) {
            if (s.getPrincipal() < 0 || s.getInterest() < 0 || s.getTotal() < 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Installment " + s.getInstallmentNo() + " contains negative values");
            }
            double expTotal = wholeRound(s.getPrincipal() + s.getInterest());
            if (Math.abs(expTotal - s.getTotal()) > 0.01) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Installment " + s.getInstallmentNo() +
                        ": total must equal principal + interest (" + expTotal + ")");
            }
        }

        // Total obligation must NOT be reduced
        double expectedTotal = wholeRound(ctx.getExpectedTotalObligation());
        double actualTotal   = wholeRound(
                sorted.stream().mapToDouble(AddMemberScheduleDto::getTotal).sum()
        );
        validateScheduleTotals(expectedTotal, actualTotal, ctx.member().getName());

        // Persist
        LoanMember lm = new LoanMember();
        lm.setLoan(ctx.loan());
        lm.setMember(ctx.member());
        lm.setPrincipalAmount(ctx.principalAmount());
        lm.setJoinedDate(LocalDate.now());
        lm = loanMemberRepository.save(lm);

        final LoanMember savedLm = lm;
        List<LoanSchedule> schedules = sorted.stream().map(s -> {
            LoanSchedule sc = new LoanSchedule();
            sc.setLoanMember(savedLm);
            sc.setInstallmentNo(s.getInstallmentNo());
            sc.setDueDate(s.getDueDate());
            sc.setPrincipal(s.getPrincipal());
            sc.setInterest(s.getInterest());
            sc.setTotal(s.getTotal());
            sc.setPaidAmount(0.0);
            sc.setStatus(PaymentStatus.PENDING);
            return sc;
        }).collect(Collectors.toList());

        loanScheduleRepository.saveAll(schedules);
        return new AddMemberResponse("Member added successfully", savedLm.getId());
    }

    // =========================================================
    //  GET LOAN SUMMARY BY GROUP
    // =========================================================

    public PaginatedResponse<LoanSummaryResponse> getLoanSummaryByGroup(Long groupId, Long loanId, int page, int size, String search) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<Loan> loanPage;

        if (loanId != null) {
            Loan loan = loanRepository.findById(loanId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Loan not found"));
            if (groupId != null && !loan.getGroup().getId().equals(groupId)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Loan does not belong to this group");
            }
            loanPage = new org.springframework.data.domain.PageImpl<>(List.of(loan), pageable, 1);
        } else if (groupId != null) {
            if (search != null && !search.isBlank()) {
                loanPage = loanRepository.searchLoansByGroup(groupId, search.trim(), pageable);
            } else {
                loanPage = loanRepository.findByGroup_Id(groupId, pageable);
            }
        } else {
            if (search != null && !search.isBlank()) {
                loanPage = loanRepository.searchLoans(search.trim(), pageable);
            } else {
                loanPage = loanRepository.findAll(pageable);
            }
        }

        List<LoanSummaryResponse> summaryList = new ArrayList<>();

        for (Loan loan : loanPage.getContent()) {
            List<LoanMember> loanMembers = loanMemberRepository.findByLoan_Id(loan.getId());
            double totalPrincipal = loanMembers.stream()
                    .mapToDouble(LoanMember::getPrincipalAmount)
                    .sum();

            LoanSummaryResponse summary = new LoanSummaryResponse();
            summary.setId(loan.getId());
            summary.setGroupId(loan.getGroup().getId());
            summary.setGroupName(loan.getGroup().getGroupName());
            summary.setTotalMembers(loanMembers.size());
            summary.setTotalPrincipal(wholeRound(totalPrincipal));
            summary.setInterestRate(loan.getInterestRate());
            summary.setDurationWeeks(loan.getDurationWeeks());
            summary.setCollectionType(loan.getGroup().getCollectionType().name());
            summary.setStatus(loan.getStatus().name());

            ChargeStatusResponse chargeRes = getChargeStatus(loan.getId());
            summary.setChargeStatus(chargeRes.getStatus());

            loanChargesRepository.findByLoan_Id(loan.getId()).ifPresent(c -> {
                summary.setCharges(new com.microfinance.loanapp.dto.LoanChargesDto(
                        c.getProcessingFee(),
                        c.getDocumentFee(),
                        c.getInsuranceFee(),
                        c.getSavingAmount()
                ));
            });

            summaryList.add(summary);
        }

        return new PaginatedResponse<>(
                summaryList,
                loanPage.getTotalPages(),
                loanPage.getTotalElements(),
                loanPage.getNumber()
        );
    }

    // =========================================================
    //  GET LOAN SCHEDULE BY GROUP
    // =========================================================

    public List<LoanScheduleGroupResponse> getLoanScheduleByGroup(Long groupId, Long loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Loan not found"));

        if (!loan.getGroup().getId().equals(groupId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Loan does not belong to this group");
        }

        List<LoanScheduleGroupResponse> result = new ArrayList<>();
        List<LoanMember> members = loanMemberRepository.findByLoan_Id(loan.getId());
        if (members.isEmpty()) return result;

        int maxInstallment = loanScheduleRepository
                .findTopByLoanMember_Loan_IdOrderByInstallmentNoDesc(loan.getId())
                .map(LoanSchedule::getInstallmentNo)
                .orElse(0);

        for (int i = 1; i <= maxInstallment; i++) {
            List<MemberScheduleDto> list = new ArrayList<>();
            LocalDate dueDate = null;

            for (LoanMember lm : members) {
                java.util.Optional<LoanSchedule> opt =
                        loanScheduleRepository.findByLoanMember_IdAndInstallmentNo(lm.getId(), i);
                if (opt.isEmpty()) continue;

                LoanSchedule s = opt.get();
                if (dueDate == null) dueDate = s.getDueDate();

                MemberScheduleDto dto = new MemberScheduleDto();
                dto.setLoanScheduleId(s.getId());
                dto.setMemberId(lm.getMember().getId());
                dto.setMemberName(lm.getMember().getName());
                dto.setPrincipal(s.getPrincipal());
                dto.setInterest(s.getInterest());
                dto.setTotal(s.getTotal());
                dto.setPaidAmount(s.getPaidAmount());
                dto.setStatus(s.getStatus().name());
                list.add(dto);
            }

            if (list.isEmpty()) continue;

            LoanScheduleGroupResponse res = new LoanScheduleGroupResponse();
            res.setLoanId(loan.getId());
            res.setInstallmentNo(i);
            res.setDueDate(dueDate != null ? dueDate.toString() : "");
            res.setMembers(list);
            result.add(res);
        }
        return result;
    }

    // =========================================================
    //  GET SCHEDULE BY MEMBER
    // =========================================================

    public List<MemberScheduleDto> getScheduleByMember(Long groupId, Long loanId, Long memberId) {
        LoanMember lm = loanMemberRepository.findByLoan_IdAndMember_Id(loanId, memberId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Schedules not found for this member and loan"));

        if (!lm.getLoan().getGroup().getId().equals(groupId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Member/Loan does not belong to this group");
        }

        List<MemberScheduleDto> result = new ArrayList<>();
        List<LoanSchedule> schedules =
                loanScheduleRepository.findByLoanMember_IdOrderByInstallmentNo(lm.getId());

        for (LoanSchedule s : schedules) {
            MemberScheduleDto dto = new MemberScheduleDto();
            dto.setLoanScheduleId(s.getId());
            dto.setMemberId(memberId);
            dto.setMemberName(lm.getMember().getName());
            dto.setPrincipal(s.getPrincipal());
            dto.setInterest(s.getInterest());
            dto.setTotal(s.getTotal());
            dto.setInstallmentNo(s.getInstallmentNo());
            dto.setDueDate(s.getDueDate() != null ? s.getDueDate().toString() : "");
            dto.setPaidAmount(s.getPaidAmount());
            dto.setStatus(s.getStatus().name());
            result.add(dto);
        }
        return result;
    }

    // =========================================================
    //  EDIT SCHEDULE (per-installment override)
    // =========================================================

    @Transactional
    public String editSchedule(EditLoanScheduleRequest request, String username) {
        validateAdmin(username);

        List<LoanSchedule> schedules = loanScheduleRepository
                .findByLoanMember_Loan_IdAndInstallmentNo(
                        request.getLoanId(),
                        request.getInstallmentNo()
                );

        if (schedules.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No schedules found");
        }

        // Block if any installment in this batch has been paid
        boolean anyPaid = schedules.stream()
                .anyMatch(s -> s.getPaidAmount() != null && s.getPaidAmount() > 0);
        if (anyPaid) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot edit. Some members already paid.");
        }

        if (schedules.size() != request.getMembers().size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mismatch in members");
        }

        // Validate individual totals
        for (MemberScheduleEditDto dto : request.getMembers()) {
            double expectedTotal = wholeRound(dto.getPrincipal() + dto.getInterest());
            if (Math.abs(expectedTotal - dto.getTotal()) > 0.01) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Total mismatch for schedule " + dto.getLoanScheduleId());
            }
        }

        // Total obligation check per member across all installments
        List<LoanMember> loanMembers = loanMemberRepository.findByLoan_Id(request.getLoanId());
        for (LoanMember lm : loanMembers) {

            List<LoanSchedule> allSchedules =
                    loanScheduleRepository.findByLoanMember_Id(lm.getId());

            double originalTotal = wholeRound(
                    allSchedules.stream().mapToDouble(LoanSchedule::getTotal).sum()
            );

            double newTotal = 0;
            for (LoanSchedule s : allSchedules) {
                MemberScheduleEditDto edited = request.getMembers().stream()
                        .filter(x -> x.getLoanScheduleId().equals(s.getId()))
                        .findFirst()
                        .orElse(null);
                newTotal += (edited != null) ? edited.getTotal() : s.getTotal();
            }
            newTotal = wholeRound(newTotal);

            validateScheduleTotals(originalTotal, newTotal, lm.getMember().getName());
        }

        // Apply updates
        for (MemberScheduleEditDto dto : request.getMembers()) {
            LoanSchedule s = schedules.stream()
                    .filter(x -> x.getId().equals(dto.getLoanScheduleId()))
                    .findFirst()
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid schedule"));
            s.setPrincipal(dto.getPrincipal());
            s.setInterest(dto.getInterest());
            s.setTotal(dto.getTotal());
        }

        loanScheduleRepository.saveAll(schedules);
        return "Schedule updated successfully";
    }

    @Transactional
    public String editMemberSchedule(EditMemberScheduleRequest request, String username) {
        validateAdmin(username);

        List<LoanMember> loanMemberOpt = loanMemberRepository.findByLoan_IdAndMember_Id(request.getLoanId(), request.getMemberId())
                .map(List::of).orElse(List.of());

        if (loanMemberOpt.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Loan member record not found");
        }
        LoanMember lm = loanMemberOpt.get(0);

        List<LoanSchedule> schedules = loanScheduleRepository.findByLoanMember_IdOrderByInstallmentNo(lm.getId());
        if (schedules.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No schedules found for this member");
        }

        if (schedules.size() != request.getSchedules().size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mismatch in installment count");
        }

        // Total principal integrity check: Sum of NEW principals (including locked paid ones) 
        // must match the ORIGINAL LoanMember principal amount.
        double originalPrincipal = lm.getPrincipalAmount();
        double newPrincipalSum = wholeRound(
                request.getSchedules().stream().mapToDouble(MemberScheduleDto::getPrincipal).sum()
        );

        if (Math.abs(originalPrincipal - newPrincipalSum) > 0.01) {
            throw new ApiException(HttpStatus.BAD_REQUEST, 
                "Total principal mismatch. Original: " + originalPrincipal + ", New Sum: " + newPrincipalSum);
        }

        // Apply updates
        for (MemberScheduleDto dto : request.getSchedules()) {
            LoanSchedule s = schedules.stream()
                    .filter(x -> x.getId().equals(dto.getLoanScheduleId()))
                    .findFirst()
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid schedule ID: " + dto.getLoanScheduleId()));

            // Only allow editing if NOT PAID or PARTIAL
            if (s.getPaidAmount() != null && s.getPaidAmount() > 0) {
                // If any value differs from the DB, throw error
                boolean principalChanged = Math.abs(s.getPrincipal() - dto.getPrincipal()) > 0.01;
                boolean interestChanged = Math.abs(s.getInterest() - dto.getInterest()) > 0.01;
                boolean dueDateChanged = (dto.getDueDate() != null && !s.getDueDate().toString().equals(dto.getDueDate()));

                if (principalChanged || interestChanged || dueDateChanged) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot edit installment #" + s.getInstallmentNo() + " as it has payments.");
                }
                continue; // Skip update for this row
            }

            s.setPrincipal(wholeRound(dto.getPrincipal()));
            s.setInterest(wholeRound(dto.getInterest()));
            s.setTotal(wholeRound(dto.getPrincipal() + dto.getInterest()));
            
            if (dto.getDueDate() != null && !dto.getDueDate().isEmpty()) {
                s.setDueDate(LocalDate.parse(dto.getDueDate()));
            }
        }

        loanScheduleRepository.saveAll(schedules);
        return "Member schedule updated successfully";
    }

    // =========================================================
    //  SHARED ADD-MEMBER CONTEXT  (no DB writes)
    // =========================================================

    private record AddMemberContext(
            Loan loan,
            Member member,
            double principalAmount,
            int totalInstallments,
            int passedInstallments,
            int remaining,
            CollectionType collectionType,
            List<LoanSchedule> refSchedules
    ) {
        public double getExpectedTotalObligation() {
            if (loan.getTotalObligation() != null && loan.getTotalObligation() > 0) return loan.getTotalObligation();
            return refSchedules.stream().mapToDouble(LoanSchedule::getTotal).sum();
        }
        
        public double getExpectedTotalInterest() {
            if (loan.getTotalInterest() != null && loan.getTotalInterest() > 0) return loan.getTotalInterest();
            return refSchedules.stream().mapToDouble(LoanSchedule::getInterest).sum();
        }
        
        public Double getExpectedDueAmount() {
            if (loan.getDueAmount() != null && loan.getDueAmount() > 0) return loan.getDueAmount();
            if (!refSchedules.isEmpty()) return refSchedules.get(0).getTotal();
            return 0.0;
        }
    }

    private AddMemberContext calcAddMemberContext(Long loanId, Long memberId) {

        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Loan not found"));

        if (loan.getStatus() != LoanStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Loan must be ACTIVE");
        }

        Group group = loan.getGroup();
        if (group.getStatus() != GroupStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Group must be ACTIVE");
        }

        // Member must belong to the group and be ACTIVE
        Member member = memberGroupRepository
                .findByGroup_IdAndStatus(group.getId(), MemberStatus.ACTIVE)
                .stream()
                .map(MemberGroup::getMember)
                .filter(m -> m.getId().equals(memberId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
                        "Member not found in group or not ACTIVE"));

        // Member must NOT already be in this loan
        if (loanMemberRepository.findByLoan_IdAndMember_Id(loanId, memberId).isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Member already exists in this loan");
        }

        CollectionType cType = group.getCollectionType();
        int total = getTotalInstallments(cType, loan.getDurationWeeks());

        // Calculate how many installments have already passed
        // Installment 1 = startDate. If startDate is before today, it's passed.
        int passedInstallments = 0;
        LocalDate d = loan.getStartDate();
        LocalDate today = LocalDate.now();
        while (passedInstallments < total && d.isBefore(today)) {
            passedInstallments++;
            d = advanceDate(d, cType);
        }

        int remaining = total - passedInstallments;

        if (remaining <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Loan duration already completed — no installments remain");
        }

        // Use principalAmount from any existing LoanMember
        List<LoanMember> existingMembers = loanMemberRepository.findByLoan_Id(loanId);
        if (existingMembers.isEmpty()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "No existing members found for loan");
        }
        LoanMember firstMember = existingMembers.get(0);
        double principalAmount = firstMember.getPrincipalAmount();

        // Fetch the full schedule of the reference member
        List<LoanSchedule> refSchedules = loanScheduleRepository.findByLoanMember_IdOrderByInstallmentNo(firstMember.getId());

        return new AddMemberContext(loan, member, principalAmount, total, passedInstallments, remaining, cType, refSchedules);
    }

    /**
     * Builds schedule DTOs for a new member joining an active loan.
     * Rule §4 — Redistribute interest over REMAINING installments.
     *   Rate is WEEKLY: totalInterest = principal × (rate/100) × durationWeeks
     *   base per installment = totalInterest / totalInstallments
     *   missed = passedInstallments × base  →  redistributed over remaining
     *   Net: pEach = principal / remaining,  iEach = totalInterest / remaining
     *   (mathematically equivalent to the redistribute-missed approach)
     *
     * Rule §5 — Due dates must match the exact cycle of existing members.
     *   Start from loan.startDate, skip 'passed' intervals, then generate remaining.
     *   Next-due date for new member = startDate + (passed+1) × interval
     */
    private List<AddMemberScheduleDto> buildScheduleDtos(AddMemberContext ctx) {
        List<AddMemberScheduleDto> result = new ArrayList<>();
        List<LoanSchedule> ref = ctx.refSchedules();
        int passed = ctx.passedInstallments();
        int total = ctx.totalInstallments();

        // 1. Calculate missed principal and interest
        double missedP = 0;
        double missedI = 0;
        for (int i = 0; i < passed; i++) {
            missedP += ref.get(i).getPrincipal();
            missedI += ref.get(i).getInterest();
        }

        // 2. Generate remaining schedules
        for (int i = passed + 1; i <= total; i++) {
            LoanSchedule refRow = ref.get(i - 1);
            double pVal = wholeRound(refRow.getPrincipal());
            double iVal = wholeRound(refRow.getInterest());

            if (i == passed + 1) {
                // First installment of the new member takes all missed sums
                pVal = wholeRound(pVal + missedP);
                iVal = wholeRound(iVal + missedI);
            }

            result.add(new AddMemberScheduleDto(i, refRow.getDueDate(), pVal, iVal, wholeRound(pVal + iVal)));
        }

        return result;
    }

    // =========================================================
    //  HELPERS
    // =========================================================

    private int getTotalInstallments(CollectionType type, Integer weeks) {
        if (type == null || weeks == null) return 0;
        return switch (type) {
            case DAILY    -> weeks * 7;
            case WEEKLY   -> weeks;
            case BIWEEKLY -> weeks / 2;
            case MONTHLY  -> weeks / 4;
        };
    }

    private LocalDate advanceDate(LocalDate d, CollectionType t) {
        if (d == null || t == null) return d;
        return switch (t) {
            case DAILY    -> d.plusDays(1);
            case WEEKLY   -> d.plusDays(7);
            case BIWEEKLY -> d.plusDays(14);
            case MONTHLY  -> d.plusMonths(1);
        };
    }

    /**
     * Computes the end date as the due date of the last installment.
     * Installment 1 is due on startDate; each subsequent installment
     * advances by one collection interval.
     */
    private LocalDate calculateEndDate(LocalDate startDate, CollectionType type, int durationWeeks) {
        int total = getTotalInstallments(type, (Integer) durationWeeks);
        LocalDate date = startDate;
        for (int i = 1; i < total; i++) {
            date = advanceDate(date, type);
        }
        return date; 
    }

    private double wholeRound(double v) {
        return Math.round(v);
    }

    /** Rounds interest rate to 2 decimal places (preserves values like 0.91). */
    private double roundRate(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    /**
     * Asserts actualTotal == expectedTotal (within ₹0.01 tolerance).
     * Throws a descriptive error if the total would be reduced OR inflated.
     */
    private void validateScheduleTotals(double expectedTotal, double actualTotal, String memberName) {
        double diff = wholeRound(actualTotal - expectedTotal);
        if (Math.abs(diff) > 0.01) {
            if (diff < 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Total for member " + memberName + " is LESS by ₹" + Math.abs(diff));
            } else {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Total for member " + memberName + " is GREATER by ₹" + diff);
            }
        }
    }

    public boolean hasActiveLoan(Long memberId) {
        return loanMemberRepository.existsByMember_IdAndLoan_Status(memberId, LoanStatus.ACTIVE);
    }
}