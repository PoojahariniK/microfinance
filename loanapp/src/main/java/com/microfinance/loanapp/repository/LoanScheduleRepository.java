package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.LoanSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

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
    List<LoanSchedule> findByLoanMember_Loan_Status(com.microfinance.loanapp.enums.LoanStatus status);
}
