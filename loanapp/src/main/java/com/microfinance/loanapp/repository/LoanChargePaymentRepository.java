package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.LoanChargePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LoanChargePaymentRepository extends JpaRepository<LoanChargePayment, Long> {
    boolean existsByLoan_IdAndMember_Id(Long loanId, Long memberId);
    java.util.Optional<LoanChargePayment> findByLoan_IdAndMember_Id(Long loanId, Long memberId);
    List<LoanChargePayment> findByLoan_Id(Long loanId);

    @Query("SELECT COALESCE(SUM(lcp.amountPaid), 0.0) FROM LoanChargePayment lcp " +
           "JOIN lcp.loan l " +
           "WHERE lcp.paymentDate BETWEEN :start AND :end " +
           "AND (:groupId IS NULL OR l.group.id = :groupId)")
    Double sumChargesCollectedBetween(@Param("start") LocalDate start, @Param("end") LocalDate end, @Param("groupId") Long groupId);

    @Query("SELECT COALESCE(SUM(lcp.totalAmount - lcp.amountPaid), 0.0) FROM LoanChargePayment lcp " +
           "JOIN lcp.loan l " +
           "WHERE lcp.paymentDate < :date " +
           "AND (:groupId IS NULL OR l.group.id = :groupId)")
    Double sumChargesPendingBefore(@Param("date") LocalDate date, @Param("groupId") Long groupId);

    @Query("SELECT COALESCE(SUM(lcp.amountPaid), 0.0) FROM LoanChargePayment lcp " +
           "JOIN lcp.loan l " +
           "WHERE lcp.paymentDate < :date " +
           "AND (:groupId IS NULL OR l.group.id = :groupId)")
    Double sumChargesCollectedBefore(@Param("date") LocalDate date, @Param("groupId") Long groupId);
}
