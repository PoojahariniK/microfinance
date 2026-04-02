package com.microfinance.loanapp.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PeriodReportDto {
    private String period;
    private Double totalCollection;
    private Double interest;
    private Double loanDisbursed;
    private Double pending;
}
