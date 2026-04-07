package com.microfinance.loanapp.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanPayloadDto {

    private Long groupId;
    private Double interestRate;
    private Integer durationWeeks;
    private LocalDate startDate;
    private LocalDate endDate;
}