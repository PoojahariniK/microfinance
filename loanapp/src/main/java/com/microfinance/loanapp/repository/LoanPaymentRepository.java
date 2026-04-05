package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.LoanPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface LoanPaymentRepository extends JpaRepository<LoanPayment, Long> {

    List<LoanPayment> findByLoanSchedule_Id(Long loanScheduleId);

    @Query("SELECT COALESCE(SUM(lp.amount), 0.0) FROM LoanPayment lp " +
           "JOIN lp.loanSchedule ls JOIN ls.loanMember lm JOIN lm.loan l " +
           "WHERE lp.paymentDate < :date " +
           "AND (:groupId IS NULL OR l.group.id = :groupId)")
    Double sumCollectionBefore(@Param("date") LocalDate date, @Param("groupId") Long groupId);

    @Query("SELECT COALESCE(SUM(lp.amount), 0.0) FROM LoanPayment lp " +
           "JOIN lp.loanSchedule ls JOIN ls.loanMember lm JOIN lm.loan l " +
           "WHERE lp.paymentDate BETWEEN :start AND :end " +
           "AND (:groupId IS NULL OR l.group.id = :groupId)")
    Double sumCollectionBetween(@Param("start") LocalDate start, @Param("end") LocalDate end, @Param("groupId") Long groupId);

    @Query("SELECT COALESCE(SUM(ls.interest * (lp.amount / ls.total)), 0.0) FROM LoanPayment lp " +
           "JOIN lp.loanSchedule ls JOIN ls.loanMember lm JOIN lm.loan l " +
           "WHERE lp.paymentDate BETWEEN :start AND :end " +
           "AND (:groupId IS NULL OR l.group.id = :groupId)")
    Double sumInterestBetween(@Param("start") LocalDate start, @Param("end") LocalDate end, @Param("groupId") Long groupId);
}