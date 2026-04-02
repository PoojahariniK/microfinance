package com.microfinance.loanapp.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SummaryReportDto {
    private Double totalLoanDisbursed;
    private Double totalCollection;
    private Double totalInterestCollected;
    private Double pendingAmount;
    private Long totalLoans;
    private Long activeLoans;
    private Long totalGroups;
    private Long totalMembers;
}
