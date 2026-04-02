package com.microfinance.loanapp.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanPayloadDto {

    private Long groupId;
    private Double interestRate;
    private Integer durationMonths;
    private LocalDate startDate;
    private LocalDate endDate;
}