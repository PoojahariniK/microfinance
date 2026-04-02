package com.microfinance.loanapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.microfinance.loanapp.enums.LoanStatus;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EditLoanRequest {
    private LoanChargesDto charges;
    private LoanStatus status;
}
