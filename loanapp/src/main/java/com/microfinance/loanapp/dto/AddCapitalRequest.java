package com.microfinance.loanapp.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddCapitalRequest {
    private Double amount;
    private String notes;
    private LocalDateTime entryDate;
}
