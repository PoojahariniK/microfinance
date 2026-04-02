package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.LoanCharges;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LoanChargesRepository extends JpaRepository<LoanCharges, Long> {
    Optional<LoanCharges> findByLoan_Id(Long loanId);
}
