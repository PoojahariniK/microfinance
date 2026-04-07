package com.microfinance.loanapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanInitRequest {
    private Long groupId;
    private Double totalLoanAmount;
    private Double interestRate;
    private Double dueAmount;
    private Integer durationWeeks;
    private LocalDate startDate;
    private List<Long> memberIds;
    private LoanChargesDto charges;
}
