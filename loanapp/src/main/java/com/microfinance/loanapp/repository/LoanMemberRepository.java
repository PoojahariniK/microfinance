package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.LoanMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LoanMemberRepository extends JpaRepository<LoanMember, Long> {
    List<LoanMember> findByLoan_Id(Long loanId);
    Optional<LoanMember> findByLoan_IdAndMember_Id(Long loanId, Long memberId);
    boolean existsByMember_IdAndLoan_Status(Long memberId, com.microfinance.loanapp.enums.LoanStatus status);
    List<LoanMember> findByMember_IdAndLoan_Status(Long memberId, com.microfinance.loanapp.enums.LoanStatus status);
    List<LoanMember> findByLoan_Group_IdAndMember_Id(Long groupId, Long memberId);

    @Query("SELECT COALESCE(SUM(lm.principalAmount), 0.0) FROM LoanMember lm " +
           "JOIN lm.loan l " +
           "WHERE CAST(l.createdAt AS LocalDate) BETWEEN :start AND :end " +
           "AND (:groupId IS NULL OR l.group.id = :groupId)")
    Double sumDisbursedBetween(@Param("start") LocalDate start, @Param("end") LocalDate end, @Param("groupId") Long groupId);
}
