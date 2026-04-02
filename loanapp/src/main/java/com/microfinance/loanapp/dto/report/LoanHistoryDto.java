package com.microfinance.loanapp.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanHistoryDto {
    private Long loanId;
    private String status;
    private LocalDate startDate;
    private LocalDate endDate;
    private Double totalLoan;
    private Double collected;
    private Double pending;
}
