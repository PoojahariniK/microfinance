package com.microfinance.loanapp.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupReportDto {
    private String groupName;
    private Double totalLoan;
    private Double collection;
    private Double pending;
    private Integer memberCount;
}
