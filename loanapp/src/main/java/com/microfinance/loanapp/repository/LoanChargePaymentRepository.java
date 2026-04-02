package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.LoanChargePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanChargePaymentRepository extends JpaRepository<LoanChargePayment, Long> {
    boolean existsByLoan_IdAndMember_Id(Long loanId, Long memberId);
    List<LoanChargePayment> findByLoan_Id(Long loanId);
}
