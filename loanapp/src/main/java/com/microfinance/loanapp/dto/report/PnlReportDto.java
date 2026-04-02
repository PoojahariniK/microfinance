package com.microfinance.loanapp.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PnlReportDto {
    private Double interestIncome;
    private Double fineCollection;
    private Double insuranceFees;
    private Double totalRevenue;
    private Double totalLoanDisbursed;
    private Double totalCollection;
    private Double pendingAmount;
}
