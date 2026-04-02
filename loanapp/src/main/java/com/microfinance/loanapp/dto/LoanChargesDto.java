package com.microfinance.loanapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanChargesDto {
    private Double processingFee;
    private Double documentFee;
    private Double insuranceFee;
    private Double savingAmount;
}
