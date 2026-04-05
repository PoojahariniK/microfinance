package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.LoanSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LoanScheduleRepository extends JpaRepository<LoanSchedule, Long> {
    List<LoanSchedule> findByLoanMember_Id(Long loanMemberId);
    List<LoanSchedule> findByLoanMember_IdOrderByInstallmentNo(Long loanMemberId);
    Optional<LoanSchedule> findByLoanMember_IdAndInstallmentNo(Long loanMemberId, Integer installmentNo);
    List<LoanSchedule> findByLoanMember_IdInAndInstallmentNo(List<Long> loanMemberIds, Integer installmentNo);
    Optional<LoanSchedule> findTopByLoanMember_Loan_IdOrderByInstallmentNoDesc(Long loanId);
    List<LoanSchedule> findByLoanMember_Loan_IdAndInstallmentNo(Long loanId, Integer installmentNo);
    List<LoanSchedule> findByLoanMember_IdAndInstallmentNoLessThan(Long loanMemberId, Integer installmentNo);
    List<LoanSchedule> findByLoanMember_Loan_Status(com.microfinance.loanapp.enums.LoanStatus status);

    @Query("SELECT COALESCE(SUM(ls.total - ls.paidAmount), 0.0) FROM LoanSchedule ls " +
           "JOIN ls.loanMember lm JOIN lm.loan l " +
           "WHERE ls.dueDate < :date " +
           "AND (:groupId IS NULL OR l.group.id = :groupId)")
    Double sumOutstandingBefore(@Param("date") LocalDate date, @Param("groupId") Long groupId);
}
