package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.LoanSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReportScheduleRepository extends JpaRepository<LoanSchedule, Long> {

    // Summary: sum of (total - paidAmount) for all non-PAID schedules
    @Query("SELECT COALESCE(SUM(s.total - COALESCE(s.paidAmount, 0)), 0) FROM LoanSchedule s WHERE s.status <> 'PAID'")
    Double sumPendingAmount();

    // Summary: sum of interest where status = PAID
    @Query("SELECT COALESCE(SUM(s.interest), 0) FROM LoanSchedule s WHERE s.status = 'PAID'")
    Double sumInterestCollected();

    // Due-wise: schedules for a specific dueDate with members/groups fetched
    @Query("SELECT s FROM LoanSchedule s " +
           "JOIN FETCH s.loanMember lm " +
           "JOIN FETCH lm.member m " +
           "JOIN FETCH lm.loan l " +
           "JOIN FETCH l.group g " +
           "WHERE s.dueDate = :date")
    List<LoanSchedule> findByDueDateWithDetails(@Param("date") LocalDate date);

    // Pending report: schedules for a group that are not PAID
    @Query("SELECT s FROM LoanSchedule s " +
           "JOIN FETCH s.loanMember lm " +
           "JOIN FETCH lm.member m " +
           "JOIN FETCH lm.loan l " +
           "WHERE l.group.id = :groupId AND s.status <> 'PAID'")
    List<LoanSchedule> findUnpaidByGroupId(@Param("groupId") Long groupId);

    // Member report: all schedules for a member
    @Query("SELECT s FROM LoanSchedule s " +
           "JOIN FETCH s.loanMember lm " +
           "JOIN FETCH lm.loan l " +
           "WHERE lm.member.id = :memberId")
    List<LoanSchedule> findByMemberId(@Param("memberId") Long memberId);

    // Group report: all schedules for a group
    @Query("SELECT s FROM LoanSchedule s " +
           "JOIN FETCH s.loanMember lm " +
           "JOIN FETCH lm.loan l " +
           "WHERE l.group.id = :groupId")
    List<LoanSchedule> findByGroupId(@Param("groupId") Long groupId);

    // Loan history: all schedules for a loan
    @Query("SELECT s FROM LoanSchedule s WHERE s.loanMember.loan.id = :loanId")
    List<LoanSchedule> findByLoanId(@Param("loanId") Long loanId);

    // Period report: schedules paid (by paidDate) in a date range — interest from PAID schedules
    @Query("SELECT COALESCE(SUM(s.interest), 0) FROM LoanSchedule s " +
           "WHERE s.status = 'PAID' AND s.paidDate >= :from AND s.paidDate <= :to")
    Double sumInterestInPeriod(@Param("from") LocalDate from, @Param("to") LocalDate to);

    // Period report: pending = sum(total - paidAmount) for unpaid in period's due range
    @Query("SELECT COALESCE(SUM(s.total - COALESCE(s.paidAmount, 0)), 0) FROM LoanSchedule s " +
           "WHERE s.status <> 'PAID' AND s.dueDate >= :from AND s.dueDate <= :to")
    Double sumPendingInPeriod(@Param("from") LocalDate from, @Param("to") LocalDate to);

    // PnL: total interest income (all time, PAID only)
    @Query("SELECT COALESCE(SUM(s.interest), 0) FROM LoanSchedule s WHERE s.status = 'PAID'")
    Double sumTotalInterestIncome();

    // PnL: pending = sum(total - paidAmount) for unpaid
    @Query("SELECT COALESCE(SUM(s.total - COALESCE(s.paidAmount, 0)), 0) FROM LoanSchedule s WHERE s.status <> 'PAID'")
    Double sumTotalPending();
}
