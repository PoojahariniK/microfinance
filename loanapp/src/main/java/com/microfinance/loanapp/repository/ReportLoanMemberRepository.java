package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.LoanMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReportLoanMemberRepository extends JpaRepository<LoanMember, Long> {

    // Summary: total disbursed = sum of all member principal amounts
    @Query("SELECT COALESCE(SUM(lm.principalAmount), 0) FROM LoanMember lm")
    Double sumTotalDisbursed();

    // Group report: total disbursed for a group
    @Query("SELECT COALESCE(SUM(lm.principalAmount), 0) FROM LoanMember lm WHERE lm.loan.group.id = :groupId")
    Double sumDisbursedByGroup(@Param("groupId") Long groupId);

    // Group report: distinct member count for a group (across all loans)
    @Query("SELECT COUNT(DISTINCT lm.member.id) FROM LoanMember lm WHERE lm.loan.group.id = :groupId")
    Integer countDistinctMembersByGroup(@Param("groupId") Long groupId);

    // Member report: all LoanMember entries for a member
    @Query("SELECT lm FROM LoanMember lm JOIN FETCH lm.loan l JOIN FETCH lm.member m WHERE lm.member.id = :memberId")
    List<LoanMember> findByMemberIdWithLoan(@Param("memberId") Long memberId);

    // Loan history: total disbursed per loan
    @Query("SELECT COALESCE(SUM(lm.principalAmount), 0) FROM LoanMember lm WHERE lm.loan.id = :loanId")
    Double sumDisbursedByLoan(@Param("loanId") Long loanId);

    // Period report: disbursed in joinedDate range
    @Query("SELECT COALESCE(SUM(lm.principalAmount), 0) FROM LoanMember lm " +
           "WHERE lm.joinedDate >= :from AND lm.joinedDate <= :to")
    Double sumDisbursedInPeriod(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
