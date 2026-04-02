package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.enums.LoanStatus;
import com.microfinance.loanapp.model.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanRepository extends JpaRepository<Loan, Long> {
    Optional<Loan> findByGroup_IdAndStatus(Long groupId, LoanStatus status);
    List<Loan> findByGroup_Id(Long groupId);
}
