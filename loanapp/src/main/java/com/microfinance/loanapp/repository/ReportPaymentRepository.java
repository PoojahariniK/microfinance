package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.LoanPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReportPaymentRepository extends JpaRepository<LoanPayment, Long> {

    // Summary: total collection (all payments ever)
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM LoanPayment p")
    Double sumTotalCollection();

    // Period report: total payment in a date range
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM LoanPayment p " +
           "WHERE p.paymentDate >= :from AND p.paymentDate <= :to")
    Double sumCollectionInPeriod(@Param("from") LocalDate from, @Param("to") LocalDate to);

    // Group report: total payments for a group
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM LoanPayment p " +
           "WHERE p.loanSchedule.loanMember.loan.group.id = :groupId")
    Double sumCollectionByGroup(@Param("groupId") Long groupId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM LoanPayment p " +
           "WHERE (:groupId IS NULL OR p.loanSchedule.loanMember.loan.group.id = :groupId) " +
           "AND (:status IS NULL OR p.loanSchedule.loanMember.loan.status = :status)")
    Double sumCollectionWithFilters(@Param("groupId") Long groupId, @Param("status") com.microfinance.loanapp.enums.LoanStatus status);

    // Member report: payments grouped by loanId for a member
    @Query("SELECT p.loanSchedule.loanMember.loan.id, COALESCE(SUM(p.amount), 0) " +
           "FROM LoanPayment p " +
           "WHERE p.loanSchedule.loanMember.member.id = :memberId " +
           "GROUP BY p.loanSchedule.loanMember.loan.id")
    List<Object[]> sumCollectionGroupedByLoanForMember(@Param("memberId") Long memberId);

    // Loan history: total payments for a specific loan
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM LoanPayment p " +
           "WHERE p.loanSchedule.loanMember.loan.id = :loanId")
    Double sumCollectionByLoan(@Param("loanId") Long loanId);

    // Period report: loan disbursed (LoanMember.principalAmount) in a period join date range
    // This is on LoanMember, handled in service directly.

    @Query("SELECT COALESCE(SUM(p.amount), 0.0) FROM LoanPayment p WHERE p.paymentDate < :date AND (:groupId IS NULL OR p.loanSchedule.loanMember.loan.group.id = :groupId)")
    Double sumCollectedBefore(@Param("date") LocalDate date, @Param("groupId") Long groupId);

    @Query("SELECT COALESCE(SUM(p.amount), 0.0) FROM LoanPayment p WHERE p.paymentDate >= :startDate AND p.paymentDate <= :endDate AND (:groupId IS NULL OR p.loanSchedule.loanMember.loan.group.id = :groupId)")
    Double sumCollectedBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate, @Param("groupId") Long groupId);
}
