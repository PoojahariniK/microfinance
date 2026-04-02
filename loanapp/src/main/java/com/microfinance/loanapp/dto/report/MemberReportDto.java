package com.microfinance.loanapp.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MemberReportDto {
    private String memberName;
    private Double totalLoan;
    private Double paid;
    private Double pending;
    private List<MemberLoanSummaryDto> loans;
}
