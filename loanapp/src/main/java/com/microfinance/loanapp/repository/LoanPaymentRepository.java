package com.microfinance.loanapp.repository;

import com.microfinance.loanapp.model.LoanPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoanPaymentRepository extends JpaRepository<LoanPayment, Long> {

    List<LoanPayment> findByLoanSchedule_Id(Long loanScheduleId);
}