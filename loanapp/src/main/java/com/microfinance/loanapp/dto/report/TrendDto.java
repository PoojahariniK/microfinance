package com.microfinance.loanapp.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class TrendDto {
    private String period; // e.g. "Week 1", "Jan 2026"
    private double disbursed;
    private double totalCollection;
    private double interest;
    private double pending;
}
