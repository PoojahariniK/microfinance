package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.LoanMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanMemberRepository extends JpaRepository<LoanMember, Long> {
    List<LoanMember> findByLoan_Id(Long loanId);
    Optional<LoanMember> findByLoan_IdAndMember_Id(Long loanId, Long memberId);
    boolean existsByMember_IdAndLoan_Status(Long memberId, com.microfinance.loanapp.enums.LoanStatus status);
    List<LoanMember> findByMember_IdAndLoan_Status(Long memberId, com.microfinance.loanapp.enums.LoanStatus status);
    List<LoanMember> findByLoan_Group_IdAndMember_Id(Long groupId, Long memberId);
}
